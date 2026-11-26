import "server-only";
import { db } from "@/lib/server/core/db";

/**
 * One line on a hand-made invoice. `amount` is in paise. A statement line (toll, parking and tax terms) has amount 0
 * and `amountText`, printed in place of the money.
 */
export type InvoiceItem = { title: string; detail: string; amount: number; amountText?: string };

export type PaymentMethod = "" | "cash" | "upi" | "bank" | "card" | "online";

export const PAYMENT_METHOD_LABEL: Record<Exclude<PaymentMethod, "">, string> = {
  cash: "Cash",
  upi: "UPI",
  bank: "Bank transfer",
  card: "Card",
  online: "Online",
};

/** A row of `manual_invoices` (migration 013). Money is in paise. */
export type ManualInvoiceRow = {
  id: string;
  invoice_no: string;
  invoice_date: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  gst_company: string;
  gstin: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  gst_percent: number;
  gst: number;
  total: number;
  amount_paid: number;
  payment_method: PaymentMethod;
  note: string;
  created_by: string;
  created_at: string;
};

export type NewManualInvoice = Omit<ManualInvoiceRow, "id" | "invoice_no" | "created_at">;

const COLUMNS =
  "id, invoice_no, invoice_date, customer_name, customer_phone, customer_email, customer_address, gst_company, gstin, items, subtotal, discount, gst_percent, gst, total, amount_paid, payment_method, note, created_by, created_at";

const clean = (row: Record<string, unknown>): ManualInvoiceRow => ({ ...(row as ManualInvoiceRow), gst_percent: Number(row.gst_percent) });

export async function listManualInvoices(): Promise<ManualInvoiceRow[]> {
  const { data, error } = await db().from("manual_invoices").select(COLUMNS).order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  return (data ?? []).map(clean);
}

export async function getManualInvoice(id: string): Promise<ManualInvoiceRow | null> {
  const { data, error } = await db().from("manual_invoices").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? clean(data) : null;
}

export async function insertManualInvoice(input: NewManualInvoice): Promise<{ id: string; invoice_no: string }> {
  const { data, error } = await db().from("manual_invoices").insert(input).select("id, invoice_no").single();
  if (error) throw error;
  return data as { id: string; invoice_no: string };
}

export async function deleteManualInvoice(id: string): Promise<boolean> {
  const { data, error } = await db().from("manual_invoices").delete().eq("id", id).select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}
