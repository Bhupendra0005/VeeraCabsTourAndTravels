import type { Addon, BookingTripType, Coupon } from "@/lib/booking/config";
import { DEFAULT_TIME_RULES, TIME_RULE_FIELDS, TRIP_QUICK_TOGGLES, type TimeRules } from "@/lib/booking/surcharges";
import type { Field } from "@/lib/cms/types";

/**
 * One line of "what the fare includes" or "what it does not include". The four switches pick the trips it is shown on
 * (Airport covers pickup and drop; Local = hourly rentals).
 */
export type Inclusion = {
  title: string;
  text: string;
  active: boolean;
  oneWay: boolean;
  roundTrip: boolean;
  airport: boolean;
  hourly: boolean;
};

const TRIP_FLAG: Record<BookingTripType, keyof Pick<Inclusion, "oneWay" | "roundTrip" | "airport" | "hourly">> = {
  one_way: "oneWay",
  round_trip: "roundTrip",
  airport_pickup: "airport",
  airport_drop: "airport",
  hourly: "hourly",
};

/** Active lines meant for this trip type. */
export function linesFor(items: Inclusion[], tripType: BookingTripType): Inclusion[] {
  return items.filter((item) => item.active && item[TRIP_FLAG[tripType]] !== false);
}

const ALL_TRIPS = { oneWay: true, roundTrip: true, airport: true, hourly: true };
const isTollLine = (title: string) => /toll|tax|parking/i.test(title);

/**
 * Lines saved before the trip switches existed have none: show them on every trip, except a toll/tax/parking inclusion,
 * which was never shown as included on a round trip (it is charged extra there). Without this, the first save in the admin
 * would turn every missing switch off.
 */
export function normaliseExtras(extras: BookingExtras): BookingExtras {
  const fill = (items: unknown, legacyToll: boolean): Inclusion[] =>
    (Array.isArray(items) ? (items as Partial<Inclusion>[]) : []).map((item) => {
      const legacy = item.oneWay === undefined && item.roundTrip === undefined && item.airport === undefined && item.hourly === undefined;
      const base = legacy ? { ...ALL_TRIPS, roundTrip: !(legacyToll && isTollLine(String(item.title ?? ""))) } : ALL_TRIPS;
      return {
        title: String(item.title ?? ""),
        text: String(item.text ?? ""),
        active: item.active !== false,
        oneWay: item.oneWay ?? base.oneWay,
        roundTrip: item.roundTrip ?? base.roundTrip,
        airport: item.airport ?? base.airport,
        hourly: item.hourly ?? base.hourly,
      };
    });
  return { ...extras, inclusions: fill(extras.inclusions, true), exclusions: fill(extras.exclusions, false) };
}

export type BookingExtras = {
  /** Charge in rupees for each extra stop on an outstation trip. */
  stopCharge: number;
  /** Flat fee in rupees added to every booking and shown under Taxes & Fees. 0 = no fee. */
  serviceFee: number;
  serviceFeeLabel: string;
  coupons: Coupon[];
  addons: Addon[];
  inclusions: Inclusion[];
  /** What the fare does not include (paid extra), per trip type. */
  exclusions: Inclusion[];
} & TimeRules;

export const BOOKING_EXTRAS_KEY = "booking_extras";

/** Sample content: the owner must confirm every line (prices, coupons, what the fare includes). */
export const DEFAULT_BOOKING_EXTRAS: BookingExtras = {
  ...DEFAULT_TIME_RULES,
  stopCharge: 300,
  serviceFee: 0,
  serviceFeeLabel: "Service Fee",
  coupons: [
    {
      code: "WELCOME10",
      description: "Get 10% off (up to ₹300) on your first cab booking",
      kind: "percent",
      value: 10,
      maxDiscount: 300,
      minFare: 1500,
      active: true,
      firstBookingOnly: true,
    },
    {
      code: "SAVE200",
      description: "Get ₹200 off on outstation bookings above ₹4,000",
      kind: "flat",
      value: 200,
      maxDiscount: 0,
      minFare: 4000,
      active: true,
    },
  ],
  addons: [
    {
      label: "Roof Carrier",
      description: "Add Roof Carrier to fit 4 more bags",
      rupees: 150,
      active: true,
      highlight: true,
    },
    {
      label: "Driver's Language",
      description: "Choose your preferred language for a smoother ride. Most likely the assigned driver speaks the local language if not selected",
      rupees: 100,
      active: true,
      highlight: false,
    },
  ],
  inclusions: [
    { title: "Toll and State Tax", text: "Toll and State Tax are included in the fare", active: true, ...ALL_TRIPS, roundTrip: false },
    { title: "Driver allowance", text: "Driver food and accommodation (stay) charges are included", active: true, ...ALL_TRIPS },
  ],
  exclusions: [
    // one-way fares include toll and tax; a round trip does not. Parking is always paid extra, as per actuals.
    { title: "Toll and State Tax", text: "Not in the fare. Paid extra, as per actuals.", active: true, oneWay: false, roundTrip: true, airport: false, hourly: false },
    { title: "Parking charges", text: "Not in the fare. Paid extra, as per actuals.", active: true, oneWay: true, roundTrip: true, airport: false, hourly: false },
  ],
};

