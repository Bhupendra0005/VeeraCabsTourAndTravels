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

  const [total, confirmed, pending, cancelled, completed, todaysNew, upcoming, recent, paidMonth, exposure, needDriver] = await Promise.all([
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
    // money still to collect: confirmed AND completed trips, whatever their date (a finished trip that was never settled still counts)
    db()
      .from("bookings")
      .select("total, payments(amount, status)")
      .in("status", ["confirmed", "completed"])
      .limit(5000),
    // confirmed trips in the next 7 days that nobody has been assigned to yet
    db()
      .from("bookings")
      .select(BOOKING_COLUMNS)
      .eq("status", "confirmed")
      .eq("driver_name", "")
      .gte("travel_date", today)
      .lte("travel_date", weekEnd)
      .order("travel_date")
      .order("travel_time")
      .limit(30),
  ]);

  for (const result of [todaysNew, upcoming, recent, paidMonth, exposure, needDriver]) {
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
    needDriver: (needDriver.data ?? []) as unknown as BookingRow[],
  };
}

/* ------------------------------- bookings ------------------------------- */

/** Quick views on the Bookings page (the chips above the list). */
export const BOOKING_VIEWS = ["upcoming", "today", "tomorrow", "no_driver", "booked_today", "past", "unpaid", "cancelled"] as const;
export type BookingView = (typeof BOOKING_VIEWS)[number];
export const isBookingView = (value: string | undefined): value is BookingView => BOOKING_VIEWS.includes(value as BookingView);

export type BookingFilters = { q?: string; status?: string; from?: string; to?: string; view?: BookingView; trip?: string; source?: string; page: number };

const STATUSES = ["pending_payment", "confirmed", "cancelled", "completed", "payment_failed"];
const TRIPS = ["one_way", "round_trip", "airport_pickup", "airport_drop", "hourly"];

/** The filters a view uses. Kept loose on purpose: Supabase's own builder types are too deep to check generically. */
type Narrowable = {
  eq(column: string, value: string): Narrowable;
  in(column: string, values: string[]): Narrowable;
  gte(column: string, value: string): Narrowable;
  lt(column: string, value: string): Narrowable;
};

/** Narrows a bookings query to a view (the same for the list and for the counts on the chips). */
function narrowToView<Q>(builder: Q, view: BookingView): Q {
  return narrow(builder as unknown as Narrowable, view) as unknown as Q;
}

function narrow(query: Narrowable, view: BookingView): Narrowable {
  const today = todayIst();
  switch (view) {
    case "upcoming": // confirmed trips from today on
      return query.eq("status", "confirmed").gte("travel_date", today);
    case "today":
      return query.in("status", ["confirmed", "completed"]).eq("travel_date", today);
    case "tomorrow":
      return query.eq("status", "confirmed").eq("travel_date", todayIst(1));
    case "no_driver": // confirmed trips from today on that still have no driver
      return query.eq("status", "confirmed").eq("driver_name", "").gte("travel_date", today);
    case "booked_today": // made today (India time), unpaid checkouts left out
      return query.in("status", ["confirmed", "completed", "cancelled"]).gte("created_at", `${today}T00:00:00+05:30`);
    case "past":
      return query.in("status", ["confirmed", "completed"]).lt("travel_date", today);
    case "unpaid":
      return query.in("status", ["pending_payment", "payment_failed"]);
    case "cancelled":
      return query.eq("status", "cancelled");
  }
}

/** Trips in a view are listed by when they run (soonest first; past ones latest first), the rest by when they were booked. */
const TRAVEL_ORDER: Partial<Record<BookingView, "asc" | "desc">> = { upcoming: "asc", today: "asc", tomorrow: "asc", no_driver: "asc", past: "desc" };

export async function listBookings(filters: BookingFilters) {
  let query = db().from("bookings").select(BOOKING_COLUMNS, { count: "exact" });

  const q = cleanSearch(filters.q);
  if (q) {
    query = query.or(
      ["ref", "traveller_name", "traveller_phone", "traveller_email", "from_city", "to_city"].map((c) => `${c}.ilike.%${q}%`).join(","),
    );
  }
  if (filters.view) query = narrowToView(query, filters.view);
  if (filters.status && STATUSES.includes(filters.status)) query = query.eq("status", filters.status);
  if (filters.trip === "airport") query = query.in("trip_type", ["airport_pickup", "airport_drop"]);
  else if (filters.trip && TRIPS.includes(filters.trip)) query = query.eq("trip_type", filters.trip);
  if (filters.source === "online" || filters.source === "phone") query = query.eq("source", filters.source);
  if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)) query = query.gte("travel_date", filters.from);
  if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)) query = query.lte("travel_date", filters.to);

  const start = (filters.page - 1) * PAGE_SIZE;
  const travel = filters.view ? TRAVEL_ORDER[filters.view] : undefined;
  const ordered = travel
    ? query.order("travel_date", { ascending: travel === "asc" }).order("travel_time", { ascending: travel === "asc" })
    : query.order("created_at", { ascending: false });
  const { data, count, error } = await ordered.range(start, start + PAGE_SIZE - 1);
  if (error) throw error;
  return { rows: (data ?? []) as unknown as BookingRow[], total: count ?? 0 };
}

