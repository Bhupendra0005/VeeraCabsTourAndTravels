import "server-only";
import { randomInt } from "node:crypto";
import { after } from "next/server";
import {
  buildQuote,
  cancellationOutcome,
  couponDiscount,
  departureAt,
  describeMinutes,
  formatINR,
  isAirport,
  isOutstation,
  normaliseCode,
  type BookingTripType,
  type Gender,
  type PayMode,
} from "@/lib/booking/config";
import type { AirportExtra } from "@/lib/booking/transfers";
import { outstationPrice, tripDays, type FareBreakup } from "@/lib/booking/outstation";
import type { SearchParams } from "@/lib/booking/search";
import { distanceConfigured, pricedByDistance, roadRoute, type RoadRoute } from "@/lib/server/bookings/distance";
import { getLocalPlaces } from "@/lib/server/bookings/places";
import { listSellableRoutes } from "@/lib/server/bookings/sellable-routes";
import { getAirportFares, getBookingExtras, getBookingPage, getBookingSettings, getFleet, getHourlyFares } from "@/lib/server/cms/content";
import { sendEmail } from "@/lib/server/email/brevo";
import { db } from "@/lib/server/core/db";
import { cancellationEmail, confirmationEmail, ownerAlertEmail } from "@/lib/server/email/templates";
import { parseAlertEmails } from "@/lib/booking/settings";
import { siteUrl } from "@/lib/server/core/env";
import { HttpError } from "@/lib/server/core/http";
import { documentContext } from "@/lib/server/bookings/context";
import { buildInvoicePdf, buildTicketPdf } from "@/lib/server/bookings/pdf";
import {
  capturePayment,
  createOrder,
  fetchPayment,
  publicKeyId,
  refundPayment,
} from "@/lib/server/payments/razorpay";
import {
  BOOKING_COLUMNS,
  PAYMENT_COLUMNS,
  amountPaid,
  type BookingRow,
  type PaymentRow,
} from "@/lib/server/bookings/types";
import { leadMinutesFor, surchargeTotal, surchargesFor, type Surcharge } from "@/lib/booking/surcharges";

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const MAX_PENDING_PER_HOUR = 5;
const ORDER_REUSE_MS = 20 * 60_000;

function makeRef(): string {
  let ref = "VT";
  for (let i = 0; i < 8; i += 1) ref += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return ref;
}

export type RouteFare = {
  /** Empty for airport transfers and hourly rentals, which have no row in `routes`. */
  routeId: string;
  fromCity: string;
  toCity: string;
  distanceKm: number;
  durationHours: number;
  vehicle: string;
  /** Base fare in paise for the requested trip type. */
  fare: number;
  /** Hourly rentals: the package and what it charges beyond its limits (rupees). Airport: its own extra-km rate, if set. */
  hours?: number;
  extraKmRate?: number;
  extraHourRate?: number;
  /** Fares worked out from the road distance: the km the fare was charged for (a multi-day round trip has a daily minimum). */
  billedKm?: number;
  /** Outstation: the driver allowance already added to `fare` (paise), for the days of the trip. */
  allowance?: number;
  /** Outstation: the number of days the allowance was charged for. */
  allowanceDays?: number;
  /** Fares worked out from the distance: the two places that were actually found for what the customer typed. */
  matched?: { from: string; to: string };
  /** Fares worked out from the distance: the lines the fare is made of. */
  breakup?: FareBreakup;
  /** Round trips: the toll to expect both ways, in rupees (a Google FASTag estimate, NOT part of the fare). */
  tollApprox?: number;
  /** Airport transfers longer than the included km: the extra already added to `fare`. */
  airportExtra?: AirportExtra;
  /** Night and peak-time charges already added to `fare`. */
  surcharges?: Surcharge[];
};

type FareJoin = {
  vehicle_type: string;
  fare_one_way: number;
  fare_round_trip: number | null;
  routes: { id: string; from_city: string; to_city: string; distance_km: number; duration_hours: number } | null;
};

function toRouteFare(row: FareJoin, tripType: BookingTripType, oneWayReturnPercent: number): RouteFare | null {
  if (!row.routes) return null;
  // one-way: the driver also has to drive back, so a share of the fare (default 80%) is added; fares are in paise
  const fare =
    tripType === "round_trip"
      ? (row.fare_round_trip ?? row.fare_one_way * 2)
      : Math.round(row.fare_one_way * (1 + Math.max(0, oneWayReturnPercent) / 100));
  return {
    routeId: row.routes.id,
    fromCity: row.routes.from_city,
    toCity: row.routes.to_city,
    distanceKm: row.routes.distance_km,
    durationHours: Number(row.routes.duration_hours),
    vehicle: row.vehicle_type,
    fare,
  };
}

const FARE_SELECT =
  "vehicle_type, fare_one_way, fare_round_trip, routes!inner(id, from_city, to_city, distance_km, duration_hours, active)";

/** Fare for one vehicle on one outstation route. */
export async function lookupFare(routeId: string, vehicle: string, tripType: BookingTripType) {
  const { data, error } = await db()
    .from("route_fares")
    .select(FARE_SELECT)
    .eq("route_id", routeId)
    .eq("vehicle_type", vehicle)
    .eq("routes.active", true)
    .maybeSingle();
  if (error) throw error;
  const { oneWayReturnPercent } = await getBookingSettings();
  return data ? toRouteFare(data as unknown as FareJoin, tripType, oneWayReturnPercent) : null;
}

/** All vehicle fares for an outstation from/to pair. */
async function searchOutstationFares(from: string, to: string, tripType: BookingTripType) {
  const { data: route, error } = await db()
    .from("routes")
    .select("id")
    .eq("from_city", from)
    .eq("to_city", to)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  if (!route) return [];

  const { data, error: fareError } = await db()
    .from("route_fares")
    .select(FARE_SELECT)
    .eq("route_id", route.id);
  if (fareError) throw fareError;
  const { oneWayReturnPercent } = await getBookingSettings();
  return (data as unknown as FareJoin[])
    .map((row) => toRouteFare(row, tripType, oneWayReturnPercent))
    .filter((fare): fare is RouteFare => fare !== null);
}

/** All vehicle fares for an outstation from/to pair (used by the owner's phone-booking form). */
export async function searchOutstationFaresPublic(from: string, to: string, tripType: BookingTripType) {
  return searchOutstationFares(from, to, tripType);
}

const paise = (rupees: number) => Math.round(rupees * 100);

/**
 * Adds the vehicle's driver allowance (Fleet > Driver allowance per day) to every outstation fare: allowance x days of the trip.
 * A one-way trip counts as one day, a round trip as every calendar day from departure to return. Applied to hand-priced routes
 * and to fares worked out from the distance alike, always on the server, so the browser cannot change it.
 */
async function withDriverAllowance(fares: RouteFare[], trip: { tripType: BookingTripType; date: string; returnDate: string | null }): Promise<RouteFare[]> {
  if (fares.length === 0) return fares;
  const fleet = await getFleet();
  const days = tripDays(trip.date, trip.tripType === "round_trip" ? trip.returnDate : null);
  return fares.map((fare) => {
    const perDay = Math.max(0, Math.round(fleet.find((vehicle) => vehicle.title === fare.vehicle)?.driverAllowance ?? 0));
    if (perDay === 0) return fare;
    const allowance = paise(perDay) * days;
    return { ...fare, fare: fare.fare + allowance, allowance, allowanceDays: days };
  });
}

