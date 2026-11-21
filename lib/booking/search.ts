import { TRIP_TYPES, isAirport, isOutstation, type BookingTripType } from "@/lib/booking/config";

/** The trip the visitor searched for. Lives in the URL so results and review pages are shareable. */
export type SearchParams = {
  tripType: BookingTripType;
  from: string;
  to: string;
  date: string;
  time: string; // HH:MM
  returnDate: string;
  passengers: number;
  /** Pieces of luggage; used to pick the right cab and to suggest a roof carrier. */
  bags: number;
  /** Airport transfers: the airport, and the customer's own address in the city. */
  airport: string;
  address: string;
  /** Hourly rentals: the package name ("4 hrs / 40 km"); the city is `from`. */
  pkg: string;
  /** Outstation: extra stops on the way. */
  stops: string[];
};

type Raw = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/** Reads search params defensively: anything malformed falls back to an empty value. */
export function parseSearch(raw: Raw): SearchParams {
  const tripType = first(raw.tripType) as BookingTripType;
  const date = first(raw.date);
  const returnDate = first(raw.returnDate);
  const time = first(raw.time);
  const passengers = Number.parseInt(first(raw.passengers), 10);
  const bags = Number.parseInt(first(raw.bags), 10);
  return {
    tripType: TRIP_TYPES.includes(tripType) ? tripType : "one_way",
    from: first(raw.from).slice(0, 100),
    to: first(raw.to).slice(0, 100),
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
    time: /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : "",
    returnDate: /^\d{4}-\d{2}-\d{2}$/.test(returnDate) ? returnDate : "",
    passengers: Number.isInteger(passengers) && passengers >= 1 && passengers <= 17 ? passengers : 1,
    bags: Number.isInteger(bags) && bags >= 0 && bags <= 20 ? bags : 0,
    airport: first(raw.airport).slice(0, 60),
    address: first(raw.address).slice(0, 120),
    pkg: first(raw.pkg).slice(0, 30),
    // places can contain commas ("Koregaon Park, Pune"), so stops are separated with "|" in the address
    stops: first(raw.stops)
      .split("|")
      .map((stop) => stop.trim().slice(0, 100))
      .filter(Boolean)
      .slice(0, 3),
  };
}

export function isSearchComplete(s: SearchParams): boolean {
  if (!s.date || !s.time) return false;
  if (isOutstation(s.tripType)) return !!(s.from && s.to && (s.tripType === "one_way" || s.returnDate));
  if (isAirport(s.tripType)) return !!(s.airport && s.address);
  return !!(s.from && s.pkg); // hourly rental
}

/** Builds a query string from the search plus any extra keys (routeId, vehicle). Empty values are dropped. */
export function searchToQuery(s: Partial<SearchParams> & { routeId?: string; vehicle?: string }): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(s)) {
    if (Array.isArray(value)) {
      if (value.length) q.set(key, value.join("|"));
    } else if (value !== undefined && value !== "") {
      q.set(key, String(value));
    }
  }
  return q.toString();
}

export function parseVehicle(raw: Raw): string {
  const vehicle = first(raw.vehicle);
  return /^[\w &,.()'-]{2,40}$/.test(vehicle) ? vehicle : "";
}

export function parseRouteId(raw: Raw): string {
  const id = first(raw.routeId);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : "";
}
