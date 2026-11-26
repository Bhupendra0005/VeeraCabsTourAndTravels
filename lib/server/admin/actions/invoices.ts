"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/admin/action-state";
import { audit } from "@/lib/server/admin/audit";
import { ActionError, idOrThrow, run } from "@/lib/server/admin/actions/run";
import { chargeLine, type ChargeTerm } from "@/lib/booking/charges";
import { email as validEmail, isoDate, phone as validPhone } from "@/lib/server/core/validate";
import { deleteManualInvoice, insertManualInvoice, type InvoiceItem, type PaymentMethod } from "@/lib/server/invoices";

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const METHODS: PaymentMethod[] = ["", "cash", "upi", "bank", "card", "online"];
// the invoice is one A4 page: more lines than this would not fit above the totals
const MAX_ITEMS = 6;
const MAX_PAISE = 1_00_00_000_00; // ₹1 crore per invoice

const line = (value: unknown, max: number) =>
  String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

const text = (formData: FormData, key: string, max: number) => line(formData.get(key), max);

/** "1500" or "1,500.50" rupees -> paise. Empty is 0. */
function paise(raw: unknown, label: string): number {
  const value = String(raw ?? "").replace(/[,\s₹]/g, "");
  if (!value) return 0;
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(value)) throw new ActionError(`Enter the ${label} in rupees, for example 4500.`);
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
  if (items.length > MAX_ITEMS) throw new ActionError(`An invoice can have at most ${MAX_ITEMS} lines.`);
  return items.map((entry, index) => {
    if (entry.title.length < 2) throw new ActionError(`Write a description for line ${index + 1}.`);
    const amount = paise(entry.rawAmount, `amount on line ${index + 1}`);
    if (amount <= 0) throw new ActionError(`Enter the amount for line ${index + 1}.`);
    return { title: entry.title, detail: entry.detail, amount };
  });
}

/** "included", "extra" or "" (not mentioned) from the form; anything else is refused. */
function term(formData: FormData, key: string): ChargeTerm {
  const value = text(formData, key, 10);
  if (value !== "" && value !== "included" && value !== "extra") throw new ActionError("Invalid request.");
  return value;
}

/**
 * The owner types an invoice by hand (a trip paid outside the website, a corporate bill, a tour package).
 * Every value is checked here again and the totals are computed on the server; the form's own figures are only a preview.
 */
export async function createManualInvoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return run("bookings.manage", async (admin) => {
    const customerName = text(formData, "name", 80);
    if (customerName.length < 2) throw new ActionError("Enter the customer's name.");
    const rawPhone = text(formData, "phone", 20);
    const rawEmail = text(formData, "email", 254);
    const gstin = text(formData, "gstin", 15).toUpperCase();
    if (gstin && !GSTIN.test(gstin)) throw new ActionError("Enter a valid 15-character GSTIN, or leave it empty.");
    const gstCompany = text(formData, "gstCompany", 120);
    if (gstin && gstCompany.length < 2) throw new ActionError("Enter the company name for the GSTIN.");

    const items = parseItems(formData.get("items"));
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const discount = paise(formData.get("discount"), "discount");
    if (discount >= subtotal) throw new ActionError("The discount must be less than the total of the lines.");

    const rawGst = text(formData, "gstPercent", 5) || "0";
    const gstPercent = Number(rawGst);
    if (!/^\d{1,2}(\.\d{1,2})?$/.test(rawGst) || gstPercent > 28) throw new ActionError("GST must be between 0 and 28 percent.");
    const taxable = subtotal - discount;
    const gst = Math.round((taxable * gstPercent) / 100);
    const total = taxable + gst;
    if (total > MAX_PAISE) throw new ActionError("The invoice total is too large.");

    const amountPaid = paise(formData.get("paid"), "amount paid");
    if (amountPaid > total) throw new ActionError("The amount paid cannot be more than the invoice total.");
    const method = text(formData, "method", 8) as PaymentMethod;
    if (!METHODS.includes(method)) throw new ActionError("Choose how it was paid.");

    // toll, parking and tax: written on the invoice as its own line, with no amount of its own
    const terms = chargeLine({ toll: term(formData, "tollTerm"), tax: term(formData, "taxTerm"), parking: term(formData, "parkingTerm") });

    const created = await insertManualInvoice({
      invoice_date: isoDate(text(formData, "date", 10), "invoice date"),
      customer_name: customerName,
      customer_phone: rawPhone ? validPhone(rawPhone) : "",
      customer_email: rawEmail ? validEmail(rawEmail) : "",
      customer_address: text(formData, "address", 160),
      gst_company: gstin ? gstCompany : "",
      gstin,
      items: terms ? [...items, { title: "Toll, parking & tax", detail: terms.detail, amount: 0, amountText: terms.label }] : items,
      subtotal,
      discount,
      gst_percent: gstPercent,
      gst,
      total,
      amount_paid: amountPaid,
      payment_method: amountPaid > 0 ? method : "",
      note: text(formData, "note", 200),
      created_by: admin.email,
    });
    await audit(admin, "invoice.manual_created", { entity: "invoice", entityId: created.id, meta: { invoice_no: created.invoice_no, total } });
    revalidatePath("/admin/invoices");
    redirect(`/admin/invoices?created=${created.id}`);
  });
}

/** Removes a hand-made invoice. Its number is not reused. Owner only, like deleting a booking. */
export async function deleteManualInvoiceAction(id: string): Promise<ActionState> {
  return run("bookings.delete", async (admin) => {
    const clean = idOrThrow(id);
    if (!(await deleteManualInvoice(clean))) throw new ActionError("This invoice no longer exists. Refresh the page.");
    await audit(admin, "invoice.manual_deleted", { entity: "invoice", entityId: clean });
    revalidatePath("/admin/invoices");
    return { ok: true, message: "Invoice deleted." };
  });
}
