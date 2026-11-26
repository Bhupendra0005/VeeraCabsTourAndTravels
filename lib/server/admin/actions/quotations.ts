"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/admin/action-state";
import { audit } from "@/lib/server/admin/audit";
import { ActionError, idOrThrow, run } from "@/lib/server/admin/actions/run";
import { getBookingSettings, getFleet } from "@/lib/server/cms/content";
import { email as validEmail, hhmm, isoDate, phone as validPhone } from "@/lib/server/core/validate";
import type { InvoiceItem } from "@/lib/server/invoices";
import { deleteQuotation, insertQuotation } from "@/lib/server/quotations";

// the PDF is one A4 page: more lines than this would not fit above the totals
const MAX_ITEMS = 6;
const MAX_PAISE = 90_00_000_00; // stays inside what a booking and the database can hold

const line = (value: unknown, max: number) =>
  String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

const text = (formData: FormData, key: string, max: number) => line(formData.get(key), max);

/** "1500" or "1,500.50" rupees -> paise. Empty is 0. */
function paise(raw: unknown, label: string): number {
  const value = String(raw ?? "").replace(/[,\s₹]/g, "");
  if (!value) return 0;
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(value)) throw new ActionError(`Enter the ${label} in rupees, for example 4500.`);
  return Math.round(Number(value) * 100);
}

function parseItems(raw: FormDataEntryValue | null): InvoiceItem[] {
  let list: unknown;
  try {
    list = JSON.parse(String(raw ?? "[]"));
  } catch {
    throw new ActionError("Invalid request.");
  }
  if (!Array.isArray(list)) throw new ActionError("Invalid request.");
  const items = list
    .slice(0, MAX_ITEMS + 1)
    .map((entry: Record<string, unknown>) => ({ title: line(entry?.title, 80), detail: line(entry?.detail, 120), rawAmount: entry?.amount }))
    // a completely empty row is just an unused line in the form
    .filter((entry) => entry.title || entry.detail || String(entry.rawAmount ?? "").trim());
  if (items.length === 0) throw new ActionError("Add at least one line with a description and an amount.");
  if (items.length > MAX_ITEMS) throw new ActionError(`A quotation can have at most ${MAX_ITEMS} lines.`);
  return items.map((entry, index) => {
    if (entry.title.length < 2) throw new ActionError(`Write a description for line ${index + 1}.`);
    const amount = paise(entry.rawAmount, `amount on line ${index + 1}`);
    if (amount <= 0) throw new ActionError(`Enter the amount for line ${index + 1}.`);
    return { title: entry.title, detail: entry.detail, amount };
  });
}

/** A price sent to a customer before the trip is final. Totals are computed here; GST is the booking GST, so a converted booking matches. */
export async function createQuotationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return run("bookings.manage", async (admin) => {
    const name = text(formData, "name", 80);
    if (name.length < 2) throw new ActionError("Enter the customer's name.");
    const rawEmail = text(formData, "email", 254);
    const tripType = text(formData, "tripType", 12) === "round_trip" ? "round_trip" : "one_way";
    const from = text(formData, "from", 60);
    const to = text(formData, "to", 60);
    if (from.length < 2 || to.length < 2) throw new ActionError("Enter where the trip starts and where it goes.");

    const travelDate = isoDate(text(formData, "travelDate", 10), "travel date");
    const rawTime = text(formData, "time", 5);
    const returnDate = tripType === "round_trip" ? isoDate(text(formData, "returnDate", 10), "return date") : null;
    if (returnDate && returnDate < travelDate) throw new ActionError("The return date must be on or after the travel date.");
    const quoteDate = isoDate(text(formData, "date", 10), "quotation date");
    const rawValid = text(formData, "validUntil", 10);
    const validUntil = rawValid ? isoDate(rawValid, "valid-until date") : null;
    if (validUntil && validUntil < quoteDate) throw new ActionError("\"Valid until\" must be on or after the quotation date.");

    const vehicle = (await getFleet()).find((item) => item.title === text(formData, "vehicle", 40));
    if (!vehicle) throw new ActionError("Choose one of your vehicles.");
    const passengers = Number(text(formData, "passengers", 3));
    if (!Number.isInteger(passengers) || passengers < 1 || passengers > vehicle.capacity) {
      throw new ActionError(`${vehicle.title} seats 1 to ${vehicle.capacity} passengers.`);
    }

    const items = parseItems(formData.get("items"));
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const discount = paise(formData.get("discount"), "discount");
    if (discount >= subtotal) throw new ActionError("The discount must be less than the total of the lines.");
    const gstPercent = (await getBookingSettings()).gstPercent;
    const taxable = subtotal - discount;
    const gst = Math.round((taxable * gstPercent) / 100);
    const total = taxable + gst;
    if (total > MAX_PAISE) throw new ActionError("The quotation total is too large.");

    const created = await insertQuotation({
      quote_date: quoteDate,
      valid_until: validUntil,
      customer_name: name,
      customer_phone: validPhone(text(formData, "phone", 20)),
      customer_email: rawEmail ? validEmail(rawEmail) : "",
      trip_type: tripType,
      from_city: from,
      to_city: to,
      pickup_address: text(formData, "pickupAddress", 200),
      travel_date: travelDate,
      travel_time: rawTime ? hhmm(rawTime) : "",
      return_date: returnDate,
      passengers,
      vehicle_type: vehicle.title,
      items,
      subtotal,
      discount,
      gst_percent: gstPercent,
      gst,
      total,
      note: text(formData, "note", 200),
      created_by: admin.email,
    });
    await audit(admin, "quotation.created", { entity: "quotation", entityId: created.id, meta: { quote_no: created.quote_no, total } });
    revalidatePath("/admin/invoices/quotations");
    redirect(`/admin/invoices/quotations?created=${created.id}`);
  });
}

/** Removes a quotation. A booking made from it stays. */
export async function deleteQuotationAction(id: string): Promise<ActionState> {
  return run("bookings.delete", async (admin) => {
    const clean = idOrThrow(id);
    if (!(await deleteQuotation(clean))) throw new ActionError("This quotation no longer exists. Refresh the page.");
    await audit(admin, "quotation.deleted", { entity: "quotation", entityId: clean });
    revalidatePath("/admin/invoices/quotations");
    return { ok: true, message: "Quotation deleted." };
  });
}
