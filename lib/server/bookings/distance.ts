import "server-only";
import { headers } from "next/headers";
import { normalise } from "@/lib/booking/place-match";
import { getBookingPage } from "@/lib/server/cms/content";

/**
 * Road distance between places typed by the customer, for outstation fares worked out per kilometre.
 *  1. Each place is turned into coordinates with Google Places Text Search (it understands temples, airports and areas, not just addresses).
 *  2. The Google Routes API gives the driving distance and time through all of them.
 * Both use a key that stays on the server (GOOGLE_MAPS_SERVER_KEY, or NEXT_PUBLIC_GOOGLE_MAPS_KEY as a fallback).
 * The customer's browser only ever sends the place names: coordinates and distance are always worked out here, so
 * the fare cannot be influenced from the browser. Without a key the feature is off and fixed route fares stay in use.
 */

const GEOCODE = "https://places.googleapis.com/v1/places:searchText";
const ROUTES = "https://routes.googleapis.com/directions/v2:computeRoutes";
// Where the business is (Pune). A name like "Shirdi Sai Baba Temple" exists in many states: places near here win.
const BIAS = { lat: 18.5204, lon: 73.8567 };

const googleKey = () => process.env.GOOGLE_MAPS_SERVER_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";

/**
 * One key for everything: the browser key is limited to the website's address (HTTP referrer), so when it is used from the server
 * the website's address is sent along (GOOGLE_MAPS_REFERER, default NEXT_PUBLIC_SITE_URL). A separate server key needs none.
 */
function googleHeaders(key: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json", "X-Goog-Api-Key": key };
  if (!process.env.GOOGLE_MAPS_SERVER_KEY) {
    const referer = process.env.GOOGLE_MAPS_REFERER || process.env.NEXT_PUBLIC_SITE_URL;
    if (referer) headers.Referer = `${referer.replace(/\/+$/, "")}/`;
  }
  return headers;
}

export const MAX_PLACES = 5; // from + up to 3 stops + to
const MAX_PLACE_LENGTH = 100;
const CACHE_MS = 12 * 3_600_000;
const CACHE_LIMIT = 2000;

export type RoadRoute = {
  distanceKm: number;
  durationHours: number;
  /** The places the lookup actually found for the first and the last point, so the customer can see what the fare is based on. */
  from: string;
  to: string;
  /**
   * Toll Google expects along the route for a car with FASTag, one way, in whole rupees: 0 = no toll on the route,
   * undefined = not asked for, or Google knows there are tolls but not their price.
   */
  tollRupees?: number;
};

/** Whether the owner wants the toll in one-way fares (asking Google for it costs more per lookup, so only then). */
async function wantsToll(): Promise<boolean> {
  try {
    return (await getBookingPage()).oneWayToll !== false;
  } catch {
    return false;
  }
}

type GoogleMoney = { currencyCode?: string; units?: string | number; nanos?: number };

/** Rupees from Google's toll info: absent = no toll expected; present without an INR price = unknown. */
function tollFrom(info: { estimatedPrice?: GoogleMoney[] } | undefined): number | undefined {
  if (!info) return 0;
  const inr = (info.estimatedPrice ?? []).filter((price) => price.currencyCode === "INR");
  if (inr.length === 0) return undefined;
  const rupees = inr.reduce((sum, price) => sum + Number(price.units ?? 0) + Number(price.nanos ?? 0) / 1e9, 0);
  return Number.isFinite(rupees) && rupees >= 0 ? Math.round(rupees) : undefined;
}

/** True when a Google Maps key is configured on the server. */
export const distanceConfigured = () => !!googleKey();

/** Outstation fares are worked out per km when the owner switched it on (Online booking) and a routing key exists. */
export async function pricedByDistance(): Promise<boolean> {
  if (!distanceConfigured()) return false;
  try {
    return (await getBookingPage()).distancePricing !== false;
  } catch {
    return false;
  }
}

/* ------------------------------ small cache ------------------------------ */

const cache = new Map<string, { value: unknown; until: number }>();

function remember<T>(key: string, value: T): T {
  if (cache.size >= CACHE_LIMIT) {
    const now = Date.now();
    for (const [k, v] of cache) if (v.until < now) cache.delete(k);
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  }
  cache.set(key, { value, until: Date.now() + CACHE_MS });
  return value;
}

function recall<T>(key: string): { value: T } | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.until < Date.now()) {
    cache.delete(key);
    return null;
  }
  return { value: hit.value as T };
}

/* ----------------------- limit on uncached lookups ----------------------- */

// A search for a route nobody asked before costs a few outside requests, and the free routing quota is limited per day:
// one visitor may start only so many new lookups (best effort, per server instance).
const WINDOW_MS = 10 * 60_000;
const MAX_NEW_LOOKUPS = 30;
const lookups = new Map<string, { count: number; reset: number }>();

