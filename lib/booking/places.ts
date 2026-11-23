/**
 * Address suggestions for the booking form (browser side).
 *
 * Free by default: our own /api/places route (OpenStreetMap data through Photon), no key and no billing.
 * Optional upgrade: set NEXT_PUBLIC_GOOGLE_MAPS_KEY and Google Places API (New) is tried first, the free service is the fallback.
 * That is a browser key by design: restrict it to your website addresses and to "Places API (New)" only in the Google Cloud console.
 */
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
const AUTOCOMPLETE = "https://places.googleapis.com/v1/places:autocomplete";
// Where the business is (Pune): suggestions near here come first, but all of India is still searched.
const BIAS = { latitude: 18.5204, longitude: 73.8567 };

/** Google Places API (New) autocomplete over plain fetch: only that one API has to be allowed on the key (no Maps JavaScript API). Throws on any failure. */
async function googleSuggestions(input: string, signal?: AbortSignal): Promise<string[]> {
  const res = await fetch(AUTOCOMPLETE, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": GOOGLE_KEY ?? "" },
    body: JSON.stringify({
      input,
      includedRegionCodes: ["in"],
      languageCode: "en",
      locationBias: { circle: { center: BIAS, radius: 50000 } },
    }),
    signal,
  });
  if (!res.ok) throw new Error(`places ${res.status}`);
  const data = (await res.json()) as { suggestions?: { placePrediction?: { text?: { text?: string } } }[] };
  return (data.suggestions ?? [])
    .map((item) => item.placePrediction?.text?.text)
    .filter((text): text is string => typeof text === "string" && text.length > 0);
}

async function freeSuggestions(input: string, signal?: AbortSignal): Promise<{ items: string[]; kept: string }> {
  const res = await fetch(`/api/places?v=2&q=${encodeURIComponent(input)}`, { signal });
  if (!res.ok) return { items: [], kept: "" };
  const data = (await res.json()) as { suggestions?: string[]; kept?: string };
  return { items: Array.isArray(data.suggestions) ? data.suggestions : [], kept: typeof data.kept === "string" ? data.kept : "" };
}

/**
 * Up to six address suggestions in India for what the visitor has typed so far. Never throws.
 * `kept` is set when the map did not know the full address: the items are then the nearest known place, and `kept` is the part
 * of the typed address that was left out ("Quarsi"), which the form puts back in front of the place the customer picks.
 */
export async function suggestPlacesDetailed(input: string): Promise<{ items: string[]; kept: string }> {
  const text = input.trim();
  if (text.length < 3) return { items: [], kept: "" };
  try {
    if (GOOGLE_KEY) {
      try {
        const items = (await googleSuggestions(text)).slice(0, 6);
        if (items.length) return { items, kept: "" };
      } catch {
        // key not allowed here, quota used up or offline: fall back to the free suggestions below
      }
    }
    const found = await freeSuggestions(text);
    return { items: found.items.slice(0, 6), kept: found.kept };
  } catch {
    return { items: [], kept: "" };
  }
}

/** Up to six address suggestions in India for what the visitor has typed so far. Never throws. */
export async function suggestPlaces(input: string): Promise<string[]> {
  return (await suggestPlacesDetailed(input)).items;
}
