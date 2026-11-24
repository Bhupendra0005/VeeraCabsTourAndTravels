import type { BookingTripType } from "@/lib/booking/config";

/** Shared (client + server) maths for outstation fares worked out from the road distance. Money in paise. */

export type OutstationRates = {
  /** Rupees per kilometre. */
  ratePerKm: number;
  /** Round trips are charged at least this many km for every day (a same-day trip too). */
  minKmPerDay: number;
  /** The fare never goes below this (rupees). 0 = no minimum. */
  minFare: number;
};

/** How a distance fare was put together, shown line by line on the review page. The parts add up to the fare (before driver allowance). */
export type FareBreakup = {
  tripType: BookingTripType;
  /** Road distance one way. */
  km: number;
  /** The km the fare was charged for (a round trip counts both ways, a multi-day one has a daily minimum). */
  billedKm: number;
  ratePerKm: number;
  minKmPerDay: number;
  days: number;
  /** Paise: billed km x rate. */
  kmCharge: number;
  /** One-way trips: the share added because the driver drives back empty (percent, and paise). */
  returnPercent: number;
  returnCharge: number;
  /** Paise added to reach the least fare of the vehicle (0 when not needed). */
  minFareTopUp: number;
  /** One-way trips: the expected toll (FASTag) included in the fare, paise (0 = none). */
  toll: number;
};

/** Calendar days a round trip covers, counting both the first and the last day. A bad or missing date counts as one day. */
export function tripDays(date: string, returnDate: string | null | undefined): number {
  if (!returnDate) return 1;
  const start = Date.parse(`${date}T00:00:00Z`);
  const end = Date.parse(`${returnDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 1;
  return Math.min(60, Math.round((end - start) / 86_400_000) + 1);
}

/**
 * Fare of one vehicle for a trip of `distanceKm` (one direction, by road).
 *  - round trip: both directions are driven, and every day of the trip (a same-day trip too) is charged at least minKmPerDay.
 *  - one way: the driver also has to drive back empty, so a share of the fare (oneWayReturnPercent, set in Booking settings)
 *    is added, the same rule the fixed route fares always used.
 * The result is a whole number of rupees, in paise, and `billedKm` is the distance the fare was charged for.
 * `breakup` splits the fare into the lines the customer sees; its parts are whole rupees and add up to `fare`.
 * `tollRupees` (one-way only) is the expected toll for this vehicle; it is added after the least fare, never scaled by the return share.
 */
export function outstationPrice(opts: {
  distanceKm: number;
  tripType: BookingTripType;
  days: number;
  rates: OutstationRates;
  oneWayReturnPercent: number;
  tollRupees?: number;
}): { fare: number; billedKm: number; breakup: FareBreakup } {
  const km = Math.max(0, Math.round(opts.distanceKm));
  const { ratePerKm, minKmPerDay, minFare } = opts.rates;
  const roundTrip = opts.tripType === "round_trip";
  const billedKm = roundTrip ? Math.max(km * 2, Math.max(1, opts.days) * Math.max(0, minKmPerDay)) : km;
  const kmRupees = billedKm * ratePerKm;
  const returnPercent = roundTrip ? 0 : Math.max(0, opts.oneWayReturnPercent);
  const total = Math.round(kmRupees + (kmRupees * returnPercent) / 100);
  const base = Math.max(total, Math.round(Math.max(0, minFare)));
  const kmCharge = Math.round(kmRupees);
  const toll = roundTrip ? 0 : Math.max(0, Math.round(opts.tollRupees ?? 0));
  return {
    fare: (base + toll) * 100,
    billedKm,
    breakup: {
      tripType: opts.tripType,
      km,
      billedKm,
      ratePerKm,
      minKmPerDay,
      days: opts.days,
      kmCharge: kmCharge * 100,
      returnPercent,
      returnCharge: (total - kmCharge) * 100,
      minFareTopUp: (base - total) * 100,
      toll: toll * 100,
    },
  };
}
