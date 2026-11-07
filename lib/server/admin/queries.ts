import "server-only";
import { db } from "@/lib/server/core/db";
import {
  ADMIN_BOOKING_COLUMNS,
  BOOKING_COLUMNS,
  PAYMENT_COLUMNS,
  type BookingRow,
  type PaymentRow,
} from "@/lib/server/bookings/types";

export const PAGE_SIZE = 25;

/** Today's date in India (YYYY-MM-DD); trips and reports are by IST day. */
export function todayIst(offsetDays = 0): string {
  return new Date(Date.now() + 5.5 * 3_600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

/** True while a timestamp is still in the future (kept out of components so they stay pure). */
export function isFuture(iso: string | null): boolean {
  return !!iso && new Date(iso).getTime() > Date.now();
}

/** Strips characters that have meaning inside a PostgREST filter, so a search box cannot alter the query. */
export function cleanSearch(value: string | undefined): string {
  return (value ?? "").replace(/[^\p{L}\p{N}@.\-+ ]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export function pageParam(value: string | undefined): number {
  const n = Number.parseInt(value ?? "1", 10);
  return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : 1;
}

/* ------------------------------ dashboard ------------------------------ */

type Paid = { amount: number; status: string };

export async function getDashboard() {
  const today = todayIst();
  const weekEnd = todayIst(7);
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const dayStart = new Date(`${today}T00:00:00+05:30`).toISOString();

  const countBy = async (status?: string) => {
    let query = db().from("bookings").select("id", { count: "exact", head: true });
    if (status) query = query.eq("status", status);
    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  };

  const [total, confirmed, pending, cancelled, completed, todaysNew, upcoming, recent, paidMonth, exposure] = await Promise.all([
    countBy(),
    countBy("confirmed"),
    countBy("pending_payment"),
    countBy("cancelled"),
    countBy("completed"),
    db().from("bookings").select("id", { count: "exact", head: true }).gte("created_at", dayStart),
    db()
      .from("bookings")
      .select(BOOKING_COLUMNS)
      .eq("status", "confirmed")
      .gte("travel_date", today)
      .lte("travel_date", weekEnd)
      .order("travel_date")
      .order("travel_time")
      .limit(10),
    db().from("bookings").select(BOOKING_COLUMNS).order("created_at", { ascending: false }).limit(8),
    db().from("payments").select("amount").eq("status", "paid").gte("paid_at", monthAgo).limit(5000),
    db()
      .from("bookings")
      .select("total, payments(amount, status)")
      .eq("status", "confirmed")
      .gte("travel_date", today)
      .limit(2000),
  ]);

  for (const result of [todaysNew, upcoming, recent, paidMonth, exposure]) {
    if (result.error) throw result.error;
  }

  const revenue30 = (paidMonth.data ?? []).reduce((sum, p) => sum + (p.amount as number), 0);
  const balanceDue = (exposure.data ?? []).reduce((sum, b) => {
    const paid = ((b.payments ?? []) as Paid[]).filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
    return sum + Math.max(0, (b.total as number) - paid);
  }, 0);

  return {
    total,
    confirmed,
    pending,
    cancelled,
    completed,
    todaysNew: todaysNew.count ?? 0,
    upcoming: (upcoming.data ?? []) as unknown as BookingRow[],
    recent: (recent.data ?? []) as unknown as BookingRow[],
    revenue30,
    balanceDue,
  };
}

/* ------------------------------- bookings ------------------------------- */

export type BookingFilters = { q?: string; status?: string; from?: string; to?: string; page: number };

const STATUSES = ["pending_payment", "confirmed", "cancelled", "completed", "payment_failed"];

export async function listBookings(filters: BookingFilters) {
  let query = db().from("bookings").select(BOOKING_COLUMNS, { count: "exact" });

  const q = cleanSearch(filters.q);
  if (q) {
    query = query.or(
      ["ref", "traveller_name", "traveller_phone", "traveller_email", "from_city", "to_city"].map((c) => `${c}.ilike.%${q}%`).join(","),
    );
  }
  if (filters.status && STATUSES.includes(filters.status)) query = query.eq("status", filters.status);
  if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)) query = query.gte("travel_date", filters.from);
  if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)) query = query.lte("travel_date", filters.to);

  const start = (filters.page - 1) * PAGE_SIZE;
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(start, start + PAGE_SIZE - 1);
  if (error) throw error;
  return { rows: (data ?? []) as unknown as BookingRow[], total: count ?? 0 };
}

export async function getBookingWithPayments(id: string) {
  const { data: booking, error } = await db().from("bookings").select(ADMIN_BOOKING_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!booking) return null;
  const { data: payments, error: payError } = await db()
    .from("payments")
    .select(PAYMENT_COLUMNS)
    .eq("booking_id", id)
    .order("created_at");
  if (payError) throw payError;
  return { booking: booking as unknown as BookingRow, payments: (payments ?? []) as unknown as PaymentRow[] };
}

