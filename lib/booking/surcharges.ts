import type { BookingTripType } from "@/lib/booking/config";
import type { Field } from "@/lib/cms/types";

/**
 * Night and peak-time charges (Admin > Online booking > Night & peak charges) and the separate "book this much earlier"
 * rule for local rentals. Pure: the server adds the charges to the fare; the browser never sends them.
 * Both are decided by the PICKUP date and time (India time, as typed).
 */

export type ChargeKind = "flat" | "percent";
export type TripFlags = { oneWay: boolean; roundTrip: boolean; airport: boolean; hourly: boolean };
export type NightCharge = TripFlags & { active: boolean; from: string; to: string; kind: ChargeKind; value: number };
export type PeakCharge = TripFlags & { name: string; startDate: string; endDate: string; startTime: string; endTime: string; kind: ChargeKind; value: number; active: boolean };
export type TimeRules = { hourlyMinLeadMinutes: number; nightCharge: NightCharge; peakCharges: PeakCharge[] };
/** One charge on a fare: its name for the customer, and the amount in paise. */
export type Surcharge = { label: string; amount: number };

export const DEFAULT_TIME_RULES: TimeRules = {
  hourlyMinLeadMinutes: 0,
  // switched off until the owner sets a rate
  nightCharge: { active: false, from: "22:00", to: "06:00", kind: "flat", value: 0, oneWay: false, roundTrip: false, airport: false, hourly: true },
  peakCharges: [],
};

/** The trip switches, also shown as on/off buttons under each line in the admin list. */
export const TRIP_QUICK_TOGGLES = [
  { key: "oneWay", label: "One-way" },
  { key: "roundTrip", label: "Round trip" },
  { key: "airport", label: "Airport" },
  { key: "hourly", label: "Local" },
];

const TRIP_FLAG: Record<BookingTripType, keyof TripFlags> = {
  one_way: "oneWay",
  round_trip: "roundTrip",
  airport_pickup: "airport",
  airport_drop: "airport",
  hourly: "hourly",
};

/** "HH:MM" inside from..to (both included); a window such as 22:00 to 06:00 runs past midnight. */
function inWindow(time: string, from: string, to: string): boolean {
  return from <= to ? time >= from && time <= to : time >= from || time <= to;
}

/** Rupee value of a charge on a fare (paise), rounded to whole rupees. */
function chargeAmount(kind: ChargeKind, value: number, basePaise: number): number {
  if (!(value > 0)) return 0;
  return kind === "percent" ? Math.round((basePaise * value) / 10_000) * 100 : Math.round(value * 100);
}

const named = (name: string, kind: ChargeKind, value: number) => (kind === "percent" ? `${name} (${value}%)` : name);

/**
 * The charges for one trip. `basePaise` is the vehicle's own fare (no driver allowance or toll), which a percentage is
 * worked out on. When several peak periods match, only the highest one applies; the night charge is separate.
 */
export function surchargesFor(rules: TimeRules, trip: { tripType: BookingTripType; date: string; time: string }, basePaise: number): Surcharge[] {
  const flag = TRIP_FLAG[trip.tripType];
  if (!trip.date || !trip.time || !(basePaise > 0)) return [];
  const list: Surcharge[] = [];

  const night = rules.nightCharge;
  if (night?.active && night[flag] && night.from && night.to && inWindow(trip.time, night.from, night.to)) {
    const amount = chargeAmount(night.kind, night.value, basePaise);
    if (amount > 0) list.push({ label: named("Night charge", night.kind, night.value), amount });
  }

  let peak: Surcharge | null = null;
  for (const row of rules.peakCharges ?? []) {
    if (!row.active || !row[flag] || !row.startDate) continue;
    if (trip.date < row.startDate || trip.date > (row.endDate || row.startDate)) continue;
    if (!inWindow(trip.time, row.startTime || "00:00", row.endTime || "23:59")) continue;
    const amount = chargeAmount(row.kind, row.value, basePaise);
    if (amount > 0 && (!peak || amount > peak.amount)) peak = { label: named(row.name || "Peak time charge", row.kind, row.value), amount };
  }
  if (peak) list.push(peak);
  return list;
}