/** How many bookings each quick view has right now, for the numbers on the chips. A failed count is left out. */
export async function countBookingViews(): Promise<Partial<Record<BookingView, number>>> {
  const shown: BookingView[] = ["upcoming", "today", "tomorrow", "no_driver", "booked_today"];
  const counts = await Promise.all(
    shown.map(async (view) => {
      const { count, error } = await narrowToView(db().from("bookings").select("id", { count: "exact", head: true }), view);
      return [view, error ? undefined : (count ?? 0)] as const;
    }),
  );
  return Object.fromEntries(counts.filter(([, n]) => n !== undefined));
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
    .select(`${PAYMENT_COLUMNS}, bookings(ref, traveller_name, traveller_phone, from_city, to_city, travel_date)`, { count: "exact" });
  if (filters.status && ["created", "paid", "failed", "refunded"].includes(filters.status)) query = query.eq("status", filters.status);
  if (filters.kind && ["advance", "full", "balance"].includes(filters.kind)) query = query.eq("kind", filters.kind);
  const start = (filters.page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.order("created_at", { ascending: false }).range(start, start + PAGE_SIZE - 1);
  if (error) throw error;
  return {
    rows: (data ?? []) as unknown as (PaymentRow & { bookings: { ref: string; traveller_name: string; traveller_phone: string; from_city: string; to_city: string; travel_date: string } | null })[],
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

export type CustomerSummary = { id: string; email: string; created_at: string; bookings: number; spent: number; blocked: boolean };

export async function listCustomers(filters: { q?: string; page: number }) {
  let query = db().from("customers").select("id, email, created_at, blocked", { count: "exact" });
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
    blocked: !!c.blocked,
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
  const { data: customer, error } = await db().from("customers").select("id, email, created_at, admin_note, blocked, blocked_reason, blocked_at").eq("id", id).maybeSingle();
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
  let payments: PaymentRow[] = [];
  if (rows.length) {
    const { data: paymentRows, error: pError } = await db()
      .from("payments")
      .select(PAYMENT_COLUMNS)
      .in("booking_id", rows.map((b) => b.id))
      .order("created_at", { ascending: false });
    if (pError) throw pError;
    payments = (paymentRows ?? []) as unknown as PaymentRow[];
    spent = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  }
  return { customer, bookings: rows, spent, payments };
}

/* -------------------------------- drivers -------------------------------- */

export type DriverRow = { id: string; name: string; phone: string; cab_number: string; cab_model: string; note: string; active: boolean; created_at: string };
export type DriverSummary = DriverRow & { upcoming: number; completed: number; business: number };

const DRIVER_COLUMNS = "id, name, phone, cab_number, cab_model, note, active, created_at";

/** Active drivers for the "choose a driver" dropdown. */
export async function listActiveDrivers(): Promise<DriverRow[]> {
  const { data, error } = await db().from("drivers").select(DRIVER_COLUMNS).eq("active", true).order("name");
  if (error) throw error;
  return (data ?? []) as DriverRow[];
}

/** Every driver with how many trips are coming up, how many are done, and the fare value of those trips (confirmed + completed). */
export async function listDrivers(): Promise<DriverSummary[]> {
  const [drivers, trips] = await Promise.all([
    db().from("drivers").select(DRIVER_COLUMNS).order("active", { ascending: false }).order("name"),
    db().from("bookings").select("driver_id, status, total, travel_date").not("driver_id", "is", null).in("status", ["confirmed", "completed"]).limit(20000),
  ]);
  if (drivers.error) throw drivers.error;
  if (trips.error) throw trips.error;
  const today = todayIst();
  const stats = new Map<string, { upcoming: number; completed: number; business: number }>();
  for (const t of trips.data ?? []) {
    const entry = stats.get(t.driver_id as string) ?? { upcoming: 0, completed: 0, business: 0 };
    if (t.status === "completed") entry.completed += 1;
    else if ((t.travel_date as string) >= today) entry.upcoming += 1;
    else entry.completed += 1; // a confirmed trip whose day has passed counts as done
    entry.business += t.total as number;
    stats.set(t.driver_id as string, entry);
  }
  return ((drivers.data ?? []) as DriverRow[]).map((d) => ({ ...d, ...(stats.get(d.id) ?? { upcoming: 0, completed: 0, business: 0 }) }));
}

export async function getDriverWithTrips(id: string) {
  const { data: driver, error } = await db().from("drivers").select(DRIVER_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!driver) return null;
  const { data: trips, error: tError } = await db().from("bookings").select(BOOKING_COLUMNS).eq("driver_id", id).order("travel_date", { ascending: false }).limit(200);
  if (tError) throw tError;
  return { driver: driver as DriverRow, trips: (trips ?? []) as unknown as BookingRow[] };
}

/* ------------------------------- coupon use ------------------------------ */

export type CouponStat = { uses: number; discount: number; lastUsed: string | null; customers: number };

/** How often each coupon code was used by bookings that still stand (confirmed, completed, or an unpaid one from the last 20 minutes). */
export async function getCouponStats(): Promise<Record<string, CouponStat>> {
  const { data, error } = await db().from("bookings").select("coupon_code, customer_id, discount, status, created_at").neq("coupon_code", "").in("status", ["confirmed", "completed", "pending_payment"]).limit(20000);
  if (error) throw error;
  const out: Record<string, CouponStat & { ids: Set<string> }> = {};
  const now = Date.now();
  for (const row of data ?? []) {
    if (row.status === "pending_payment" && now - new Date(row.created_at as string).getTime() > 20 * 60_000) continue;
    const code = row.coupon_code as string;
    const entry = (out[code] ??= { uses: 0, discount: 0, lastUsed: null, customers: 0, ids: new Set() });
    entry.uses += 1;
    entry.discount += row.discount as number;
    entry.ids.add(row.customer_id as string);
    if (!entry.lastUsed || (row.created_at as string) > entry.lastUsed) entry.lastUsed = row.created_at as string;
  }
  return Object.fromEntries(Object.entries(out).map(([code, v]) => [code, { uses: v.uses, discount: v.discount, lastUsed: v.lastUsed, customers: v.ids.size }]));
}
