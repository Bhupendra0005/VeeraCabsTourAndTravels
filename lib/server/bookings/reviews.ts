import "server-only";
import { departureAt } from "@/lib/booking/config";
import { EXTERNAL_SOURCES, oneDecimal, shortName, type ExternalSource, type PublicReview, type ReviewSummary } from "@/lib/booking/reviews";
import { getBookingPage } from "@/lib/server/cms/content";
import { db } from "@/lib/server/core/db";
import { HttpError } from "@/lib/server/core/http";
import type { BookingRow } from "@/lib/server/bookings/types";

type ReviewRow = {
  cab_rating: number;
  driver_rating: number;
  tags: string[];
  comment: string;
  reviewer_name: string;
  vehicle_type: string;
  created_at: string;
};

const COLUMNS = "cab_rating, driver_rating, tags, comment, reviewer_name, vehicle_type, created_at";
/** Enough for a small fleet; a very large history would need a stored aggregate. */
const SCAN_LIMIT = 5000;

const toPublic = (row: ReviewRow): PublicReview => ({
  cabRating: row.cab_rating,
  driverRating: row.driver_rating,
  tags: row.tags ?? [],
  comment: row.comment,
  reviewer: row.reviewer_name,
  vehicle: row.vehicle_type,
  date: row.created_at,
});

/** Average rating and number of reviews per vehicle, for the cab cards. Failures just mean "no ratings yet". */
export async function getVehicleRatings(): Promise<Record<string, { avg: number; count: number }>> {
  try {
    const { data, error } = await db().from("reviews").select("vehicle_type, cab_rating, driver_rating").eq("published", true).limit(SCAN_LIMIT);
    if (error) throw error;
    const sums: Record<string, { total: number; count: number }> = {};
    for (const row of data ?? []) {
      const entry = (sums[row.vehicle_type] ??= { total: 0, count: 0 });
      entry.total += (row.cab_rating + row.driver_rating) / 2;
      entry.count += 1;
    }
    return Object.fromEntries(Object.entries(sums).map(([vehicle, { total, count }]) => [vehicle, { avg: oneDecimal(total / count), count }]));
  } catch (error) {
    console.error("Vehicle ratings could not be loaded", error);
    return {};
  }
}

/** Summary and the latest reviews of one vehicle, for the review-booking page. */
export async function getVehicleReviews(vehicle: string, latest = 3): Promise<{ summary: ReviewSummary | null; reviews: PublicReview[] }> {
  try {
    const { data, error } = await db()
      .from("reviews")
      .select(COLUMNS)
      .eq("vehicle_type", vehicle)
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(SCAN_LIMIT);
    if (error) throw error;
    const rows = (data ?? []) as ReviewRow[];
    if (rows.length === 0) return { summary: null, reviews: [] };

    const cab = rows.reduce((sum, row) => sum + row.cab_rating, 0) / rows.length;
    const driver = rows.reduce((sum, row) => sum + row.driver_rating, 0) / rows.length;
    const tagCounts = new Map<string, number>();
    for (const row of rows) for (const tag of row.tags ?? []) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    return {
      summary: {
        count: rows.length,
        cab: oneDecimal(cab),
        driver: oneDecimal(driver),
        overall: oneDecimal((cab + driver) / 2),
        tags: [...tagCounts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count).slice(0, 5),
      },
      reviews: rows.slice(0, latest).map(toPublic),
    };
  } catch (error) {
    console.error("Vehicle reviews could not be loaded", error);
    return { summary: null, reviews: [] };
  }
}

export type HomeReviews = { overall: number; count: number; reviews: PublicReview[] };

type ExternalRow = { id: string; reviewer_name: string; source: ExternalSource; rating: number; comment: string; review_date: string; published: boolean; created_at: string; avatar_url?: string };

const externalToPublic = (row: ExternalRow): PublicReview => ({
  cabRating: row.rating,
  driverRating: row.rating,
  tags: [],
  comment: row.comment,
  reviewer: row.reviewer_name,
  vehicle: "",
  date: row.review_date,
  source: EXTERNAL_SOURCES[row.source] ?? "Other",
  avatarUrl: row.avatar_url || undefined,
});

/** Published reviews written elsewhere and added by the owner. A failure (e.g. migration 014 not run) just means none. */
async function loadExternalReviews(): Promise<ExternalRow[]> {
  const { data, error } = await db()
    .from("external_reviews")
    .select("*")
    .eq("published", true)
    .order("review_date", { ascending: false })
    .limit(SCAN_LIMIT);
  if (error) {
    console.error("External reviews could not be loaded", error);
    return [];
  }
  return (data ?? []) as ExternalRow[];
}

