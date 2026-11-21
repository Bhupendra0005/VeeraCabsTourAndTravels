/**
 * Address suggestions for the booking form (browser side).
 *
 * Free by default: our own /api/places route (OpenStreetMap data through Photon), no key and no billing.
 * Optional upgrade: set NEXT_PUBLIC_GOOGLE_MAPS_KEY and Google Places is used instead. That is a browser key by design:
 * restrict it to your website address and to the Places API only in the Google Cloud console.
 */
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

/* eslint-disable @typescript-eslint/no-explicit-any */
let library: Promise<any> | undefined;

function loadPlaces(): Promise<any> {
  library ??= new Promise((resolve, reject) => {
    const w = window as any;
    if (w.google?.maps?.importLibrary) return resolve(w.google.maps.importLibrary("places"));
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_KEY ?? "")}&loading=async&v=weekly`;
    script.async = true;
    script.onload = () => resolve(w.google.maps.importLibrary("places"));
    script.onerror = () => {
      library = undefined;
      reject(new Error("Google Maps could not be loaded"));
    };
    document.head.appendChild(script);
  });
  return library;
}

async function googleSuggestions(input: string): Promise<string[]> {
  const places = await loadPlaces();
  const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input, includedRegionCodes: ["in"] });
  return (suggestions as any[])
    .map((item) => item.placePrediction?.text?.toString() as string | undefined)
    .filter((text): text is string => !!text);
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
    if (GOOGLE_KEY) return { items: (await googleSuggestions(text)).slice(0, 6), kept: "" };
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
