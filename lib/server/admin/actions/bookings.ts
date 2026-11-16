"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/admin/action-state";
import { audit } from "@/lib/server/admin/audit";
import { ActionError, idOrThrow, run } from "@/lib/server/admin/actions/run";
import { getBookingWithPayments } from "@/lib/server/admin/queries";
import { cancelBooking, driverClashes, sendConfirmation, type CancelMode } from "@/lib/server/bookings/service";
import { amountPaid } from "@/lib/server/bookings/types";
import { isUuid } from "@/lib/server/core/validate";
import { db } from "@/lib/server/core/db";
import { phone as validPhone } from "@/lib/server/core/validate";
import { documentContext } from "@/lib/server/bookings/context";
import { sendEmail } from "@/lib/server/email/brevo";
import { driverAssignedEmail } from "@/lib/server/email/templates";

async function load(id: string) {
  const found = await getBookingWithPayments(id);
  if (!found) throw new ActionError("Booking not found.");
  return found;
}

const MODES: CancelMode[] = ["policy", "refund", "no_refund"];

export async function cancelBookingAdminAction(id: string, mode: string): Promise<ActionState> {
  return run("bookings.manage", async (admin) => {
    const bookingId = idOrThrow(id);
    if (!MODES.includes(mode as CancelMode)) throw new ActionError("Invalid cancellation option.");
    const { booking } = await load(bookingId);
    const { refunded } = await cancelBooking(booking, mode as CancelMode);
    await audit(admin, "booking.cancelled", { entity: "booking", entityId: bookingId, meta: { ref: booking.ref, mode, refunded } });
    revalidatePath("/admin", "layout");
    if (booking.source === "phone") {
      return { ok: true, message: "Phone booking cancelled. Money you collected by cash, UPI or bank is not refunded automatically: pay it back to the customer yourself." };
    }
    return { ok: true, message: refunded > 0 ? `Booking cancelled and ${refunded / 100} rupees refunded.` : "Booking cancelled. No refund was issued." };
  });
}

export async function markCompletedAction(id: string): Promise<ActionState> {
  return run("bookings.manage", async (admin) => {
    const bookingId = idOrThrow(id);
    const { data, error } = await db()
      .from("bookings")
      .update({ status: "completed" })
      .eq("id", bookingId)
      .eq("status", "confirmed")
      .select("ref");
    if (error) throw error;
    if (!data?.length) throw new ActionError("Only confirmed bookings can be marked completed.");
    await audit(admin, "booking.completed", { entity: "booking", entityId: bookingId, meta: { ref: data[0].ref } });
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Booking marked as completed." };
  });
}

export async function saveBookingNoteAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return run("bookings.manage", async (admin) => {
    const bookingId = idOrThrow(id);
    const note = String(formData.get("note") ?? "").replace(/\r\n/g, "\n").trim().slice(0, 1000);
    const { error } = await db().from("bookings").update({ admin_note: note }).eq("id", bookingId);
    if (error) throw error;
    await audit(admin, "booking.note_saved", { entity: "booking", entityId: bookingId });
    revalidatePath(`/admin/bookings/${bookingId}`);
    return { ok: true, message: "Note saved." };
  });
}

export async function resendConfirmationAction(id: string): Promise<ActionState> {
  return run("bookings.manage", async (admin) => {
    const bookingId = idOrThrow(id);
    const { booking } = await load(bookingId);
    if (booking.status !== "confirmed" && booking.status !== "completed") {
      throw new ActionError("Only confirmed bookings have a ticket to send.");
    }
    if (!(await sendConfirmation(booking))) {
      throw new ActionError("The email could not be sent. Check the Brevo settings and try again.");
    }
    await audit(admin, "booking.confirmation_resent", { entity: "booking", entityId: bookingId });
    return { ok: true, message: `Ticket and invoice emailed to ${booking.traveller_email}.` };
  });
}

/**
 * Saves who is driving and in which cab. All three (driver name, driver phone, cab number) are needed to assign;
 * leaving every field empty clears the assignment. A driver can be picked from the saved list (driverId) or typed in,
 * and a typed-in driver can be added to the saved list. The customer is emailed unless the owner unticks the box.
 */