export const surchargeTotal = (list: Surcharge[] | undefined) => (list ?? []).reduce((sum, item) => sum + item.amount, 0);

/** How long before pickup this kind of trip must be booked, in minutes. */
export function leadMinutesFor(tripType: BookingTripType, generalMinutes: number, rules: Pick<TimeRules, "hourlyMinLeadMinutes">): number {
  return tripType === "hourly" && rules.hourlyMinLeadMinutes > 0 ? rules.hourlyMinLeadMinutes : generalMinutes;
}

const KIND_FIELD: Field = {
  type: "select",
  key: "kind",
  label: "Charge type",
  options: [
    { value: "flat", label: "Fixed rupees" },
    { value: "percent", label: "Percent of the fare" },
  ],
  defaultValue: "flat",
};
const VALUE_FIELD: Field = { type: "number", key: "value", label: "Charge (₹ or %, as chosen above)", min: 0, max: 100000, step: 1, defaultValue: 0, hint: "A percentage is worked out on the vehicle's fare, before driver allowance, toll and GST. 0 = no charge." };

const tripToggles = (): Field[] => [
  { type: "toggle", key: "oneWay", label: "Apply on One-way outstation", defaultValue: false },
  { type: "toggle", key: "roundTrip", label: "Apply on Round trip", defaultValue: false },
  { type: "toggle", key: "airport", label: "Apply on Airport transfer", defaultValue: false },
  { type: "toggle", key: "hourly", label: "Apply on Local (hourly rental)", defaultValue: true },
];

export const TIME_RULE_FIELDS: Field[] = [
  {
    type: "number",
    key: "hourlyMinLeadMinutes",
    label: "Local rental: earliest bookable pickup (minutes from now)",
    min: 0,
    max: 10080,
    step: 5,
    defaultValue: 0,
    hint: "For example 60. Only for Local (hourly) bookings. 0 = same as the other trips (Booking settings).",
  },
  {
    type: "group",
    key: "nightCharge",
    label: "Night charge",
    hint: "Added when the pickup time falls between these two times.",
    fields: [
      { type: "toggle", key: "active", label: "Add a night charge", defaultValue: false },
      { type: "text", key: "from", label: "Night starts at", format: "time", max: 5 },
      { type: "text", key: "to", label: "Night ends at", format: "time", max: 5 },
      KIND_FIELD,
      VALUE_FIELD,
      ...tripToggles(),
    ],
  },
  {
    type: "list",
    key: "peakCharges",
    label: "Peak time charges",
    itemTitle: "name",
    itemSubtitle: "startDate",
    itemMeta: [{ key: "value", prefix: "Charge " }],
    maxItems: 12,
    addLabel: "Add peak period",
    quickToggles: TRIP_QUICK_TOGGLES,
    hint: "For festivals, holidays or busy hours. Decided by the pickup date and time. If two periods match, only the higher charge applies.",
    fields: [
      { type: "text", key: "name", label: "Name shown to customers", required: true, max: 40, placeholder: "Diwali peak charge" },
      { type: "text", key: "startDate", label: "From date", required: true, format: "date", max: 10 },
      { type: "text", key: "endDate", label: "To date", format: "date", max: 10, hint: "Empty = only the From date." },
      { type: "text", key: "startTime", label: "From time", format: "time", max: 5, hint: "Empty = from midnight." },
      { type: "text", key: "endTime", label: "To time", format: "time", max: 5, hint: "Empty = until midnight." },
      KIND_FIELD,
      VALUE_FIELD,
      { type: "toggle", key: "active", label: "This period is on", defaultValue: true },
      ...tripToggles(),
    ],
  },
];