type DistanceTrip = { tripType: BookingTripType; from: string; to: string; stops: string[]; date: string; returnDate: string | null };

/**
 * Every vehicle's fare for an outstation trip worked out from the road distance between the places the customer typed
 * (through the extra stops). `null` = not available (switched off, no routing key, or the route could not be worked out),
 * and the caller then falls back to the routes the owner priced by hand. Vehicles without a rate per km are not offered.
 */
async function distanceFares(trip: DistanceTrip): Promise<RouteFare[] | null> {
  if (!(await pricedByDistance())) return null;
  const route = await roadRoute([trip.from, ...trip.stops, trip.to]);
  if (!route) return null;
  return faresForRoute(route, trip);
}

/** Every vehicle's fare for a trip whose road distance is known: worked out by the map, or typed by the owner. */
async function faresForRoute(route: RoadRoute, trip: DistanceTrip): Promise<RouteFare[]> {
  const [fleet, settings] = await Promise.all([getFleet(), getBookingSettings()]);
  const days = tripDays(trip.date, trip.tripType === "round_trip" ? trip.returnDate : null);
  return fleet
    .filter((vehicle) => (vehicle.ratePerKm ?? 0) > 0)
    .map((vehicle) => {
      const { fare, billedKm, breakup } = outstationPrice({
        distanceKm: route.distanceKm,
        tripType: trip.tripType,
        days,
        rates: { ratePerKm: vehicle.ratePerKm ?? 0, minKmPerDay: vehicle.minKmPerDay ?? 0, minFare: vehicle.minFare ?? 0 },
        oneWayReturnPercent: settings.oneWayReturnPercent,
        // Google's toll is for a car: each vehicle pays its own share of it ("Toll compared to a car" in Vehicles)
        tollRupees: route.tollRupees ? (route.tollRupees * Math.max(0, vehicle.tollPercent ?? 100)) / 100 : 0,
      });
      return {
        routeId: "",
        fromCity: trip.from.slice(0, 100),
        toCity: trip.to.slice(0, 100),
        distanceKm: route.distanceKm,
        durationHours: route.durationHours,
        vehicle: vehicle.title,
        fare,
        billedKm,
        matched: { from: route.from, to: route.to },
        breakup,
        // a round trip pays toll as per receipts: tell the customer roughly how much, there and back
        ...(trip.tripType === "round_trip" && route.tollRupees
          ? { tollApprox: Math.round((route.tollRupees * 2 * Math.max(0, vehicle.tollPercent ?? 100)) / 100) }
          : {}),
      };
    });
}

/**
 * True when the other end of an airport transfer is outside the city (farther by road than the owner's limit), so the
 * fixed airport fare does not apply and the trip must be booked as outstation. If the distance cannot be worked out
 * (no key, unknown place, Google down) the airport fare stays available.
 */
export async function isBeyondAirportLimit(airport: string, address: string): Promise<boolean> {
  const limit = (await getBookingPage()).airportCityKm ?? 0;
  if (!(limit > 0) || !airport || !address || !(await pricedByDistance())) return false;
  // only an airport the owner serves: anything else has no fares anyway, and must not cost a map lookup
  if (!(await getAirportFares()).fares.some((row) => row.active && row.airport === airport)) return false;
  const route = await roadRoute([airport, address.slice(0, 100)]);
  return !!route && route.distanceKm > limit;
}

async function airportFares(airport: string, tripType: BookingTripType, address: string): Promise<RouteFare[]> {
  // enforced here, on the server, for the cab list, the review page and the payment alike
  if (await isBeyondAirportLimit(airport, address)) return [];
  const rows = (await getAirportFares()).fares.filter((row) => row.active && row.airport === airport);
  const pickup = tripType === "airport_pickup";
  // road distance to the customer's place, to charge the km beyond what a fare includes (worked out here, never sent by the browser)
  const [page, fleet] = await Promise.all([getBookingPage(), getFleet()]);
  const wantsExtra = page.airportExtraKm !== false && distanceConfigured() && !!address && rows.some((row) => row.includedKm > 0);
  const tripKm = wantsExtra ? ((await roadRoute([airport, address.slice(0, 100)]))?.distanceKm ?? 0) : 0;
  return rows.map((row) => {
    const rate = row.extraKmRate > 0 ? row.extraKmRate : (fleet.find((vehicle) => vehicle.title === row.vehicle)?.extraKmRate ?? 0);
    // 0 km included means "not mentioned": there is nothing to charge beyond
    const extraKm = row.includedKm > 0 ? Math.max(0, tripKm - row.includedKm) : 0;
    const amount = paise(extraKm * rate);
    const base = paise(row.fare);
    return {
      routeId: "",
      fromCity: pickup ? row.airport : address.slice(0, 60),
      toCity: pickup ? address.slice(0, 60) : row.airport,
      distanceKm: row.includedKm,
      durationHours: 0,
      vehicle: row.vehicle,
      fare: base + amount,
      extraKmRate: rate > 0 ? rate : undefined,
      ...(amount > 0 ? { billedKm: tripKm, airportExtra: { tripKm, includedKm: row.includedKm, extraKm, rate, base, amount } } : {}),
    };
  });
}

async function hourlyFares(city: string, packageLabel: string): Promise<RouteFare[]> {
  const rows = (await getHourlyFares()).fares.filter((row) => row.active && row.city === city && row.label === packageLabel);
  return rows.map((row) => ({
    routeId: "",
    fromCity: row.city,
    toCity: row.label,
    distanceKm: row.km,
    durationHours: row.hours,
    vehicle: row.vehicle,
    fare: paise(row.fare),
    hours: row.hours,
    extraKmRate: row.extraKmRate,
    extraHourRate: row.extraHourRate,
  }));
}

/* ------------------------------------------------------------------ */
/* Availability: never sell the same vehicle twice for the same time    */
/* ------------------------------------------------------------------ */

const HOLD_UNPAID_MS = 20 * 60_000; // an unpaid checkout keeps the cab for 20 minutes
const DEFAULT_TRIP_HOURS = 4;
const BUFFER_HOURS = 1; // a cab needs a little time between two trips

type TripWindowInput = {
  travel_date: string;
  travel_time: string;
  return_date: string | null;
  /** Route length when known; hourly packages are read from their label ("4 hrs 40 kms"). */
  hours?: number | null;
  label?: string;
};

/** When a trip keeps its vehicle busy: [start, end) in milliseconds. A round trip holds the cab until the end of the return day. */
export function tripWindow(t: TripWindowInput): { start: number; end: number } {
  const start = departureAt(t.travel_date, t.travel_time).getTime();
  if (t.return_date && t.return_date > t.travel_date) {
    return { start, end: departureAt(t.return_date, "23:59").getTime() + BUFFER_HOURS * 3_600_000 };
  }
  const fromLabel = t.label ? Number(/(\d+)\s*hrs?/i.exec(t.label)?.[1]) : NaN;
  const hours = t.hours && t.hours > 0 ? t.hours : Number.isFinite(fromLabel) && fromLabel > 0 ? fromLabel : DEFAULT_TRIP_HOURS;
  return { start, end: start + (hours + BUFFER_HOURS) * 3_600_000 };
}

type BusyRow = {
  vehicle_type: string;
  travel_date: string;
  travel_time: string;
  return_date: string | null;
  to_city: string;
  status: string;
  created_at: string;
  routes: { duration_hours: number } | null;
};