export async function assignDriverAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return run("bookings.manage", async (admin) => {
    const bookingId = idOrThrow(id);
    const clean = (key: string, max: number) =>
      String(formData.get(key) ?? "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
    const name = clean("driverName", 80);
    const rawPhone = clean("driverPhone", 20);
    const cab = clean("cabNumber", 20).toUpperCase();
    const model = clean("cabModel", 60);
    const notify = formData.get("notify") === "on";
    const saveToList = formData.get("saveDriver") === "on";
    const pickedId = clean("driverId", 40);

    const { booking } = await load(bookingId);
    if (booking.status !== "confirmed") throw new ActionError("A driver can only be assigned to a confirmed booking.");

    const clearing = !name && !rawPhone && !cab && !model;
    if (!clearing) {
      if (name.length < 2) throw new ActionError("Enter the driver's name.");
      if (!cab) throw new ActionError("Enter the cab number.");
      if (!/^[A-Z0-9][A-Z0-9 -]{3,18}$/.test(cab)) throw new ActionError("Enter a valid cab number, for example MH12 AB 1234.");
    }
    const driverPhone = clearing ? "" : validPhone(rawPhone);

    // which saved driver this is: the one picked, if the details still match it; otherwise a new one when asked to save
    let driverId: string | null = null;
    if (!clearing) {
      if (pickedId && isUuid(pickedId)) {
        const { data: saved } = await db().from("drivers").select("id, name, phone, cab_number").eq("id", pickedId).maybeSingle();
        if (saved && saved.phone === driverPhone && saved.name.toLowerCase() === name.toLowerCase() && saved.cab_number.toUpperCase() === cab) driverId = saved.id;
      }
      if (!driverId) {
        const { data: byPhone } = await db().from("drivers").select("id").eq("phone", driverPhone).maybeSingle();
        if (byPhone) driverId = byPhone.id; // the same person is already in the list
        else if (saveToList) {
          const { data: created, error: createError } = await db().from("drivers").insert({ name, phone: driverPhone, cab_number: cab, cab_model: model }).select("id").single();
          if (createError) throw createError;
          driverId = created.id;
        }
      }
    }

    const { data, error } = await db()
      .from("bookings")
      .update({
        driver_name: clearing ? "" : name,
        driver_phone: driverPhone,
        cab_number: clearing ? "" : cab,
        cab_model: clearing ? "" : model,
        driver_assigned_at: clearing ? null : new Date().toISOString(),
        driver_id: clearing ? null : driverId,
      })
      .eq("id", bookingId)
      .eq("status", "confirmed")
      .select("driver_name, driver_phone, cab_number, cab_model");
    if (error) throw error;
    if (!data?.length) throw new ActionError("The booking changed. Please reload the page.");
    await audit(admin, clearing ? "booking.driver_cleared" : "booking.driver_assigned", { entity: "booking", entityId: bookingId, meta: { ref: booking.ref } });
    revalidatePath(`/admin/bookings/${bookingId}`);
    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath("/admin");
    revalidatePath("/admin/drivers");
    if (clearing) return { ok: true, message: "Driver and cab removed from this booking." };

    // a saved driver who is already on another trip at that time: tell the owner (the assignment is still kept)
    let warning = "";
    if (driverId) {
      const clashes = await driverClashes(driverId, { travel_date: booking.travel_date, travel_time: booking.travel_time, return_date: booking.return_date, hours: null, label: booking.trip_type === "hourly" ? booking.to_city : undefined, excludeBookingId: bookingId });
      if (clashes.length) warning = ` Warning: ${name} is also on ${clashes.map((c) => `${c.ref} (${c.when})`).join(", ")} around the same time.`;
    }

    if (!notify) return { ok: true, message: `Driver and cab saved. The customer was not emailed.${warning}` };
    if (/@phone-booking\.invalid$/i.test(booking.traveller_email)) {
      return { ok: true, message: `Driver and cab saved. This phone booking has no email address, so tell the customer by call or WhatsApp.${warning}` };
    }
    try {
      const ctx = await documentContext();
      await sendEmail({ to: booking.traveller_email, ...driverAssignedEmail(ctx.site, { ...booking, ...data[0] }) });
      return { ok: true, message: `Driver and cab saved, and emailed to ${booking.traveller_email}.${warning}` };
    } catch (emailError) {
      console.error("Driver email failed", booking.ref, emailError);
      return { ok: true, message: `Driver and cab saved, but the email could not be sent. Check the Brevo settings or tell the customer directly.${warning}` };
    }
  });
}

/**
 * The customer paid the rest of the fare in cash / UPI / bank (usually to the driver). Recorded as an offline payment so the
 * booking shows "Fully paid" and the dashboard's "balance still to collect" goes down.
 */
export async function recordBalanceAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return run("bookings.manage", async (admin) => {
    const bookingId = idOrThrow(id);
    const { booking, payments } = await load(bookingId);
    if (booking.status !== "confirmed" && booking.status !== "completed") throw new ActionError("Only a confirmed or completed booking can take a balance payment.");
    const outstanding = booking.total - amountPaid(payments);
    if (outstanding <= 0) throw new ActionError("This booking is already fully paid.");

    const raw = String(formData.get("amount") ?? "").replace(/[,\s₹]/g, "");
    if (!/^\d{1,7}(\.\d{1,2})?$/.test(raw)) throw new ActionError("Enter the amount received in rupees, for example 1298.50.");
    const amount = Math.round(Number(raw) * 100);
    if (amount <= 0) throw new ActionError("Enter an amount above zero.");
    if (amount > outstanding) throw new ActionError(`The balance is only ${(outstanding / 100).toLocaleString("en-IN")} rupees. Enter that amount or less.`);
    const method = String(formData.get("method") ?? "cash");
    const how = method === "upi" || method === "bank" ? method : "cash";

    const { error } = await db().from("payments").insert({
      booking_id: bookingId,
      kind: "balance",
      amount,
      // "offline_" marks money collected by hand (Razorpay is not involved)
      razorpay_order_id: `offline_${how}_${booking.ref}_${Math.floor(1000 + Math.random() * 9000)}`,
      status: "paid",
      paid_at: new Date().toISOString(),
    });
    if (error) throw error;
    await audit(admin, "booking.balance_recorded", { entity: "booking", entityId: bookingId, meta: { ref: booking.ref, amount, method: how } });
    revalidatePath(`/admin/bookings/${bookingId}`);
    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath("/admin", "layout");
    const left = outstanding - amount;
    return { ok: true, message: left > 0 ? `Recorded. ${(left / 100).toLocaleString("en-IN")} rupees are still to collect.` : "Recorded. The booking is now fully paid." };
  });
}