async function allowNewLookup(): Promise<boolean> {
  let who = "unknown";
  try {
    who = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  } catch {
    return true; // not inside a request (scripts, tests)
  }
  const now = Date.now();
  const entry = lookups.get(who);
  if (!entry || entry.reset < now) {
    if (lookups.size > 5000) for (const [k, v] of lookups) if (v.reset < now) lookups.delete(k);
    lookups.set(who, { count: 1, reset: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_NEW_LOOKUPS;
}

/* -------------------------------- geocoding -------------------------------- */

type Point = { lat: number; lng: number };
type Found = { point: Point; label: string };

/** Throws when Google is unreachable or the key is refused (so a temporary failure is not remembered as "no such place"). */
async function googleGeocode(place: string, key: string): Promise<Found | null> {
  const res = await fetch(GEOCODE, {
    method: "POST",
    headers: { ...googleHeaders(key), "X-Goog-FieldMask": "places.location,places.formattedAddress,places.displayName" },
    body: JSON.stringify({
      textQuery: place,
      regionCode: "IN",
      languageCode: "en",
      pageSize: 1,
      locationBias: { circle: { center: { latitude: BIAS.lat, longitude: BIAS.lon }, radius: 50000 } },
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`geocoder ${res.status}`);
  const data = (await res.json()) as {
    places?: { formattedAddress?: string; displayName?: { text?: string }; location?: { latitude?: unknown; longitude?: unknown } }[];
  };
  const first = data.places?.[0]; // no match: Google answers {} (not an error)
  const lat = Number(first?.location?.latitude);
  const lng = Number(first?.location?.longitude);
  if (!first || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const name = (first.displayName?.text || "").trim();
  const address = (first.formattedAddress || "").trim();
  const label = name && !address.toLowerCase().startsWith(name.toLowerCase()) ? [name, address].filter(Boolean).join(", ") : address || name || place;
  return { point: { lat, lng }, label };
}

async function geocode(place: string, key: string): Promise<Found | null> {
  const cacheKey = `geo:${normalise(place)}`;
  const hit = recall<Found | null>(cacheKey);
  if (hit) return hit.value;
  try {
    return remember(cacheKey, await googleGeocode(place, key)); // a place that does not exist is also worth remembering
  } catch (error) {
    console.error("Geocoding failed", error instanceof Error ? error.message : error);
    return null; // a temporary failure is not remembered
  }
}

/* --------------------------------- routing --------------------------------- */

const waypoint = ({ lat, lng }: Point) => ({ location: { latLng: { latitude: lat, longitude: lng } } });

/**
 * Driving distance and time from the first place to the last, through the places in between (stops).
 * Returns null when a place cannot be found, Google is down or not configured, or there were too many lookups.
 */
export async function roadRoute(places: string[]): Promise<RoadRoute | null> {
  const key = googleKey();
  const names = places.map((place) => place.trim()).filter(Boolean);
  if (!key || names.length < 2 || names.length > MAX_PLACES || names.some((name) => name.length < 2 || name.length > MAX_PLACE_LENGTH)) return null;

  const withToll = await wantsToll();
  const routeKey = `route:${withToll ? "toll:" : ""}${names.map(normalise).join("|")}`;
  const hit = recall<RoadRoute | null>(routeKey);
  if (hit) return hit.value;
  if (!(await allowNewLookup())) {
    console.error("Too many new distance lookups from one visitor");
    return null;
  }

  const found: Found[] = [];
  for (const name of names) {
    const place = await geocode(name, key);
    if (!place) return null;
    found.push(place);
  }

  try {
    const res = await fetch(ROUTES, {
      method: "POST",
      headers: {
        ...googleHeaders(key),
        "X-Goog-FieldMask": withToll ? "routes.distanceMeters,routes.duration,routes.travelAdvisory.tollInfo" : "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify({
        origin: waypoint(found[0].point),
        destination: waypoint(found[found.length - 1].point),
        intermediates: found.slice(1, -1).map((place) => waypoint(place.point)),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        regionCode: "IN",
        units: "METRIC",
        // the cabs have FASTag: without it Google quotes the cash rate, which is double
        ...(withToll ? { extraComputations: ["TOLLS"], routeModifiers: { vehicleInfo: { emissionType: "DIESEL" }, tollPasses: ["IN_FASTAG"] } } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`routing ${res.status}`);
    const data = (await res.json()) as {
      routes?: { distanceMeters?: unknown; duration?: unknown; travelAdvisory?: { tollInfo?: { estimatedPrice?: GoogleMoney[] } } }[];
    };
    const route = data.routes?.[0];
    const meters = Number(route?.distanceMeters);
    const seconds = parseFloat(String(route?.duration ?? "")); // "12345s"
    if (!Number.isFinite(meters) || !Number.isFinite(seconds) || meters < 1000) return null; // under 1 km is not an outstation trip
    return remember(routeKey, {
      distanceKm: Math.round(meters / 1000),
      durationHours: Math.max(0.5, Math.round((seconds / 3600) * 10) / 10),
      from: found[0].label,
      to: found[found.length - 1].label,
      tollRupees: withToll ? tollFrom(route?.travelAdvisory?.tollInfo) : undefined,
    });
  } catch (error) {
    console.error("Routing failed", error instanceof Error ? error.message : error);
    return null;
  }
}
