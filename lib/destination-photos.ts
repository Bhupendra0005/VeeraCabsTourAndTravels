import { existsSync } from "node:fs";
import path from "node:path";

const PHOTO_EXTENSIONS = ["webp", "jpg", "jpeg", "png"];

/**
 * Looks for `public/destinations/<slug>.<ext>`. Drop a photo of the place there,
 * named after the destination's slug, and its pages pick it up automatically.
 */
export function findPhoto(slug: string): string | undefined {
  for (const ext of PHOTO_EXTENSIONS) {
    const file = path.join(process.cwd(), "public", "destinations", `${slug}.${ext}`);
    if (existsSync(file)) return `/destinations/${slug}.${ext}`;
  }
  return undefined;
}

/** Scenic stand-ins used until a photo of the actual place is added. */
export const CATEGORY_PHOTOS: Record<string, string[]> = {
  "hill-station": ["/hero-lake-1200.webp", "/hero-pune-1200.webp"],
  temple: ["/tour-temple-1200.webp", "/hero-palace-1200.webp"],
  beach: ["/tour-beach-1200.webp"],
  city: ["/hero-pune-1200.webp", "/hero-palace-1200.webp", "/hero-lake-1200.webp"],
};

/** Hero banner per category: files `<base>-800/1200/1600.webp` in /public. */
export const CATEGORY_HERO: Record<string, string> = {
  "hill-station": "hero-lake",
  temple: "hero-palace",
  beach: "tour-beach",
  city: "hero-pune",
};

/** "June to September for waterfalls; ..." becomes "June to September". */
export function shortSeason(text: string) {
  return text.split(/;| for | with |, | \(/)[0].trim();
}
