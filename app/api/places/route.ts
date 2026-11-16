import { NextResponse } from "next/server";
import { clientIp } from "@/lib/server/core/http";

export const runtime = "nodejs";

/**
 * Free address suggestions for the booking form, with no API key: OpenStreetMap data through Photon.
 * The browser calls this route (not Photon directly) so we can cap the request rate, cache answers and keep the
 * visitor's IP address away from the third party. Set PLACES_API_URL to point at your own Photon server (or a
 * compatible paid one) when traffic grows: the public server is meant for light use.
 */
const UPSTREAM = (process.env.PLACES_API_URL || "https://photon.komoot.io/api/").replace(/\/?$/, "/");
// India only: min_lon, min_lat, max_lon, max_lat
const INDIA = "68.1,6.7,97.4,35.7";

// best-effort limit per visitor (per server instance): 40 lookups a minute
const hits = new Map<string, { count: number; reset: number }>();
const LIMIT = 40;

function allowed(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + 60_000 });
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    return true;
  }
  entry.count += 1;
  return entry.count <= LIMIT;
}

type Feature = { properties?: Record<string, unknown> };

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** "Koregaon Park, Ghorpuri, Pune, Maharashtra" from a Photon result. */
function labelOf(properties: Record<string, unknown>): string {
  const parts = [
    text(properties.name) || [text(properties.housenumber), text(properties.street)].filter(Boolean).join(" "),
    text(properties.district) || text(properties.locality),
    text(properties.city) || text(properties.county),
    text(properties.state),
  ].filter(Boolean);
  return [...new Set(parts)].join(", ");
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.replace(/[\u0000-\u001f]/g, " ").trim() ?? "";
  if (query.length < 3 || query.length > 80) return NextResponse.json({ suggestions: [] });

  if (!allowed(clientIp(request) ?? "unknown")) {
    return NextResponse.json({ suggestions: [], error: "Too many lookups. Please wait a moment." }, { status: 429 });
  }

  try {
    const url = `${UPSTREAM}?q=${encodeURIComponent(query)}&limit=8&lang=en&bbox=${INDIA}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "VeeraToursBooking/1.0", Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = (await res.json()) as { features?: Feature[] };
    const labels = (data.features ?? [])
      .map((feature) => feature.properties ?? {})
      .filter((properties) => text(properties.countrycode).toUpperCase() === "IN")
      .map(labelOf)
      .filter((label) => label.length >= 3);
    const suggestions = [...new Set(labels)].slice(0, 6);
    return NextResponse.json({ suggestions }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (error) {
    // suggestions are a convenience: a failure just means "no suggestions", the customer can still type the address
    console.error("Place suggestions failed", error);
    return NextResponse.json({ suggestions: [] });
  }
}