/** Every booking that keeps a vehicle busy during the given trip (cancelled, failed and old unpaid ones are left out). */
async function overlappingBookings(trip: TripWindowInput): Promise<{ id: string; vehicle_type: string; created_at: string }[]> {
  const window = tripWindow(trip);
  const from = new Date(window.start - 45 * 86_400_000).toISOString().slice(0, 10);
  const to = new Date(window.end + 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await db()
    .from("bookings")
    .select("id, vehicle_type, travel_date, travel_time, return_date, to_city, status, created_at, routes(duration_hours)")
    .in("status", ["confirmed", "pending_payment"])
    .gte("travel_date", from)
    .lte("travel_date", to)
    .limit(3000);
  if (error) throw error;
  const now = Date.now();
  const found: { id: string; vehicle_type: string; created_at: string }[] = [];
  for (const row of (data ?? []) as unknown as (BusyRow & { id: string })[]) {
    if (row.status === "pending_payment" && now - new Date(row.created_at).getTime() > HOLD_UNPAID_MS) continue;
    const other = tripWindow({ travel_date: row.travel_date, travel_time: row.travel_time, return_date: row.return_date, hours: row.routes?.duration_hours ? Number(row.routes.duration_hours) : null, label: row.to_city });
    if (other.start < window.end && window.start < other.end) found.push({ id: row.id, vehicle_type: row.vehicle_type, created_at: row.created_at });
  }
  return found;
}

/** How many bookings already keep each vehicle busy during the given trip. */
export async function busyVehicles(trip: TripWindowInput & { excludeBookingId?: string }): Promise<Record<string, number>> {
  const busy: Record<string, number> = {};
  for (const row of await overlappingBookings(trip)) {
    if (trip.excludeBookingId && row.id === trip.excludeBookingId) continue;
    busy[row.vehicle_type] = (busy[row.vehicle_type] ?? 0) + 1;
  }
  return busy;
}

/**
 * Race guard, run right AFTER a booking was inserted. Two customers can pass the first check at the same moment, so every
 * request now counts again, including its own row: bookings are ranked by (created_at, id) and only the first `count` keep
 * the vehicle. All competing requests compute the same ranking, so exactly the right number win.
 */
async function ownsVehicleSlot(booking: { id: string; vehicle_type: string }, trip: TripWindowInput, count: number): Promise<boolean> {
  const rows = (await overlappingBookings(trip))
    .filter((row) => row.vehicle_type === booking.vehicle_type)
    .sort((x, y) => (x.created_at === y.created_at ? x.id.localeCompare(y.id) : x.created_at.localeCompare(y.created_at)));
  const rank = rows.findIndex((row) => row.id === booking.id);
  return rank !== -1 && rank < count;
}

/** Other confirmed trips of the same driver that overlap the given one (so the owner is warned before double-assigning). */
export async function driverClashes(driverId: string, trip: TripWindowInput & { excludeBookingId: string }): Promise<{ ref: string; when: string }[]> {
  const window = tripWindow(trip);
  const from = new Date(window.start - 45 * 86_400_000).toISOString().slice(0, 10);
  const to = new Date(window.end + 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await db()
    .from("bookings")
    .select("id, ref, travel_date, travel_time, return_date, to_city, routes(duration_hours)")
    .eq("driver_id", driverId)
    .eq("status", "confirmed")
    .gte("travel_date", from)
    .lte("travel_date", to)
    .limit(500);
  if (error) throw error;
  const clashes: { ref: string; when: string }[] = [];
  for (const row of (data ?? []) as unknown as { id: string; ref: string; travel_date: string; travel_time: string; return_date: string | null; to_city: string; routes: { duration_hours: number } | null }[]) {
    if (row.id === trip.excludeBookingId) continue;
    const other = tripWindow({ travel_date: row.travel_date, travel_time: row.travel_time, return_date: row.return_date, hours: row.routes?.duration_hours ? Number(row.routes.duration_hours) : null, label: row.to_city });
    if (other.start < window.end && window.start < other.end) clashes.push({ ref: row.ref, when: `${row.travel_date} ${row.travel_time}` });
  }
  return clashes;
}

/** True when the owner limited this vehicle's count and every one is already taken for the trip. */
export function isFullyBooked(vehicle: { count?: number }, busy: Record<string, number>, title: string): boolean {
  return !!vehicle.count && vehicle.count > 0 && (busy[title] ?? 0) >= vehicle.count;
}

/**
 * Adds the owner's night and peak-time charges for the pickup date and time. Applied here, on the server, so the cab
 * list, the review page and the payment always agree.
 */
async function withSurcharges(fares: RouteFare[], trip: { tripType: BookingTripType; date: string; time: string }): Promise<RouteFare[]> {
  if (fares.length === 0) return fares;
  const rules = await getBookingExtras();
  return fares.map((fare) => {
    const surcharges = surchargesFor(rules, trip, fare.fare - (fare.allowance ?? 0) - (fare.breakup?.toll ?? 0));
    return surcharges.length ? { ...fare, fare: fare.fare + surchargeTotal(surcharges), surcharges } : fare;
  });
}

/** Every vehicle fare for a search, whatever the trip type. Cheapest first. */
export async function searchFares(search: SearchParams): Promise<RouteFare[]> {
  const list = isOutstation(search.tripType)
    ? await withDriverAllowance(
        (await distanceFares({ tripType: search.tripType, from: search.from, to: search.to, stops: search.stops, date: search.date, returnDate: search.returnDate || null })) ??
          (await searchOutstationFares(search.from, search.to, search.tripType)),
        { tripType: search.tripType, date: search.date, returnDate: search.returnDate || null },
      )
    : isAirport(search.tripType)
      ? await airportFares(search.airport, search.tripType, search.address)
      : await hourlyFares(search.from, search.pkg);
  return (await withSurcharges(list, search)).sort((x, y) => x.fare - y.fare);
}

/** The one fare a booking is priced from. The browser only names the trip; the price comes from here. */
export async function lookupTripFare(
  trip: {
    tripType: BookingTripType;
    routeId: string;
    vehicle: string;
    from: string;
    airport: string;
    pkg: string;
    address: string;
    /** Outstation fares by distance: the drop place, the stops and the dates. */
    to?: string;
    stops?: string[];
    /** Pickup date and time: night and peak charges depend on them. */
    date: string;
    time: string;
    returnDate?: string | null;
  },
): Promise<RouteFare | null> {
  if (isOutstation(trip.tripType)) {
    // a route the owner priced by hand (also the fallback when the distance could not be worked out)
    const found = trip.routeId
      ? await lookupFare(trip.routeId, trip.vehicle, trip.tripType)
      : ((await distanceFares({ tripType: trip.tripType, from: trip.from, to: trip.to ?? "", stops: trip.stops ?? [], date: trip.date ?? "", returnDate: trip.returnDate ?? null }))?.find((fare) => fare.vehicle === trip.vehicle) ?? null);
    if (!found) return null;
    const priced = await withDriverAllowance([found], { tripType: trip.tripType, date: trip.date, returnDate: trip.returnDate ?? null });
    return (await withSurcharges(priced, trip))[0];
  }
  const list = isAirport(trip.tripType)
    ? await airportFares(trip.airport, trip.tripType, trip.address)
    : await hourlyFares(trip.from, trip.pkg);
  const match = list.find((fare) => fare.vehicle === trip.vehicle);
  return match ? (await withSurcharges([match], trip))[0] : null;
}

export type SearchOptions = {
  cities: { from: string[]; to: Record<string, string[]> };
  /** Every city that can be a stop. */
  stopCities: string[];
  airports: string[];
  /** Pune areas, landmarks and route cities for address suggestions. */
  places: string[];
  hourlyCities: string[];
  /** Package names per city. */
  hourlyPackages: Record<string, string[]>;
};

export async function listSearchOptions(): Promise<SearchOptions> {
  const routes = await listSellableRoutes();
  const to: Record<string, string[]> = {};
  for (const row of routes) (to[row.from_city] ??= []).push(row.to_city);
  for (const key of Object.keys(to)) to[key].sort();

  const [airport, hourly] = await Promise.all([getAirportFares(), getHourlyFares()]);
  const airports = [...new Set(airport.fares.filter((row) => row.active).map((row) => row.airport))].sort();
  const hourlyPackages: Record<string, string[]> = {};
  for (const row of hourly.fares) {
    if (!row.active) continue;
    const list = (hourlyPackages[row.city] ??= []);
    if (!list.includes(row.label)) list.push(row.label);
  }
  const stopCities = [...new Set([...Object.keys(to), ...Object.values(to).flat()])].sort();
  return { cities: { from: Object.keys(to).sort(), to }, stopCities, airports, places: await getLocalPlaces(), hourlyCities: Object.keys(hourlyPackages).sort(), hourlyPackages };
}

/* ------------------------------------------------------------------ */
/* Ownership-checked loaders                                           */
/* ------------------------------------------------------------------ */

/** Returns the booking only if it belongs to the customer; otherwise 404 (no existence leak). */
export async function loadOwnedBooking(id: string, customerId: string): Promise<BookingRow> {
  const { data, error } = await db()
    .from("bookings")
    .select(BOOKING_COLUMNS)
    .eq("id", id)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Booking not found.");
  return data as unknown as BookingRow;
}

export async function loadPayments(bookingId: string): Promise<PaymentRow[]> {
  const { data, error } = await db()
    .from("payments")
    .select(PAYMENT_COLUMNS)
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as unknown as PaymentRow[];
}

export async function listCustomerBookings(customerId: string): Promise<BookingRow[]> {
  const { data, error } = await db()
    .from("bookings")
    .select(BOOKING_COLUMNS)
    .eq("customer_id", customerId)
    .neq("status", "payment_failed")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data as unknown as BookingRow[];
}

/* ------------------------------------------------------------------ */
/* Create booking + first payment order                                */
/* ------------------------------------------------------------------ */

export type BookingInput = {
  /** Outstation priced by hand: the route; empty when the fare is worked out from the distance. */
  routeId: string;
  /** Hourly rentals: the city. Outstation: the pickup place. */
  from: string;
  /** Outstation: the drop place. */
  to: string;
  airport: string;
  /** Hourly rentals: the package name. */
  pkg: string;
  /** Outstation: extra stops. */
  stops: string[];
  gstCompany: string;
  gstin: string;
  vehicle: string;
  tripType: BookingTripType;
  date: string;
  time: string;
  returnDate: string | null;
  passengers: number;
  bags: number;
  gender: Gender | "";
  /** Names of the paid special requests the customer ticked. Prices always come from the server. */
  addons: string[];
  couponCode: string;
  pickupAddress: string;
  dropAddress: string;
  name: string;
  phone: string;
  email: string;
  insurance: boolean;
  payMode: PayMode;
};

export type CheckoutOrder = {
  bookingId: string;
  orderId: string;
  amount: number;
  keyId: string;
  ref: string;
};

/** Throws when the owner has blocked this customer from booking online. */
export async function assertCustomerNotBlocked(customerId: string) {
  const { data, error } = await db().from("customers").select("blocked").eq("id", customerId).maybeSingle();
  if (error) throw error;
  if (data?.blocked) throw new HttpError(403, "We cannot take online bookings from this account. Please call us and we will help you.");
}

/** Counts of how often a coupon was used: bookings that still stand (cancelled, failed and long-unpaid ones do not count). */
export async function couponUsageRows(code: string): Promise<{ customer_id: string; status: string; created_at: string; discount: number }[]> {
  const { data, error } = await db().from("bookings").select("customer_id, status, created_at, discount").eq("coupon_code", code).in("status", ["confirmed", "completed", "pending_payment"]).limit(20000);
  if (error) throw error;
  const now = Date.now();
  return (data ?? []).filter((row) => row.status !== "pending_payment" || now - new Date(row.created_at as string).getTime() <= HOLD_UNPAID_MS) as { customer_id: string; status: string; created_at: string; discount: number }[];
}

/** The coupon's own rules: first booking only, per-customer and overall limits. Called when applying and again when booking. */
export async function assertCouponAllowed(coupon: { code: string; firstBookingOnly?: boolean; maxUsesPerCustomer?: number; maxUsesTotal?: number }, customerId: string) {
  const rows = await couponUsageRows(normaliseCode(coupon.code));
  if (coupon.maxUsesTotal && coupon.maxUsesTotal > 0 && rows.length >= coupon.maxUsesTotal) throw new HttpError(400, "This coupon has reached its usage limit.");
  const mine = rows.filter((row) => row.customer_id === customerId).length;
  if (coupon.maxUsesPerCustomer && coupon.maxUsesPerCustomer > 0 && mine >= coupon.maxUsesPerCustomer) throw new HttpError(400, "You have already used this coupon.");
  if (coupon.firstBookingOnly) {
    const { count, error } = await db().from("bookings").select("id", { count: "exact", head: true }).eq("customer_id", customerId).in("status", ["confirmed", "completed"]);
    if (error) throw error;
    if ((count ?? 0) > 0) throw new HttpError(400, "This coupon is only for your first booking.");
  }
}

export async function createBooking(customerId: string, input: BookingInput): Promise<CheckoutOrder> {
  await assertCustomerNotBlocked(customerId);
  const settings = await getBookingSettings();
  if (!settings.onlineBookingEnabled) throw new HttpError(503, settings.maintenanceMessage);

  const page = await getBookingPage();
  if (isAirport(input.tripType) && !page.enableAirport) throw new HttpError(400, "Airport transfers cannot be booked online right now.");
  if (input.tripType === "hourly" && !page.enableHourly) throw new HttpError(400, "Hourly rentals cannot be booked online right now.");
  if (input.stops.length > 0 && (!page.enableStops || input.stops.length > page.maxStops)) {
    throw new HttpError(400, "Extra stops are not available for this booking.");
  }
  if (input.gstin && !page.enableGstDetails) throw new HttpError(400, "GST details are not accepted right now.");

  const departure = departureAt(input.date, input.time);
  const now = Date.now();
  const leadMinutes = leadMinutesFor(input.tripType, settings.minLeadMinutes, await getBookingExtras());
  if (Number.isNaN(departure.getTime()) || departure.getTime() < now + leadMinutes * 60_000) {
    throw new HttpError(400, `Please choose a pickup time at least ${describeMinutes(leadMinutes)} from now.`);
  }
  if (departure.getTime() > now + 365 * 86_400_000) {
    throw new HttpError(400, "Bookings can be made up to one year ahead.");
  }
  if (input.tripType === "round_trip") {
    if (!input.returnDate || input.returnDate < input.date) {
      throw new HttpError(400, "Choose a return date on or after the travel date.");
    }
  }

  const vehicle = (await getFleet()).find((item) => item.title === input.vehicle);
  if (!vehicle) throw new HttpError(404, "This vehicle is not available.");
  if (input.passengers > vehicle.capacity) {
    throw new HttpError(400, `${vehicle.title} seats up to ${vehicle.capacity} passengers.`);
  }

  // the customer's own address in the city (airport trips) decides the display route; the price never depends on it
  const userSide = input.tripType === "airport_pickup" ? input.dropAddress : input.pickupAddress;
  if (input.tripType === "airport_pickup" && input.dropAddress.length < 3) throw new HttpError(400, "Enter your drop location.");
  const fare = await lookupTripFare({
    tripType: input.tripType,
    routeId: input.routeId,
    vehicle: input.vehicle,
    from: input.from,
    airport: input.airport,
    pkg: input.pkg,
    address: userSide,
    to: input.to,
    stops: input.stops,
    date: input.date,
    time: input.time,
    returnDate: input.tripType === "round_trip" ? input.returnDate : null,
  });
  if (!fare) throw new HttpError(404, "This route or vehicle is not available.");
  if (vehicle.count && vehicle.count > 0) {
    const busy = await busyVehicles({ travel_date: input.date, travel_time: input.time, return_date: input.tripType === "round_trip" ? input.returnDate : null, hours: fare.durationHours || fare.hours || null, label: input.tripType === "hourly" ? input.pkg : undefined });
    if (isFullyBooked(vehicle, busy, vehicle.title)) {
      throw new HttpError(409, `${vehicle.title} is already booked for that time. Please choose another cab or a different time.`);
    }
  }
  if (!isOutstation(input.tripType) && input.stops.length > 0) throw new HttpError(400, "Extra stops are only for outstation trips.");
  if (input.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(input.gstin)) throw new HttpError(400, "Enter a valid 15-character GSTIN.");
  if (input.gstin && input.gstCompany.length < 2) throw new HttpError(400, "Enter the company name for the GST invoice.");

  // anti-abuse: unpaid bookings each create a payment order, so cap them per customer
  const { count, error: countError } = await db()
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .eq("status", "pending_payment")
    .gte("created_at", new Date(now - 3_600_000).toISOString());
  if (countError) throw countError;
  if ((count ?? 0) >= MAX_PENDING_PER_HOUR) {
    throw new HttpError(429, "You have several unpaid bookings. Please complete or wait before booking again.");
  }

  // add-ons and coupons are looked up here, never taken from the browser's numbers
  const extras = await getBookingExtras();
  const chosen = extras.addons.filter((addon) => addon.active && input.addons.includes(addon.label));
  if (chosen.length !== new Set(input.addons).size) throw new HttpError(400, "One of the special requests is no longer available.");
  const stopsTotal = input.stops.length * Math.round(extras.stopCharge * 100);
  const addonsTotal = chosen.reduce((sum, addon) => sum + Math.round(addon.rupees * 100), 0) + stopsTotal;
  const addonNames = [...chosen.map((addon) => addon.label), ...(input.stops.length ? [`Extra stops (${input.stops.length})`] : [])];

  let discount = 0;
  let couponCode = "";
  if (input.couponCode) {
    const coupon = extras.coupons.find((item) => normaliseCode(item.code) === normaliseCode(input.couponCode));
    discount = coupon ? couponDiscount(coupon, fare.fare) : 0;
    if (!coupon || discount <= 0) throw new HttpError(400, "This coupon is not valid for this trip.");
    await assertCouponAllowed(coupon, customerId);
    couponCode = normaliseCode(coupon.code);
  }

  const quote = buildQuote(
    { baseFare: fare.fare, addons: addonsTotal, discount, serviceFee: Math.round(extras.serviceFee * 100), withInsurance: false, payMode: input.payMode },
    settings,
  );

  let booking: BookingRow | null = null;
  for (let attempt = 0; attempt < 4 && !booking; attempt += 1) {
    const { data, error } = await db()
      .from("bookings")
      .insert({
        ref: makeRef(),
        customer_id: customerId,
        route_id: fare.routeId || null,
        trip_type: input.tripType,
        from_city: fare.fromCity,
        to_city: fare.toCity,
        // the airport side starts as the airport's name, but the customer may add a terminal or gate; the fare never depends on it
        pickup_address: input.tripType === "airport_pickup" ? input.pickupAddress.trim().length >= 3 ? input.pickupAddress : fare.fromCity : input.pickupAddress,
        drop_address:
          input.tripType === "airport_drop"
            ? input.dropAddress.trim().length >= 3
              ? input.dropAddress
              : fare.toCity
            : input.tripType === "hourly"
              ? ""
              : input.dropAddress,
        stops: input.stops.join(", "),
        gst_company: input.gstin ? input.gstCompany : "",
        gstin: input.gstin,
        travel_date: input.date,
        travel_time: input.time,
        return_date: input.tripType === "round_trip" ? input.returnDate : null,
        passengers: input.passengers,
        bags: input.bags,
        vehicle_type: fare.vehicle,
        traveller_name: input.name,
        traveller_gender: input.gender,
        traveller_phone: input.phone,
        traveller_email: input.email,
        base_fare: quote.baseFare,
        addons_total: quote.addons,
        addons: addonNames.join(", "),
        coupon_code: couponCode,
        discount: quote.discount,
        service_fee: quote.serviceFee,
        gst: quote.gst,
        insurance: quote.insurance,
        total: quote.total,
        pay_mode: input.payMode,
        advance_due: quote.payNow,
        terms_accepted_at: new Date().toISOString(),
        // a booking does not keep the charges separately: note them for the owner (customers never see this)
        ...(fare.surcharges?.length ? { admin_note: `Fare includes: ${fare.surcharges.map((item) => `${item.label} Rs ${item.amount / 100}`).join(", ")}.` } : {}),
      })
      .select(BOOKING_COLUMNS)
      .single();
    if (error && error.code !== "23505") throw error; // 23505 = ref collision, retry
    booking = (data as unknown as BookingRow) ?? null;
  }
  if (!booking) throw new Error("Could not allocate a booking reference");

  // someone may have taken the last vehicle between the check above and the insert: if so, give the slot up
  if (vehicle.count && vehicle.count > 0) {
    const mine = { id: booking.id, vehicle_type: booking.vehicle_type };
    const trip = { travel_date: input.date, travel_time: input.time, return_date: input.tripType === "round_trip" ? input.returnDate : null, hours: fare.durationHours || fare.hours || null, label: input.tripType === "hourly" ? input.pkg : undefined };
    if (!(await ownsVehicleSlot(mine, trip, vehicle.count))) {
      await db().from("bookings").delete().eq("id", booking.id);
      throw new HttpError(409, `${vehicle.title} was just booked by someone else for that time. Please choose another cab or a different time.`);
    }
  }

  // A new customer's details from their first booking fill the empty parts of their profile, so My trips greets them by
  // name and the next booking is prefilled. Anything they already saved in My profile is never overwritten.
  try {
    const { data: profile } = await db().from("customers").select("name, phone").eq("id", customerId).maybeSingle();
    const fill: Record<string, string> = {};
    if (profile && !profile.name && input.name) fill.name = input.name.slice(0, 80);
    if (profile && !profile.phone && /^[6-9]\d{9}$/.test(input.phone)) fill.phone = input.phone;
    if (Object.keys(fill).length) await db().from("customers").update({ ...fill, updated_at: new Date().toISOString() }).eq("id", customerId);
  } catch (error) {
    console.error("Could not save profile details from the booking", error);
  }

  try {
    return await newOrder(booking, input.payMode === "full" ? "full" : "advance", quote.payNow);
  } catch (error) {
    await db().from("bookings").delete().eq("id", booking.id); // nothing was charged
    throw error;
  }
}

async function newOrder(
  booking: BookingRow,
  kind: PaymentRow["kind"],
  amount: number,
): Promise<CheckoutOrder> {
  // reuse a recent unpaid order of the same amount: an order can only be paid once, so
  // double clicks and second tabs cannot cause a double charge
  const { data: existing, error } = await db()
    .from("payments")
    .select("razorpay_order_id, created_at")
    .eq("booking_id", booking.id)
    .eq("kind", kind)
    .eq("amount", amount)
    .eq("status", "created")
    .gte("created_at", new Date(Date.now() - ORDER_REUSE_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (existing) {
    return { bookingId: booking.id, orderId: existing.razorpay_order_id, amount, keyId: publicKeyId(), ref: booking.ref };
  }

  const order = await createOrder({ amount, receipt: booking.ref, notes: { booking: booking.ref, kind } });
  const { error: insertError } = await db().from("payments").insert({
    booking_id: booking.id,
    kind,
    amount,
    razorpay_order_id: order.id,
  });
  if (insertError) throw insertError;
  return { bookingId: booking.id, orderId: order.id, amount, keyId: publicKeyId(), ref: booking.ref };
}

/** Order for "complete payment" on a pending booking, or "pay balance" on a confirmed one. */
export async function startPayment(booking: BookingRow): Promise<CheckoutOrder> {
  const departure = departureAt(booking.travel_date, booking.travel_time).getTime();
  if (departure <= Date.now()) throw new HttpError(400, "This trip has already started.");

  if (booking.status === "pending_payment" || booking.status === "payment_failed") {
    return newOrder(booking, booking.pay_mode === "full" ? "full" : "advance", booking.advance_due);
  }
  if (booking.status !== "confirmed") throw new HttpError(400, "Payment is not possible for this booking.");

  const outstanding = booking.total - amountPaid(await loadPayments(booking.id));
  if (outstanding <= 0) throw new HttpError(400, "This booking is already fully paid.");
  const { balanceCutoffHours } = await getBookingSettings();
  if (departure - Date.now() < balanceCutoffHours * 3_600_000) {
    throw new HttpError(400, "Online balance payment has closed. Please pay the driver at the end of the trip.");
  }
  return newOrder(booking, "balance", outstanding);
}

/* ------------------------------------------------------------------ */
/* Payment confirmation (browser callback + webhook share this)         */
/* ------------------------------------------------------------------ */

/**
 * Marks a Razorpay payment as paid. Idempotent: the browser callback and the webhook may
 * both call it for the same payment, and only the first one does the work.
 */
export async function confirmPayment(orderId: string, razorpayPaymentId: string, razorpayAmount: number) {
  const { data: payment, error } = await db()
    .from("payments")
    .select(PAYMENT_COLUMNS)
    .eq("razorpay_order_id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!payment) throw new HttpError(404, "Payment not found.");
  const row = payment as unknown as PaymentRow;
  if (row.status === "paid" || row.status === "refunded") return;
  if (razorpayAmount !== row.amount) throw new HttpError(400, "Payment amount mismatch.");

  const { data: claimed, error: claimError } = await db()
    .from("payments")
    .update({ status: "paid", razorpay_payment_id: razorpayPaymentId, paid_at: new Date().toISOString() })
    .eq("id", row.id)
    .in("status", ["created", "failed"])
    .select("id");
  if (claimError) throw claimError;
  if (!claimed?.length) return; // another request got there first

  const { data: booking, error: bookingError } = await db()
    .from("bookings")
    .select(BOOKING_COLUMNS)
    .eq("id", row.booking_id)
    .single();
  if (bookingError) throw bookingError;
  const b = booking as unknown as BookingRow;

  if (b.status === "cancelled") {
    // money arrived after the customer cancelled: give it straight back
    const refund = await refundPayment(razorpayPaymentId, row.amount);
    await db().from("payments").update({ status: "refunded", refund_id: refund.id }).eq("id", row.id);
    return;
  }

  if (row.kind !== "balance" && (b.status === "pending_payment" || b.status === "payment_failed")) {
    const { data: confirmed, error: confirmError } = await db()
      .from("bookings")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", b.id)
      .in("status", ["pending_payment", "payment_failed"])
      .select(BOOKING_COLUMNS);
    if (confirmError) throw confirmError;
    if (confirmed?.length) {
      const confirmedBooking = confirmed[0] as unknown as BookingRow;
      // `after` keeps the request alive until the ticket and invoice are generated and sent. A bare `void sendConfirmation()` is
      // cut off as soon as the response goes out (the customer then never got the mail), and Razorpay's webhook answers fast.
      after(async () => {
        if (!(await sendConfirmation(confirmedBooking))) {
          // one more try a few seconds later: a first failure is usually a short Brevo or network hiccup
          await new Promise((resolve) => setTimeout(resolve, 4000));
          await sendConfirmation(confirmedBooking);
        }
        await notifyOwner(confirmedBooking, "new");
      });
    }
  }
}

/** Server-side check of a checkout result against Razorpay itself (never trust browser-sent status). */
export async function verifyAndConfirm(orderId: string, razorpayPaymentId: string) {
  let rzp = await fetchPayment(razorpayPaymentId);
  if (rzp.order_id !== orderId) throw new HttpError(400, "Payment does not match this order.");
  if (rzp.status === "authorized") rzp = await capturePayment(razorpayPaymentId, rzp.amount);
  if (rzp.status !== "captured") throw new HttpError(402, "Payment has not completed.");
  await confirmPayment(orderId, razorpayPaymentId, rzp.amount);
}

/** Emails the ticket and invoice. Failures are logged, never thrown, so a payment is never failed by email trouble. */
export async function sendConfirmation(booking: BookingRow): Promise<boolean> {
  try {
    const payments = await loadPayments(booking.id);
    const ctx = await documentContext();
    const [ticket, invoice] = await Promise.all([
      buildTicketPdf(booking, payments, ctx),
      buildInvoicePdf(booking, payments, ctx),
    ]);
    await sendEmail({
      to: booking.traveller_email,
      ...confirmationEmail(ctx.site, ctx.rules, booking, amountPaid(payments)),
      attachments: [
        { name: `Ticket-${booking.ref}.pdf`, content: ticket },
        { name: `Invoice-${booking.ref}.pdf`, content: invoice },
      ],
    });
    return true;
  } catch (error) {
    // the booking is already confirmed and the ticket is downloadable; do not fail the payment
    console.error("Confirmation email failed", booking.ref, error);
    return false;
  }
}

/**
 * Emails the owner (Admin > Settings > Booking alerts) about a booking a customer made or cancelled online.
 * Bookings the owner enters by phone are not sent. Never throws: a booking or a cancellation never fails because of it.
 */
export async function notifyOwner(booking: BookingRow, kind: "new" | "cancelled", refund = 0): Promise<void> {
  try {
    const ctx = await documentContext();
    if (!ctx.rules.ownerAlerts) return;
    const typed = parseAlertEmails(ctx.rules.ownerAlertEmails ?? "").emails;
    const to = typed.length > 0 ? typed : parseAlertEmails(ctx.site.email).emails;
    if (to.length === 0) return;
    const paid = kind === "new" ? amountPaid(await loadPayments(booking.id)) : 0;
    const mail = ownerAlertEmail(ctx.site, booking, { kind, paid, refund, adminUrl: `${siteUrl()}/admin/bookings/${booking.id}` });
    for (const email of to) {
      try {
        await sendEmail({ to: email, ...mail });
      } catch (error) {
        console.error("Owner alert email failed", booking.ref, error);
      }
    }
  } catch (error) {
    console.error("Owner alert failed", booking.ref, error);
  }
}

/* ------------------------------------------------------------------ */
/* Cancellation                                                        */
/* ------------------------------------------------------------------ */

/**
 * "policy": the customer rules (the owner's refund steps: full refund early, partial refunds later, none after). The admin may override with a
 * full refund or no refund, and may cancel at any time.
 */
export type CancelMode = "policy" | "refund" | "no_refund";

export async function cancelBooking(booking: BookingRow, mode: CancelMode = "policy"): Promise<{ refunded: number }> {
  if (booking.status !== "confirmed" && booking.status !== "pending_payment") {
    throw new HttpError(400, "This booking cannot be cancelled.");
  }
  const rules = await getBookingSettings();
  const outcome = cancellationOutcome(booking.travel_date, booking.travel_time, rules);
  if (mode === "policy" && !outcome.allowed) throw new HttpError(400, outcome.reason);

  // share of the money paid that goes back: by the owner's refund steps, or all/nothing when the owner overrides
  const percent = mode === "policy" ? (outcome.allowed ? outcome.refundPercent : 0) : mode === "refund" ? 100 : 0;
  const refundShare = (amount: number) => Math.floor((amount * percent) / 100);
  let refunded = 0;
  if (percent > 0) {
    const paid = (await loadPayments(booking.id)).filter((p) => p.status === "paid" && p.razorpay_payment_id && refundShare(p.amount) > 0);
    let failed = 0;
    for (const payment of paid) {
      try {
        const refund = await refundPayment(payment.razorpay_payment_id as string, refundShare(payment.amount));
        await db().from("payments").update({ status: "refunded", refund_id: refund.id }).eq("id", payment.id);
      } catch (error) {
        failed += 1;
        console.error("Refund failed", booking.ref, payment.id, error);
      }
    }
    // If any refund did not go through, the booking is NOT cancelled: the customer is never left cancelled but unpaid-back.
    // Payments that did refund stay refunded, so trying again only retries the rest.
    if (failed > 0) {
      throw new HttpError(502, "We could not process your refund right now, so the booking has not been cancelled. Please try again in a few minutes or call us.");
    }
    refunded = (await loadPayments(booking.id)).filter((p) => p.status === "refunded").reduce((sum, p) => sum + refundShare(p.amount), 0);
  }

  const { data: updated, error } = await db()
    .from("bookings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), refund_amount: refunded })
    .eq("id", booking.id)
    .in("status", ["confirmed", "pending_payment"])
    .select(BOOKING_COLUMNS);
  if (error) throw error;
  if (!updated?.length) throw new HttpError(409, "This booking was already updated.");

  if (booking.status === "confirmed") {
    try {
      const ctx = await documentContext();
      await sendEmail({
        to: booking.traveller_email,
        ...cancellationEmail(ctx.site, ctx.rules, updated[0] as unknown as BookingRow, refunded),
      });
    } catch (emailError) {
      console.error("Cancellation email failed", booking.ref, emailError);
    }
  }
  return { refunded };
}

/**
 * Razorpay tells us (webhook) that a refund it accepted later failed, for example the customer's card was closed.
 * The payment goes back to "paid" so the owner sees it in Admin > Payments and can refund it by hand from the Razorpay dashboard.
 */
export async function markRefundFailed(refundId: string, razorpayPaymentId: string) {
  console.error("REFUND FAILED at Razorpay: refund it manually from the Razorpay dashboard", { refundId, razorpayPaymentId });
  await db().from("payments").update({ status: "paid", refund_id: null }).eq("razorpay_payment_id", razorpayPaymentId).eq("refund_id", refundId).eq("status", "refunded");
}

/** Marks a Razorpay payment attempt as failed (webhook). Never touches a paid payment. */
export async function markPaymentFailed(orderId: string) {
  await db().from("payments").update({ status: "failed" }).eq("razorpay_order_id", orderId).eq("status", "created");
}

/* ------------------------------------------------------------------ */
/* Phone bookings: the owner enters a booking taken over a call / WhatsApp */
/* ------------------------------------------------------------------ */

export type PhoneBookingInput = {
  tripType: "one_way" | "round_trip";
  from: string;
  to: string;
  date: string;
  time: string;
  returnDate: string | null;
  passengers: number;
  bags: number;
  vehicle: string;
  pickupAddress: string;
  dropAddress: string;
  name: string;
  phone: string;
  /** Empty when the customer has no email: the booking is kept under a placeholder address and no emails are sent. */
  email: string;
  /** Fare before GST, in paise. Empty/0 means "work it out": from the distance, or from a listed route's price. */
  customFare: number;
  /** Distance in km (one way) typed by the owner; 0 = work it out from the road between the two places. */
  distanceKm: number;
  /** Money already collected by hand (cash / UPI / bank), in paise, and how. */
  received: number;
  method: "cash" | "upi" | "bank";
  note: string;
  /** Book even when the owner's vehicle count says every one is taken. */
  allowFull: boolean;
  sendEmail: boolean;
};

export const PHONE_EMAIL_DOMAIN = "phone-booking.invalid";

/* ---- phone booking fare: the owner's price, else by distance (typed km or road distance), else a listed route ---- */

/** Driving time for km typed by hand: about 50 km an hour on the road. */
const hoursForKm = (km: number) => Math.max(0.5, Math.round((km / 50) * 10) / 10);

export type PhoneFareSource = "custom" | "manual_km" | "distance" | "listed";
type PhoneFare = { source: PhoneFareSource; baseFare: number; routeId: string | null; durationHours: number | null; fare?: RouteFare };
type PhoneFareInput = Pick<PhoneBookingInput, "tripType" | "from" | "to" | "date" | "returnDate" | "vehicle" | "customFare" | "distanceKm">;

async function resolvePhoneFare(input: PhoneFareInput): Promise<PhoneFare> {
  const trip: DistanceTrip = { tripType: input.tripType, from: input.from, to: input.to, stops: [], date: input.date, returnDate: input.tripType === "round_trip" ? input.returnDate : null };
  const mine = (list: RouteFare[] | null | undefined) => list?.find((fare) => fare.vehicle === input.vehicle);

  // the owner typed the price: it is used as it is (a listed route only supplies the route id and the trip length)
  if (input.customFare > 0) {
    const listed = mine(await searchOutstationFaresPublic(input.from, input.to, input.tripType));
    return { source: "custom", baseFare: input.customFare, routeId: listed?.routeId || null, durationHours: listed?.durationHours || (input.distanceKm > 0 ? hoursForKm(input.distanceKm) : null) };
  }

  // by distance: the km typed by the owner (no map needed), or the road distance between the two places
  const byKm =
    input.distanceKm > 0
      ? await faresForRoute({ distanceKm: input.distanceKm, durationHours: hoursForKm(input.distanceKm), from: input.from, to: input.to }, trip)
      : await distanceFares(trip);
  const fare = mine(byKm ? await withDriverAllowance(byKm, trip) : null);
  if (fare) return { source: input.distanceKm > 0 ? "manual_km" : "distance", baseFare: fare.fare, routeId: null, durationHours: fare.durationHours || null, fare };

  // a route the owner priced by hand (used when the distance could not be worked out)
  const listed = mine(await withDriverAllowance(await searchOutstationFaresPublic(input.from, input.to, input.tripType), trip));
  if (listed) return { source: "listed", baseFare: listed.fare, routeId: listed.routeId || null, durationHours: listed.durationHours || null, fare: listed };

  throw new HttpError(
    400,
    byKm
      ? "This vehicle has no rate per km yet. Set it in Fleet, or enter the fare you agreed with the customer."
      : "The distance between these places could not be worked out. Type the km yourself, or enter the fare you agreed with the customer.",
  );
}

/** One line for the internal note of the booking: how the fare was made, since a booking does not keep the km. */
function describePhoneFare(resolved: PhoneFare): string {
  if (resolved.source === "custom") return "Fare: price typed by staff.";
  if (resolved.source === "listed") return "Fare: listed route price.";
  const b = resolved.fare?.breakup;
  if (!b) return "";
  const where = resolved.source === "manual_km" ? `${b.km} km (typed by staff)` : `${b.km} km by road`;
  const extra = [
    b.returnPercent > 0 ? `+${b.returnPercent}% one-way return` : "",
    b.toll > 0 ? `toll Rs ${b.toll / 100} (Google estimate, FASTag)` : "",
    resolved.fare?.allowance ? `driver allowance Rs ${resolved.fare.allowance / 100}` : "",
  ].filter(Boolean);
  return `Fare by distance: ${where}, ${b.billedKm} km billed at Rs ${b.ratePerKm}/km${extra.length ? `, ${extra.join(", ")}` : ""}.`;
}

export type PhoneFarePreview = {
  source: PhoneFareSource;
  /** Paise. */
  baseFare: number;
  gst: number;
  total: number;
  breakup?: FareBreakup;
  matched?: { from: string; to: string };
  allowance?: number;
  allowanceDays?: number;
};

/** What the booking would cost for these details, shown to the owner before the booking is created. */
export async function previewPhoneFare(input: PhoneFareInput): Promise<PhoneFarePreview> {
  const settings = await getBookingSettings();
  if (!(await getFleet()).some((item) => item.title === input.vehicle)) throw new HttpError(400, "Choose one of your vehicles.");
  const resolved = await resolvePhoneFare(input);
  const quote = buildQuote({ baseFare: resolved.baseFare, addons: 0, discount: 0, serviceFee: 0, withInsurance: false, payMode: "full" }, settings);
  return {
    source: resolved.source,
    baseFare: quote.baseFare,
    gst: quote.gst,
    total: quote.total,
    breakup: resolved.fare?.breakup,
    matched: resolved.fare?.matched,
    allowance: resolved.fare?.allowance,
    allowanceDays: resolved.fare?.allowanceDays,
  };
}

/** A confirmed booking made by the owner. Returns the new booking id. */
export async function createPhoneBooking(input: PhoneBookingInput): Promise<{ id: string; ref: string; emailed: boolean }> {
  const settings = await getBookingSettings();
  const vehicle = (await getFleet()).find((item) => item.title === input.vehicle);
  if (!vehicle) throw new HttpError(400, "Choose one of your vehicles.");
  if (input.passengers > vehicle.capacity) throw new HttpError(400, `${vehicle.title} seats up to ${vehicle.capacity} passengers.`);
  if (Number.isNaN(departureAt(input.date, input.time).getTime())) throw new HttpError(400, "Enter a valid date and time.");
  if (input.tripType === "round_trip" && (!input.returnDate || input.returnDate < input.date)) throw new HttpError(400, "Choose a return date on or after the travel date.");

  // the fare: the price the owner typed, else km x the vehicle's rate (typed km or road distance), else a listed route's price
  const resolved = await resolvePhoneFare(input);
  const { routeId, baseFare, durationHours } = resolved;

  if (vehicle.count && vehicle.count > 0 && !input.allowFull) {
    const busy = await busyVehicles({ travel_date: input.date, travel_time: input.time, return_date: input.tripType === "round_trip" ? input.returnDate : null, hours: durationHours });
    if (isFullyBooked(vehicle, busy, vehicle.title)) {
      throw new HttpError(409, `${vehicle.title} is already booked for that time (you have ${vehicle.count}). Tick "Book anyway" to override.`);
    }
  }

  const quote = buildQuote({ baseFare, addons: 0, discount: 0, serviceFee: 0, withInsurance: false, payMode: "full" }, settings);
  if (input.received > quote.total) throw new HttpError(400, `The amount received cannot be more than the total fare of ${formatINR(quote.total)}.`);

  // the customer: found by email (or a placeholder when there is none)
  const hasEmail = !!input.email;
  const email = hasEmail ? input.email : `${input.phone}@${PHONE_EMAIL_DOMAIN}`;
  const { data: customer, error: customerError } = await db().from("customers").upsert({ email }, { onConflict: "email" }).select("id, name, phone, blocked").single();
  if (customerError) throw customerError;
  if (customer.blocked) throw new HttpError(403, "This customer is blocked. Unblock them first (Admin > Customers) to enter a booking.");
  const fill: Record<string, string> = {};
  if (!customer.name) fill.name = input.name.slice(0, 80);
  if (!customer.phone) fill.phone = input.phone;
  if (Object.keys(fill).length) await db().from("customers").update({ ...fill, updated_at: new Date().toISOString() }).eq("id", customer.id);

  const paidAll = input.received >= quote.total;
  let booking: BookingRow | null = null;
  for (let attempt = 0; attempt < 4 && !booking; attempt += 1) {
    const { data, error } = await db()
      .from("bookings")
      .insert({
        ref: makeRef(),
        customer_id: customer.id,
        route_id: routeId,
        trip_type: input.tripType,
        from_city: input.from,
        to_city: input.to,
        pickup_address: input.pickupAddress,
        drop_address: input.dropAddress,
        stops: "",
        gst_company: "",
        gstin: "",
        travel_date: input.date,
        travel_time: input.time,
        return_date: input.tripType === "round_trip" ? input.returnDate : null,
        passengers: input.passengers,
        bags: input.bags,
        vehicle_type: vehicle.title,
        traveller_name: input.name,
        traveller_gender: "",
        traveller_phone: input.phone,
        traveller_email: email,
        base_fare: quote.baseFare,
        addons_total: 0,
        addons: "",
        coupon_code: "",
        discount: 0,
        service_fee: 0,
        gst: quote.gst,
        insurance: 0,
        total: quote.total,
        pay_mode: paidAll ? "full" : "part",
        advance_due: input.received > 0 ? input.received : quote.total,
        terms_accepted_at: new Date().toISOString(),
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        source: "phone",
        admin_note: [input.note, describePhoneFare(resolved)].filter(Boolean).join("\n").slice(0, 1000),
      })
      .select(BOOKING_COLUMNS)
      .single();
    if (error && error.code !== "23505") throw error;
    booking = (data as unknown as BookingRow) ?? null;
  }
  if (!booking) throw new Error("Could not allocate a booking reference");

  if (input.received > 0) {
    const { error: payError } = await db().from("payments").insert({
      booking_id: booking.id,
      kind: paidAll ? "full" : "advance",
      amount: input.received,
      // "offline_" marks money the owner collected by hand: Razorpay is not involved, so a cancellation refund must be paid back by hand too
      razorpay_order_id: `offline_${input.method}_${booking.ref}_${randomInt(1000, 9999)}`,
      status: "paid",
      paid_at: new Date().toISOString(),
    });
    if (payError) {
      await db().from("bookings").delete().eq("id", booking.id);
      throw payError;
    }
  }

  const emailed = hasEmail && input.sendEmail ? await sendConfirmation(booking) : false;
  return { id: booking.id, ref: booking.ref, emailed };
}
