/** Shared (client + server) booking helpers. Money is always in paise. The numbers come from BookingSettings. */
import type { BookingSettings } from "@/lib/booking/settings";

export const TRIP_TYPES = ["one_way", "round_trip"] as const;
export type BookingTripType = (typeof TRIP_TYPES)[number];
export type PayMode = "part" | "full";

export const TRIP_TYPE_LABEL: Record<BookingTripType, string> = {
  one_way: "One way",
  round_trip: "Round trip",
};

export type Quote = {
  baseFare: number;
  gst: number;
  insurance: number;
  total: number;
  /** Amount to pay now for the chosen pay mode. */
  payNow: number;
};

export type PricingRules = Pick<
  BookingSettings,
  "gstPercent" | "partPayPercent" | "insuranceEnabled" | "insuranceRupees"
>;

/** Single source of truth for the invoice maths. Used by the UI and re-run on the server. */
export function buildQuote(
  opts: { baseFare: number; withInsurance: boolean; payMode: PayMode },
  rules: PricingRules,
): Quote {
  const gst = Math.round((opts.baseFare * rules.gstPercent) / 100);
  const insurance = opts.withInsurance && rules.insuranceEnabled ? Math.round(rules.insuranceRupees * 100) : 0;
  const total = opts.baseFare + gst + insurance;
  // part-pay is rounded up to a whole rupee
  const part = Math.min(total, Math.ceil((total * rules.partPayPercent) / 10_000) * 100);
  return {
    baseFare: opts.baseFare,
    gst,
    insurance,
    total,
    payNow: opts.payMode === "full" ? total : part,
  };
}

export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString("en-IN", {
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

export type CancellationOutcome =
  | { allowed: false; reason: string }
  | { allowed: true; refundable: boolean };

export function cancellationOutcome(
  date: string,
  time: string,
  freeCancelMinutes: number,
  now = new Date(),
): CancellationOutcome {
  const departure = departureAt(date, time);
  if (now >= departure) {
    return { allowed: false, reason: "The trip has already started." };
  }
  const minutesLeft = (departure.getTime() - now.getTime()) / 60_000;
  return { allowed: true, refundable: minutesLeft >= freeCancelMinutes };
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
