/**
 * Shared (browser and server) rules for turning an address a customer typed into places the map knows.
 * Used by the address suggestions (/api/places) and by the distance lookup, so both treat an address the same way.
 */

/** "  Koregaon  Park, Pune " -> "koregaon park, pune": the same place typed slightly differently shares one lookup. */
export const normalise = (text: string) => text.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

/** Lower case, letters and digits only, single spaces: for comparing a typed word with a place name. */
const plain = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Words that describe a spot, not a town: "railway station" must never fall back to a place called "Station". */
const GENERIC_WORDS = new Set([
  "station", "road", "chowk", "nagar", "colony", "temple", "mandir", "hospital", "market", "stand", "school", "college", "park", "gate", "circle",
  "society", "apartment", "apartments", "tower", "towers", "building", "bazar", "bazaar", "hotel", "airport", "square", "lane", "street", "plaza",
  "mall", "complex", "chawl", "wadi", "vasti", "phase", "sector", "block", "tank", "bridge", "highway", "city", "village", "area", "near", "opposite",
]);

/**
 * The queries to try for one typed address, most exact first.
 *  - With commas ("Flat 302, Sai Residency, Kothrud, Pune 411038"): a full address is rarely in the map, so if it is not found
 *    the house / building part in front is dropped step by step until an area is found.
 *  - Without commas ("quarsi aligarh"): people often leave them out, so the last word is tried as the town.
 * A PIN code is left out: it only confuses the lookup.
 */
export function queriesFor(place: string): string[] {
  const parts = normalise(place)
    .replace(/\b\d{6}\b/g, " ")
    .split(",")
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const out: string[] = [];
  for (let drop = 0; drop < parts.length && drop < 3; drop += 1) {
    const query = parts.slice(drop).join(", ");
    if (query.length >= 3 && !out.includes(query)) out.push(query);
  }
  if (parts.length === 1) {
    const words = parts[0].split(" ").filter(Boolean);
    const last = words[words.length - 1] ?? "";
    if (words.length >= 2 && last.length >= 4 && !GENERIC_WORDS.has(last) && !out.includes(last)) out.push(last);
  }
  return out;
}

/**
 * A place typed as "Monal Park, Hadapsar, Pune" must come back as somewhere in Hadapsar or Pune. The geocoder also matches
 * loosely ("Monali Park", 25 km away, in another city), so with more than one part the match has to mention at least one of the
 * later parts, otherwise it is rejected and a shorter query ("Hadapsar, Pune") is tried. One-part places ("Shirdi") cannot be checked.
 */
export function mentionsLaterPart(query: string, label: string): boolean {
  const later = query
    .split(",")
    .slice(1)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);
  if (later.length === 0) return true;
  // whole words only: "pune" must not match "Puneeth Rajkumar Park" in Karnataka
  const words = ` ${plain(label)} `;
  return later.some((part) => words.includes(` ${plain(part)} `));
}

/**
 * Whether a place found for `variant` (one of queriesFor(original)) may be used for what the customer typed.
 * The exact text and comma versions are checked with mentionsLaterPart. A last-word fallback ("aligarh" out of
 * "quarsi aligarh") has nothing later to check, so the place found must really be called that.
 */
export function acceptsVariant(original: string, variant: string, label: string): boolean {
  const exact = normalise(original).replace(/\b\d{6}\b/g, " ").replace(/\s+/g, " ").trim();
  if (variant === exact || original.includes(",")) return mentionsLaterPart(variant, label);
  const name = plain(label.split(",")[0] ?? "");
  return name === plain(variant);
}
