import { NextResponse } from "next/server";
import { acceptsVariant, queriesFor } from "@/lib/booking/place-match";
import { clientIp } from "@/lib/server/core/http";

export const runtime = "nodejs";

/**
 * Free address suggestions for the booking form, with no API key: OpenStreetMap data through Photon.
 * The browser calls this route (not Photon directly) so we can cap the request rate, cache answers and keep the
 * visitor's IP address away from the third party. Set PLACES_API_URL to point at your own Photon server (or a
 * compatible paid one) when traffic grows: the public server is meant for light use.
 *
 * A long address the map does not know ("Quarsi, Aligarh") gets the nearest place it does know ("Aligarh, Uttar Pradesh")
 * and `kept` holds the words that were left out ("Quarsi"), so the form can keep them when the customer picks that place.
 */
const UPSTREAM = (process.env.PLACES_API_URL || "https://photon.komoot.io/api/").replace(/\/?$/, "/");
// India only: min_lon, min_lat, max_lon, max_lat
const INDIA = "68.1,6.7,97.4,35.7";

// best-effort limit per visitor (per server instance): 90 lookups a minute
const hits = new Map<string, { count: number; reset: number }>();
const LIMIT = 90; // typing one address sends a request per letter

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

/** Up to six place labels in India for one query. Throws when the lookup service fails. */
async function search(query: string): Promise<string[]> {
  const url = `${UPSTREAM}?q=${encodeURIComponent(query)}&limit=8&lang=en&bbox=${INDIA}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "VeeraToursBooking/1.0", Accept: "application/json" },
    signal: AbortSignal.timeout(3000),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const data = (await res.json()) as { features?: Feature[] };
  const labels = (data.features ?? [])
    .map((feature) => feature.properties ?? {})
    .filter((properties) => text(properties.countrycode).toUpperCase() === "IN")
    .map(labelOf)
    .filter((label) => label.length >= 3);
  return [...new Set(labels)].slice(0, 6);
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.replace(/[\u0000-\u001f]/g, " ").trim() ?? "";
  if (query.length < 3 || query.length > 80) return NextResponse.json({ suggestions: [], kept: "" });

  if (!allowed(clientIp(request) ?? "unknown")) {
    return NextResponse.json({ suggestions: [], kept: "", error: "Too many lookups. Please wait a moment." }, { status: 429 });
  }

  try {
    let suggestions = await search(query);
    let kept = "";
    const variants = queriesFor(query).slice(1);
    if (suggestions.length === 0 && variants.length > 0) {
      // nothing for the full address: look for the area part ("Aligarh") and remember the words that were left out ("Quarsi").
      // The shorter versions are asked together, so a slow lookup service costs one wait, not one per version.
      const tries = await Promise.all(
        variants.map(async (variant) => ({
          variant,
          found: (await search(variant).catch(() => [] as string[])).filter((label) => acceptsVariant(query, variant, label)).slice(0, 4),
        })),
      );
      const hit = tries.find((attempt) => attempt.found.length > 0);
      if (hit) {
        suggestions = hit.found;
        // with commas the parts are the pieces between them, without commas the words; the PIN code is not part of either
        const commas = query.includes(",");
        const typed = query.replace(/\b\d{6}\b/g, " ");
        const parts = (commas ? typed.split(",") : typed.split(/\s+/)).map((part) => part.trim()).filter(Boolean);
        const size = (commas ? hit.variant.split(",") : hit.variant.split(/\s+/)).length;
        kept = parts.slice(0, Math.max(0, parts.length - size)).join(commas ? ", " : " ");
      }
    }
    // only an answer with places in it is worth keeping for an hour: an empty one may be a hiccup of the lookup service,
    // and a browser must not hold on to it
    return NextResponse.json({ suggestions, kept }, { headers: { "Cache-Control": suggestions.length > 0 ? "public, max-age=3600" : "no-store" } });
  } catch (error) {
    // suggestions are a convenience: a failure just means "no suggestions", the customer can still type the address
    console.error("Place suggestions failed", error);
    return NextResponse.json({ suggestions: [], kept: "" }, { headers: { "Cache-Control": "no-store" } });
  }
}
