"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/admin/action-state";
import { audit } from "@/lib/server/admin/audit";
import { ActionError, idOrThrow, run } from "@/lib/server/admin/actions/run";
import { getBookingWithPayments } from "@/lib/server/admin/queries";
import { cancelBooking, sendConfirmation, type CancelMode } from "@/lib/server/bookings/service";
import { db } from "@/lib/server/core/db";

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