/**
 * Real customer reviews for the home page: the average over every published review (website and owner-added),
 * and the newest ones that have a written comment. Hidden reviews are never included. `null` = nothing to show yet.
 */
export async function getHomeReviews(latest = 9): Promise<HomeReviews | null> {
  try {
    const [site, external] = await Promise.all([
      db().from("reviews").select(COLUMNS).eq("published", true).order("created_at", { ascending: false }).limit(SCAN_LIMIT),
      loadExternalReviews(),
    ]);
    if (site.error) throw site.error;
    const rows = (site.data ?? []) as ReviewRow[];
    const count = rows.length + external.length;
    if (count === 0) return null;
    const total = rows.reduce((sum, row) => sum + (row.cab_rating + row.driver_rating) / 2, 0) + external.reduce((sum, row) => sum + row.rating, 0);
    const shown = [...rows.map(toPublic), ...external.map(externalToPublic)]
      .filter((review) => review.comment.trim().length > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, latest);
    if (shown.length === 0) return null;
    return { overall: oneDecimal(total / count), count, reviews: shown };
  } catch (error) {
    console.error("Home page reviews could not be loaded", error);
    return null;
  }
}

export type AdminExternalReview = ExternalRow & { created_by: string };

export async function listExternalReviewsForAdmin(): Promise<AdminExternalReview[]> {
  const { data, error } = await db()
    .from("external_reviews")
    .select("*")
    .order("review_date", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as AdminExternalReview[];
}

/** The review the customer already wrote for this booking, if any. */
export async function loadReviewForBooking(bookingId: string): Promise<PublicReview | null> {
  const { data, error } = await db().from("reviews").select(COLUMNS).eq("booking_id", bookingId).maybeSingle();
  if (error) throw error;
  return data ? toPublic(data as ReviewRow) : null;
}

/** A trip can be reviewed once it has started and the booking was not cancelled. */
export function canReview(booking: BookingRow, now = Date.now()): boolean {
  return (booking.status === "confirmed" || booking.status === "completed") && departureAt(booking.travel_date, booking.travel_time).getTime() <= now;
}

export type ReviewInput = { cabRating: number; driverRating: number; tags: string[]; comment: string };

export async function createReview(booking: BookingRow, input: ReviewInput): Promise<void> {
  const page = await getBookingPage();
  if (!page.enableReviews) throw new HttpError(400, "Reviews are not being accepted right now.");
  if (!canReview(booking)) throw new HttpError(400, "You can review a trip after it has taken place.");
  const valid = (n: number) => Number.isInteger(n) && n >= 1 && n <= 5;
  if (!valid(input.cabRating) || !valid(input.driverRating)) throw new HttpError(400, "Please rate both the cab and the driver.");
  const allowed = new Set<string>(page.reviewTags);
  const tags = [...new Set(input.tags)].filter((tag) => allowed.has(tag));

  const { error } = await db().from("reviews").insert({
    booking_id: booking.id,
    customer_id: booking.customer_id,
    vehicle_type: booking.vehicle_type,
    reviewer_name: shortName(booking.traveller_name),
    cab_rating: input.cabRating,
    driver_rating: input.driverRating,
    tags,
    comment: input.comment,
  });
  if (error) {
    if (error.code === "23505") throw new HttpError(409, "You have already reviewed this trip.");
    throw error;
  }
}

/* ---------------- admin ---------------- */

export type AdminReview = PublicReview & {
  id: string;
  ref: string;
  bookingId: string;
  published: boolean;
  /** Full details of the booking and customer, for the owner only (the website only ever shows first name + initial). */
  customerEmail: string;
  travellerName: string;
  travellerPhone: string;
  route: string;
  travelDate: string;
};

export async function listReviewsForAdmin(limit = 100): Promise<AdminReview[]> {
  const { data, error } = await db()
    .from("reviews")
    .select(`id, published, ${COLUMNS}, bookings!inner(id, ref, from_city, to_city, travel_date, traveller_name, traveller_phone), customers(email)`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  type Joined = ReviewRow & {
    id: string;
    published: boolean;
    bookings: { id: string; ref: string; from_city: string; to_city: string; travel_date: string; traveller_name: string; traveller_phone: string };
    customers: { email: string } | null;
  };
  return (data as unknown as Joined[]).map((row) => ({
    ...toPublic(row),
    id: row.id,
    published: row.published,
    ref: row.bookings.ref,
    bookingId: row.bookings.id,
    customerEmail: row.customers?.email ?? "",
    travellerName: row.bookings.traveller_name,
    travellerPhone: row.bookings.traveller_phone,
    route: `${row.bookings.from_city} to ${row.bookings.to_city}`,
    travelDate: row.bookings.travel_date,
  }));
}
