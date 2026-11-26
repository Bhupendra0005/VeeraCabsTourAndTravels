import type { Field } from "@/lib/cms/types";

/**
 * Fixed fares for airport transfers and hourly rentals. Edited by the owner in
 * Admin > Website content. One row per airport (or package) and vehicle. Amounts in rupees.
 */
export type AirportFareRow = {
  airport: string;
  vehicle: string;
  fare: number;
  /** Kilometres the fare covers, 0 = not mentioned. */
  includedKm: number;
  /** Rupees per km beyond the included km; 0 = use the vehicle's rate from the Fleet. */
  extraKmRate: number;
  active: boolean;
};

export type HourlyFareRow = {
  city: string;
  /** Package name shown to customers, e.g. "4 hrs / 40 km". */
  label: string;
  hours: number;
  km: number;
  vehicle: string;
  fare: number;
  extraKmRate: number;
  extraHourRate: number;
  active: boolean;
};

export type AirportDoc = { fares: AirportFareRow[] };

/** An airport fare that went past its included km: how the extra was worked out. Money in paise, `rate` in rupees. */
export type AirportExtra = { tripKm: number; includedKm: number; extraKm: number; rate: number; base: number; amount: number };
export type HourlyDoc = { fares: HourlyFareRow[] };

export const AIRPORT_KEY = "airport_transfers";
export const HOURLY_KEY = "hourly_rentals";

const AIRPORT = "Pune Airport (PNQ)";
const VEHICLES: [string, number][] = [
  ["Sedan", 0],
  ["Premium SUV", 1],
  ["Spacious MPV", 2],
  ["Tempo Traveller", 3],
];

/** Sample fares: the owner must replace them with real ones. */
export const DEFAULT_AIRPORT: AirportDoc = {
  fares: [
    { airport: AIRPORT, vehicle: "Sedan", fare: 900, includedKm: 25, extraKmRate: 0, active: true },
    { airport: AIRPORT, vehicle: "Premium SUV", fare: 1500, includedKm: 25, extraKmRate: 0, active: true },
    { airport: AIRPORT, vehicle: "Spacious MPV", fare: 1300, includedKm: 25, extraKmRate: 0, active: true },
    { airport: AIRPORT, vehicle: "Tempo Traveller", fare: 2500, includedKm: 25, extraKmRate: 0, active: true },
  ],
};

/** Sample hourly prices: a fixed part plus a rate per hour, per vehicle (rupees). The owner replaces them. */
const HOURLY_PRICE: Record<string, [number, number]> = {
  Sedan: [400, 200],
  "Premium SUV": [700, 325],
  "Spacious MPV": [600, 275],
  "Tempo Traveller": [1200, 500],
};
const RATES: Record<string, [number, number]> = {
  Sedan: [12, 150],
  "Premium SUV": [19, 250],
  "Spacious MPV": [15, 200],
  "Tempo Traveller": [26, 350],
};
/** Like MakeMyTrip: "1 hrs 10 kms", "2 hrs 20 kms", ... */
const PACKAGE_HOURS = [1, 2, 3, 4, 5, 6, 8, 10, 12];

export const DEFAULT_HOURLY: HourlyDoc = {
  fares: PACKAGE_HOURS.flatMap((hours) =>
    VEHICLES.map(([vehicle]) => ({
      city: "Pune",
      label: `${hours} hrs ${hours * 10} kms`,
      hours,
      km: hours * 10,
      vehicle,
      fare: HOURLY_PRICE[vehicle][0] + HOURLY_PRICE[vehicle][1] * hours,
      extraKmRate: RATES[vehicle][0],
      extraHourRate: RATES[vehicle][1],
      active: true,
    })),
  ),
};

export const AIRPORT_FIELDS: Field[] = [
  {
    type: "list",
    key: "fares",
    label: "Airport transfer fares",
    itemTitle: "airport",
    itemSubtitle: "vehicle",
    itemMeta: [
      { key: "fare", prefix: "₹" },
      { key: "includedKm", suffix: " km included" },
      { key: "extraKmRate", prefix: "₹", suffix: " / extra km" },
    ],
    maxItems: 120,
    addLabel: "Add fare",
    fields: [
      { type: "text", key: "airport", label: "Airport", required: true, max: 60, placeholder: "Pune Airport (PNQ)", hint: "Use exactly the same name on every row of that airport." },
      { type: "text", key: "vehicle", label: "Vehicle (same as the Fleet name)", required: true, max: 40 },
      { type: "number", key: "fare", label: "Fixed fare (₹, before GST)", min: 1, max: 1000000, step: 1, defaultValue: 900 },
      { type: "number", key: "includedKm", label: "Kilometres included (0 = not mentioned)", min: 0, max: 500, step: 1, defaultValue: 25 },
      {
        type: "number",
        key: "extraKmRate",
        label: "Charge per extra km (₹)",
        min: 0,
        max: 500,
        step: 1,
        defaultValue: 0,
        hint: "Charged beyond the kilometres included. 0 = use this vehicle's extra-km rate from Vehicles.",
      },
      { type: "toggle", key: "active", label: "Offer this fare", defaultValue: true },
    ],
  },
];

export const HOURLY_FIELDS: Field[] = [
  {
    type: "list",
    key: "fares",
    label: "Hourly rental packages and fares",
    itemTitle: "label",
    itemSubtitle: "vehicle",
    itemMeta: [
      { key: "fare", prefix: "₹" },
      { key: "extraKmRate", prefix: "₹", suffix: " / extra km" },
      { key: "extraHourRate", prefix: "₹", suffix: " / extra hr" },
    ],
    maxItems: 200,
    addLabel: "Add package fare",
    fields: [
      { type: "text", key: "city", label: "City", required: true, max: 40, placeholder: "Pune" },
      { type: "text", key: "label", label: "Package name", required: true, max: 30, placeholder: "4 hrs 40 kms", hint: "Use exactly the same name on every vehicle row of that package." },
      { type: "number", key: "hours", label: "Hours included", min: 1, max: 24, step: 1, defaultValue: 4 },
      { type: "number", key: "km", label: "Kilometres included", min: 1, max: 500, step: 1, defaultValue: 40 },
      { type: "text", key: "vehicle", label: "Vehicle (same as the Fleet name)", required: true, max: 40 },
      { type: "number", key: "fare", label: "Package fare (₹, before GST)", min: 1, max: 1000000, step: 1, defaultValue: 1200 },
      { type: "number", key: "extraKmRate", label: "Charge per extra km (₹)", min: 0, max: 500, step: 1, defaultValue: 12 },
      { type: "number", key: "extraHourRate", label: "Charge per extra hour (₹)", min: 0, max: 5000, step: 1, defaultValue: 150 },
      { type: "toggle", key: "active", label: "Offer this fare", defaultValue: true },
    ],
  },
];
