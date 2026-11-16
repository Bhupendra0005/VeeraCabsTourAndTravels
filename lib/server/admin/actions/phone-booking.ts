"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/admin/action-state";
import { audit } from "@/lib/server/admin/audit";
import { ActionError, run } from "@/lib/server/admin/actions/run";
import { createPhoneBooking, type PhoneBookingInput } from "@/lib/server/bookings/service";
import { email as validEmail, hhmm, isoDate, phone as validPhone } from "@/lib/server/core/validate";

const text = (formData: FormData, key: string, max: number) =>
  String(formData.get(key) ?? "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

/** "1500" or "1,500.50" rupees -> paise. Empty is 0. */
function rupees(formData: FormData, key: string, label: string): number {
  const raw = String(formData.get(key) ?? "").replace(/[,\s₹]/g, "");
  if (!raw) return 0;
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(raw)) throw new ActionError(`Enter the ${label} in rupees, for example 4500.`);
  return Math.round(Number(raw) * 100);
}

function whole(formData: FormData, key: string, min: number, max: number, label: string): number {
  const n = Number(String(formData.get(key) ?? "").trim());
  if (!Number.isInteger(n) || n < min || n > max) throw new ActionError(`Enter ${label} between ${min} and ${max}.`);
  return n;
}

/**
 * The owner enters a booking taken over a call or WhatsApp. It is confirmed straight away; money already collected
 * by hand (cash / UPI / bank) is recorded as an offline payment. Needs the same permission as managing bookings.
 */
export async function createPhoneBookingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return run("bookings.manage", async (admin) => {
    const tripType = text(formData, "tripType", 12) === "round_trip" ? "round_trip" : "one_way";
    const from = text(formData, "from", 60);
    const to = text(formData, "to", 60);
    if (from.length < 2 || to.length < 2) throw new ActionError("Enter where the trip starts and where it goes.");
    const pickupAddress = text(formData, "pickupAddress", 200);
    if (pickupAddress.length < 3) throw new ActionError("Enter the pickup address.");
    const name = text(formData, "name", 80);
    if (name.length < 2) throw new ActionError("Enter the customer's name.");
    const rawEmail = text(formData, "email", 254);
    const method = text(formData, "method", 8);

    const input: PhoneBookingInput = {
      tripType,
      from,
      to,
      date: isoDate(text(formData, "date", 10), "date"),
      time: hhmm(text(formData, "time", 5)),
      returnDate: tripType === "round_trip" ? isoDate(text(formData, "returnDate", 10), "return date") : null,
      passengers: whole(formData, "passengers", 1, 60, "the number of passengers"),
      bags: whole(formData, "bags", 0, 40, "the number of bags"),
      vehicle: text(formData, "vehicle", 40),
      pickupAddress,
      dropAddress: text(formData, "dropAddress", 200),
      name,
      phone: validPhone(text(formData, "phone", 20)),
      email: rawEmail ? validEmail(rawEmail) : "",
      customFare: rupees(formData, "fare", "fare"),
      received: rupees(formData, "received", "amount received"),
      method: method === "upi" || method === "bank" ? method : "cash",
      note: String(formData.get("note") ?? "").replace(/\r\n/g, "\n").trim().slice(0, 1000),
      allowFull: formData.get("allowFull") === "on",
      sendEmail: formData.get("sendEmail") === "on",
    };

    const created = await createPhoneBooking(input);
    await audit(admin, "booking.phone_created", { entity: "booking", entityId: created.id, meta: { ref: created.ref, received: input.received } });
    revalidatePath("/admin", "layout");
    redirect(`/admin/bookings/${created.id}?created=1${created.emailed ? "&emailed=1" : ""}`);
  });
}
