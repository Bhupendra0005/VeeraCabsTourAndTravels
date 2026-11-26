import "server-only";
import { db } from "@/lib/server/core/db";
import type { InvoiceItem } from "@/lib/server/invoices";

/** A row of `quotations` (migration 016). Money is in paise. */
export type QuotationRow = {
  id: string;
  quote_no: string;
  quote_date: string;
  valid_until: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  trip_type: "one_way" | "round_trip";
  from_city: string;
  to_city: string;
  pickup_address: string;
  travel_date: string;
  travel_time: string;
  return_date: string | null;
  passengers: number;
  vehicle_type: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  gst_percent: number;
  gst: number;
  total: number;
  note: string;
  booking_id: string | null;
  created_by: string;
  created_at: string;
};

export type NewQuotation = Omit<QuotationRow, "id" | "quote_no" | "booking_id" | "created_at">;

const COLUMNS =
  "id, quote_no, quote_date, valid_until, customer_name, customer_phone, customer_email, trip_type, from_city, to_city, pickup_address, travel_date, travel_time, return_date, passengers, vehicle_type, items, subtotal, discount, gst_percent, gst, total, note, booking_id, created_by, created_at";

const clean = (row: Record<string, unknown>): QuotationRow => ({ ...(row as QuotationRow), gst_percent: Number(row.gst_percent) });

export async function listQuotations(): Promise<QuotationRow[]> {
  const { data, error } = await db().from("quotations").select(COLUMNS).order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  return (data ?? []).map(clean);
}

export async function getQuotation(id: string): Promise<QuotationRow | null> {
  const { data, error } = await db().from("quotations").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? clean(data) : null;
}

export async function insertQuotation(input: NewQuotation): Promise<{ id: string; quote_no: string }> {
  const { data, error } = await db().from("quotations").insert(input).select("id, quote_no").single();
  if (error) throw error;
  return data as { id: string; quote_no: string };
}

/** Records the booking a quotation became. Only an unconverted quotation is changed. */
export async function markQuotationConverted(id: string, bookingId: string): Promise<void> {
  const { error } = await db().from("quotations").update({ booking_id: bookingId }).eq("id", id).is("booking_id", null);
  if (error) throw error;
}

export async function deleteQuotation(id: string): Promise<boolean> {
  const { data, error } = await db().from("quotations").delete().eq("id", id).select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}
