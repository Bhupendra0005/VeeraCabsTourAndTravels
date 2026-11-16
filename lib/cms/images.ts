/** Helpers for images that are either a built-in /public photo or an owner-uploaded ImageKit URL. */

/** Adds an ImageKit resize + auto-format transformation. Non-ImageKit URLs are returned unchanged. */
export function ikUrl(url: string, width: number): string {
  if (!url.includes("imagekit.io")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}tr=w-${width},q-80,f-auto`;
}

/** A vehicle added in the admin without a photo shows this built-in car instead of a broken image. */
const FALLBACK_PHOTO = "fleet-sedan";

type Photo = { image?: string; photo: string };

/** Fleet / service photo at a standard width: the uploaded image if set, else the built-in one. */
export function photoSrc(item: Photo, width: 480 | 800): string {
  return item.image ? ikUrl(item.image, width) : `/${item.photo || FALLBACK_PHOTO}-${width}.webp`;
}

export function photoSrcSet(item: Photo): string | undefined {
  const base = item.photo || FALLBACK_PHOTO;
  return item.image ? `${ikUrl(item.image, 480)} 480w, ${ikUrl(item.image, 800)} 800w` : `/${base}-480.webp 480w, /${base}-800.webp 800w`;
}