/** The fields of one inclusion or exclusion line, with a switch per trip type. */
const lineFields = (what: string): Field[] => [
  { type: "text", key: "title", label: "Title", required: true, max: 60 },
  { type: "text", key: "text", label: "Details", max: 160 },
  { type: "toggle", key: "active", label: "Show this line", defaultValue: true },
  { type: "toggle", key: "oneWay", label: `${what} on One-way outstation`, defaultValue: true },
  { type: "toggle", key: "roundTrip", label: `${what} on Round trip`, defaultValue: true },
  { type: "toggle", key: "airport", label: `${what} on Airport transfer`, defaultValue: true },
  { type: "toggle", key: "hourly", label: `${what} on Local (hourly rental)`, defaultValue: true },
];

export const BOOKING_EXTRAS_FIELDS: Field[] = [
  ...TIME_RULE_FIELDS,
  {
    type: "number",
    key: "serviceFee",
    label: "Service fee per booking (₹)",
    min: 0,
    max: 5000,
    step: 1,
    hint: "Shown as a separate line under Taxes & Fees. Set 0 for no fee.",
  },
  { type: "text", key: "serviceFeeLabel", label: "Service fee name", max: 30 },
  {
    type: "number",
    key: "stopCharge",
    label: "Charge for each extra stop (₹)",
    min: 0,
    max: 10000,
    step: 1,
    hint: "Customers can add up to 3 stops on an outstation trip. Set 0 to make stops free.",
  },
  {
    type: "list",
    key: "coupons",
    label: "Coupons",
    itemTitle: "code",
    itemSubtitle: "description",
    maxItems: 20,
    addLabel: "Add coupon",
    fields: [
      { type: "text", key: "code", label: "Coupon code", required: true, max: 20, placeholder: "WELCOME10", hint: "Capital letters and numbers, no spaces." },
      { type: "text", key: "description", label: "Offer text shown to customers", required: true, max: 120 },
      {
        type: "select",
        key: "kind",
        label: "Discount type",
        options: [
          { value: "percent", label: "Percent of the fare" },
          { value: "flat", label: "Flat rupees off" },
        ],
      },
      { type: "number", key: "value", label: "Discount (% or ₹, as chosen above)", min: 1, max: 100000, step: 1, defaultValue: 10 },
      { type: "number", key: "maxDiscount", label: "Maximum discount in ₹ (percent coupons, 0 = no limit)", min: 0, max: 100000, step: 1, defaultValue: 0 },
      { type: "number", key: "minFare", label: "Minimum fare in ₹ for the coupon (0 = none)", min: 0, max: 1000000, step: 1, defaultValue: 0 },
      { type: "toggle", key: "firstBookingOnly", label: "Only for a customer's first booking", defaultValue: false, hint: "A customer who already has a confirmed, completed or pending booking cannot use it." },
      { type: "number", key: "maxUsesPerCustomer", label: "Times one customer can use it (0 = no limit)", min: 0, max: 1000, step: 1, defaultValue: 0 },
      { type: "number", key: "maxUsesTotal", label: "Total times it can be used by everyone (0 = no limit)", min: 0, max: 100000, step: 1, defaultValue: 0, hint: "Cancelled bookings do not count." },
      { type: "toggle", key: "active", label: "Coupon is active", defaultValue: true },
    ],
  },
  {
    type: "list",
    key: "addons",
    label: "Special requests (paid extras)",
    itemTitle: "label",
    itemSubtitle: "description",
    maxItems: 10,
    addLabel: "Add special request",
    fields: [
      { type: "text", key: "label", label: "Name", required: true, max: 40, placeholder: "Roof Carrier" },
      { type: "text", key: "description", label: "Short description", max: 160 },
      { type: "number", key: "rupees", label: "Price (₹)", min: 0, max: 100000, step: 1, defaultValue: 100 },
      { type: "toggle", key: "active", label: "Offer this request", defaultValue: true },
      { type: "toggle", key: "highlight", label: "Show as a hint under cab cards", hint: "The first highlighted request appears as a one-line offer under each cab.", defaultValue: false },
    ],
  },
  {
    type: "list",
    key: "inclusions",
    label: "What the fare includes",
    itemTitle: "title",
    itemSubtitle: "text",
    maxItems: 10,
    addLabel: "Add inclusion",
    quickToggles: TRIP_QUICK_TOGGLES,
    hint: "Each line has a switch per trip type, so it only shows on the trips it is true for.",
    fields: lineFields("Show"),
  },
  {
    type: "list",
    key: "exclusions",
    label: "What the fare does not include (exclusions)",
    itemTitle: "title",
    itemSubtitle: "text",
    maxItems: 10,
    addLabel: "Add exclusion",
    quickToggles: TRIP_QUICK_TOGGLES,
    hint: "Charges the customer pays extra, e.g. toll on a round trip, parking at the airport, night charges. The extra-km rate is shown automatically.",
    fields: lineFields("Show"),
  },
];
