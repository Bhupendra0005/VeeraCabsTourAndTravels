/** Shared (client + server) booking helpers. Money is always in paise. The numbers come from BookingSettings. */
import type { BookingSettings } from "@/lib/booking/settings";

export const TRIP_TYPES = ["one_way", "round_trip", "airport_pickup", "airport_drop", "hourly"] as const;
export type BookingTripType = (typeof TRIP_TYPES)[number];
export type PayMode = "part" | "full";

export const TRIP_TYPE_LABEL: Record<BookingTripType, string> = {
  one_way: "Outstation One-Way",
  round_trip: "Outstation Round-Trip",
  airport_pickup: "Airport Pickup",
  airport_drop: "Airport Drop",
  hourly: "Hourly Rental",
};

/** Outstation trips are priced per route; airport and hourly trips come from their own fare tables. */
export const isOutstation = (type: BookingTripType) => type === "one_way" || type === "round_trip";
export const isAirport = (type: BookingTripType) => type === "airport_pickup" || type === "airport_drop";

export const GENDERS = ["male", "female", "other"] as const;
export type Gender = (typeof GENDERS)[number];
export const GENDER_LABEL: Record<Gender, string> = { male: "Male", female: "Female", other: "Other" };

export type Quote = {
  baseFare: number;
  /** Flat service fee, shown under Taxes & Fees. */
  serviceFee: number;
  /** Paid special requests (roof carrier, driver language...). */
  addons: number;
  /** Coupon discount, taken off the fare before GST. */
  discount: number;
  gst: number;
  insurance: number;
  total: number;
  /** Amount to pay now for the chosen pay mode. */
  payNow: number;
};

/** A coupon the owner created in Admin > Booking offers. Amounts in rupees. */
export type Coupon = {
  code: string;
  description: string;
  kind: "percent" | "flat";
  value: number;
  /** Cap for a percent coupon, 0 = no cap. */
  maxDiscount: number;
  /** Minimum base fare (rupees) the coupon needs, 0 = none. */
  minFare: number;
  active: boolean;
  /** Only for a customer who has no earlier booking. */
  firstBookingOnly?: boolean;
  /** How many times one customer may use it, 0 or missing = no limit. */
  maxUsesPerCustomer?: number;
  /** How many bookings in total may use it, 0 or missing = no limit. */
  maxUsesTotal?: number;
};

/** A paid special request such as a roof carrier. Price in rupees. */
/** `highlight`: show this request as a hint under cab cards (for example the roof carrier). */
export type Addon = { label: string; description: string; rupees: number; active: boolean; highlight?: boolean };

export const normaliseCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");

/** Discount in paise a coupon gives on a fare (paise). 0 when the fare is below the coupon's minimum. */
export function couponDiscount(coupon: Coupon, fare: number): number {
  if (!coupon.active || fare < Math.round(coupon.minFare * 100)) return 0;
  let off = coupon.kind === "percent" ? Math.round((fare * coupon.value) / 100) : Math.round(coupon.value * 100);
  if (coupon.kind === "percent" && coupon.maxDiscount > 0) off = Math.min(off, Math.round(coupon.maxDiscount * 100));
  return Math.max(0, Math.min(off, fare - 100)); // the customer always pays at least Rs 1 of fare
}

export type PricingRules = Pick<
  BookingSettings,
  "gstPercent" | "partPayPercent" | "insuranceEnabled" | "insuranceRupees"
>;