/* ------------------------------- payments ------------------------------- */

export async function listPayments(filters: { status?: string; kind?: string; page: number }) {
  let query = db()
    .from("payments")
    .select(`${PAYMENT_COLUMNS}, bookings(ref, traveller_name)`, { count: "exact" });
  if (filters.status && ["created", "paid", "failed", "refunded"].includes(filters.status)) query = query.eq("status", filters.status);
  if (filters.kind && ["advance", "full", "balance"].includes(filters.kind)) query = query.eq("kind", filters.kind);
  const start = (filters.page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.order("created_at", { ascending: false }).range(start, start + PAGE_SIZE - 1);
  if (error) throw error;
  return {
    rows: (data ?? []) as unknown as (PaymentRow & { bookings: { ref: string; traveller_name: string } | null })[],
    total: count ?? 0,
  };
}

/** Amounts (paise) and counts per payment status, for the cards on the Payments page. */
export async function getPaymentTotals() {
  const { data, error } = await db().from("payments").select("amount, status").limit(20000);
  if (error) throw error;
  const sum = { all: 0, paid: 0, created: 0, refunded: 0 };
  const count = { all: 0, paid: 0, created: 0, refunded: 0 };
  for (const p of (data ?? []) as { amount: number; status: string }[]) {
    sum.all += p.amount;
    count.all += 1;
    if (p.status === "paid" || p.status === "created" || p.status === "refunded") {
      sum[p.status] += p.amount;
      count[p.status] += 1;
    }
  }
  return { sum, count };
}

/* ------------------------------- customers ------------------------------- */

export type CustomerSummary = { id: string; email: string; created_at: string; bookings: number; spent: number };

export async function listCustomers(filters: { q?: string; page: number }) {
  let query = db().from("customers").select("id, email, created_at", { count: "exact" });
  const q = cleanSearch(filters.q);
  if (q) query = query.ilike("email", `%${q}%`);
  const start = (filters.page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.order("created_at", { ascending: false }).range(start, start + PAGE_SIZE - 1);
  if (error) throw error;

  const ids = (data ?? []).map((c) => c.id as string);
  const stats = new Map<string, { bookings: number; spent: number }>();
  if (ids.length) {
    const { data: bookings, error: bError } = await db()
      .from("bookings")
      .select("customer_id, status, payments(amount, status)")
      .in("customer_id", ids);
    if (bError) throw bError;
    for (const b of bookings ?? []) {
      const entry = stats.get(b.customer_id as string) ?? { bookings: 0, spent: 0 };
      if (b.status !== "payment_failed") entry.bookings += 1;
      entry.spent += ((b.payments ?? []) as Paid[]).filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
      stats.set(b.customer_id as string, entry);
    }
  }
  const rows: CustomerSummary[] = (data ?? []).map((c) => ({
    id: c.id as string,
    email: c.email as string,
    created_at: c.created_at as string,
    bookings: stats.get(c.id as string)?.bookings ?? 0,
    spent: stats.get(c.id as string)?.spent ?? 0,
  }));
  return { rows, total: count ?? 0 };
}

/** Numbers for the cards on the Customers page. */
export async function getCustomerTotals() {
  const monthStart = new Date(`${todayIst().slice(0, 7)}-01T00:00:00+05:30`).toISOString();
  const [total, joined, withBookings, paid] = await Promise.all([
    db().from("customers").select("id", { count: "exact", head: true }),
    db().from("customers").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
    db().from("bookings").select("customer_id").neq("status", "payment_failed").limit(20000),
    db().from("payments").select("amount").eq("status", "paid").limit(20000),
  ]);
  for (const result of [total, joined, withBookings, paid]) if (result.error) throw result.error;
  return {
    total: total.count ?? 0,
    joinedThisMonth: joined.count ?? 0,
    withBookings: new Set((withBookings.data ?? []).map((b) => b.customer_id as string)).size,
    spent: (paid.data ?? []).reduce((sum, p) => sum + (p.amount as number), 0),
  };
}

export async function getCustomerWithBookings(id: string) {
  const { data: customer, error } = await db().from("customers").select("id, email, created_at").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!customer) return null;
  const { data: bookings, error: bError } = await db()
    .from("bookings")
    .select(BOOKING_COLUMNS)
    .eq("customer_id", id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (bError) throw bError;
  const rows = (bookings ?? []) as unknown as BookingRow[];

  // what this customer has actually paid (refunded money is not counted)
  let spent = 0;
  if (rows.length) {
    const { data: paid, error: pError } = await db()
      .from("payments")
      .select("amount")
      .in("booking_id", rows.map((b) => b.id))
      .eq("status", "paid");
    if (pError) throw pError;
    spent = (paid ?? []).reduce((sum, p) => sum + (p.amount as number), 0);
  }
  return { customer, bookings: rows, spent };
}
