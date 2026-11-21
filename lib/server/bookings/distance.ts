import "server-only";
import { headers } from "next/headers";
import { acceptsVariant, normalise, queriesFor } from "@/lib/booking/place-match";
import { getBookingPage } from "@/lib/server/cms/content";

/**
 * Road distance between places typed by the customer, for outstation fares worked out per kilometre.
 *  1. Each place is turned into coordinates with Photon (OpenStreetMap), the same free service that suggests addresses.
 *  2. OpenRouteService gives the driving distance and time through all of them (ORS_API_KEY, server side only).
 * The customer's browser only ever sends the place names: coordinates and distance are always worked out here, so
 * the fare cannot be influenced from the browser. Without ORS_API_KEY the feature is off and fixed route fares stay in use.
 */

const PHOTON = (process.env.PLACES_API_URL || "https://photon.komoot.io/api/").replace(/\/?$/, "/");
const ORS = (process.env.ORS_API_URL || "https://api.openrouteservice.org").replace(/\/+$/, "");
const INDIA = "68.1,6.7,97.4,35.7"; // min_lon, min_lat, max_lon, max_lat
// Where the business is (Pune). A name like "Shirdi Sai Baba Temple" exists in many states: places near here win.
const BIAS = { lat: 18.5204, lon: 73.8567 };

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
};

/** True when a routing key is configured on the server. */
export const distanceConfigured = () => !!process.env.ORS_API_KEY;

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

type Point = [number, number]; // [longitude, latitude]
type Found = { point: Point; label: string };

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** "Taj Lands End, Bandra West, Mumbai, Maharashtra" from a Photon result. */
function labelOf(properties: Record<string, unknown>): string {
  const parts = [
    text(properties.name) || [text(properties.housenumber), text(properties.street)].filter(Boolean).join(" "),
    text(properties.district) || text(properties.locality),
    text(properties.city) || text(properties.county),
    text(properties.state),
  ].filter(Boolean);
  return [...new Set(parts)].join(", ");
}

/** Throws when the geocoder is down (so a temporary failure is not remembered as "no such place"). */
async function photon(query: string, original: string): Promise<Found | null> {
  const url = `${PHOTON}?q=${encodeURIComponent(query)}&limit=5&lang=en&bbox=${INDIA}&lat=${BIAS.lat}&lon=${BIAS.lon}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "VeeraToursBooking/1.0", Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`geocoder ${res.status}`);
  const data = (await res.json()) as { features?: { geometry?: { coordinates?: unknown }; properties?: Record<string, unknown> }[] };
  for (const feature of data.features ?? []) {
    const c = feature.geometry?.coordinates;
    const properties = feature.properties ?? {};
    const inIndia = text(properties.countrycode).toUpperCase() === "IN";
    if (!(inIndia && Array.isArray(c) && typeof c[0] === "number" && typeof c[1] === "number" && Number.isFinite(c[0]) && Number.isFinite(c[1]))) continue;
    const label = labelOf(properties) || query;
    if (acceptsVariant(original, query, label)) return { point: [c[0], c[1]], label };
  }
  return null;
}

async function geocode(place: string): Promise<Found | null> {
  const key = `geo:${normalise(place)}`;
  const hit = recall<Found | null>(key);
  if (hit) return hit.value;
  try {
    for (const query of queriesFor(place)) {
      const found = await photon(query, place);
      if (found) return remember(key, found);
    }
    return remember(key, null); // a place that does not exist is also worth remembering
  } catch (error) {
    console.error("Geocoding failed", error instanceof Error ? error.message : error);
    return null; // a temporary failure is not remembered
  }
}

/* --------------------------------- routing --------------------------------- */

/**
 * Driving distance and time from the first place to the last, through the places in between (stops).
 * Returns null when a place cannot be found, the routing service is down or not configured, or there were too many lookups.
 */
export async function roadRoute(places: string[]): Promise<RoadRoute | null> {
  const key = process.env.ORS_API_KEY;
  const names = places.map((place) => place.trim()).filter(Boolean);
  if (!key || names.length < 2 || names.length > MAX_PLACES || names.some((name) => name.length < 2 || name.length > MAX_PLACE_LENGTH)) return null;

  const routeKey = `route:${names.map(normalise).join("|")}`;
  const hit = recall<RoadRoute | null>(routeKey);
  if (hit) return hit.value;
  if (!(await allowNewLookup())) {
    console.error("Too many new distance lookups from one visitor");
    return null;
  }

  const found: Found[] = [];
  for (const name of names) {
    const place = await geocode(name);
    if (!place) return null;
    found.push(place);
  }
  const points = found.map((place) => place.point);

  try {
    const res = await fetch(`${ORS}/v2/directions/driving-car`, {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/json", Accept: "application/json" },
      // radiuses -1: snap each point to the nearest road however far (a village address can be off the mapped roads)
      body: JSON.stringify({ coordinates: points, radiuses: points.map(() => -1) }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`routing ${res.status}`);
    const data = (await res.json()) as { routes?: { summary?: { distance?: unknown; duration?: unknown } }[] };
    const summary = data.routes?.[0]?.summary;
    const meters = Number(summary?.distance);
    const seconds = Number(summary?.duration);
    if (!Number.isFinite(meters) || !Number.isFinite(seconds) || meters < 1000) return null; // under 1 km is not an outstation trip
    return remember(routeKey, {
      distanceKm: Math.round(meters / 1000),
      durationHours: Math.max(0.5, Math.round((seconds / 3600) * 10) / 10),
      from: found[0].label,
      to: found[found.length - 1].label,
    });
  } catch (error) {
    console.error("Routing failed", error instanceof Error ? error.message : error);
    return null;
  }
}