/** Single source of truth for the invoice maths. Used by the UI and re-run on the server. */
export function buildQuote(
  opts: { baseFare: number; addons?: number; discount?: number; serviceFee?: number; withInsurance: boolean; payMode: PayMode },
  rules: PricingRules,
): Quote {
  const addons = opts.addons ?? 0;
  const discount = Math.min(opts.discount ?? 0, opts.baseFare + addons - 100);
  const taxable = opts.baseFare + addons - Math.max(0, discount);
  const gst = Math.round((taxable * rules.gstPercent) / 100);
  const insurance = opts.withInsurance && rules.insuranceEnabled ? Math.round(rules.insuranceRupees * 100) : 0;
  const serviceFee = Math.max(0, Math.round(opts.serviceFee ?? 0));
  const total = taxable + gst + serviceFee + insurance;
  // part-pay is rounded up to a whole rupee
  const part = Math.min(total, Math.ceil((total * rules.partPayPercent) / 10_000) * 100);
  return {
    baseFare: opts.baseFare,
    serviceFee,
    addons,
    discount: Math.max(0, discount),
    gst,
    insurance,
    total,
    payNow: opts.payMode === "full" ? total : part,
  };
}

export function formatINR(paise: number): string {
  const rupees = Math.abs(paise) / 100;
  return `${paise < 0 ? "-" : ""}₹${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Departure as a Date, interpreting date + HH:MM as India time. */
export function departureAt(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+05:30`);
}

/** Milliseconds from now until departure (negative once the trip has started). */
export function msUntilDeparture(date: string, time: string, now = Date.now()): number {
  return departureAt(date, time).getTime() - now;
}

/** A partial-refund step set by the owner: cancelling at least this many hours before pickup refunds this share of what was paid. */
export type RefundSlab = { hoursBefore: number; percent: number };

/** The steps that can apply: 1-99 %, strictly inside the free window, longest notice first. */
export function usableRefundSlabs(freeCancelMinutes: number, slabs: RefundSlab[] | undefined): { minutes: number; percent: number }[] {
  return (slabs ?? [])
    .map((slab) => ({ minutes: Math.round(Number(slab.hoursBefore) * 60), percent: Math.round(Number(slab.percent)) }))
    .filter((slab) => Number.isFinite(slab.minutes) && slab.minutes > 0 && slab.minutes < freeCancelMinutes && slab.percent >= 1 && slab.percent <= 99)
    .sort((a, b) => b.minutes - a.minutes);
}

/** Share of the money paid that goes back when cancelling with this much time left: 100 in the free window, then the steps, then 0. */
export function refundPercentAt(minutesLeft: number, freeCancelMinutes: number, slabs: RefundSlab[] | undefined): number {
  if (minutesLeft >= freeCancelMinutes) return 100;
  for (const step of usableRefundSlabs(freeCancelMinutes, slabs)) if (minutesLeft >= step.minutes) return step.percent;
  return 0;
}

export type CancellationOutcome =
  | { allowed: false; reason: string }
  | { allowed: true; refundable: boolean; /** 0-100: how much of what was paid is returned if cancelled now. */ refundPercent: number };

export function cancellationOutcome(
  date: string,
  time: string,
  rules: { freeCancelMinutes: number; refundSlabs?: RefundSlab[] },
  now = new Date(),
): CancellationOutcome {
  const departure = departureAt(date, time);
  if (now >= departure) {
    return { allowed: false, reason: "The trip has already started." };
  }
  const minutesLeft = (departure.getTime() - now.getTime()) / 60_000;
  const refundPercent = refundPercentAt(minutesLeft, rules.freeCancelMinutes, rules.refundSlabs);
  return { allowed: true, refundable: refundPercent > 0, refundPercent };
}

/** "6:00 AM" -> "06:00" (the time picker shows 12-hour labels). */
export function to24h(label: string): string {
  const m = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(label.trim());
  if (!m) return "";
  let h = Number(m[1]) % 12;
  if (m[3] === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

export function to12h(time: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m) return time;
  const h = Number(m[1]);
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "60" -> "1 hour", "90" -> "1 hour 30 minutes", "2880" -> "2 days". */
export function describeMinutes(minutes: number): string {
  if (minutes % 1440 === 0 && minutes >= 1440) {
    const d = minutes / 1440;
    return `${d} day${d === 1 ? "" : "s"}`;
  }
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h} hour${h === 1 ? "" : "s"}${m ? ` ${m} minutes` : ""}`;
  }
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
