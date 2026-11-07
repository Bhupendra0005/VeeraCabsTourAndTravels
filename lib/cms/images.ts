/** Helpers for images that are either a built-in /public photo or an owner-uploaded ImageKit URL. */

/** Adds an ImageKit resize + auto-format transformation. Non-ImageKit URLs are returned unchanged. */
export function ikUrl(url: string, width: number): string {
  if (!url.includes("imagekit.io")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}tr=w-${width},q-80,f-auto`;
}

type Photo = { image?: string; photo: string };

/** Fleet / service photo at a standard width: the uploaded image if set, else the built-in one. */
export function photoSrc(item: Photo, width: 480 | 800): string {
  return item.image ? ikUrl(item.image, width) : `/${item.photo}-${width}.webp`;
}

export function photoSrcSet(item: Photo): string | undefined {
  return item.image ? `${ikUrl(item.image, 480)} 480w, ${ikUrl(item.image, 800)} 800w` : `/${item.photo}-480.webp 480w, /${item.photo}-800.webp 800w`;
}
