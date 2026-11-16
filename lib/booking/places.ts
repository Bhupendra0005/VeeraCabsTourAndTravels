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

async function freeSuggestions(input: string, signal?: AbortSignal): Promise<string[]> {
  const res = await fetch(`/api/places?q=${encodeURIComponent(input)}`, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as { suggestions?: string[] };
  return Array.isArray(data.suggestions) ? data.suggestions : [];
}

/** Up to six address suggestions in India for what the visitor has typed so far. Never throws. */
export async function suggestPlaces(input: string): Promise<string[]> {
  const text = input.trim();
  if (text.length < 3) return [];
  try {
    const found = GOOGLE_KEY ? await googleSuggestions(text) : await freeSuggestions(text);
    return found.slice(0, 6);
  } catch {
    return [];
  }
}
