import { ikUrl } from "@/lib/cms/images";

/** One photo of the "trading cards" shown next to the story (About page and home page). */
export type AboutPhoto = { key: string; src: string; srcSet?: string; alt: string };

/**
 * The photos edited in Admin > Pages > About page, ready for the page. An uploaded photo is resized by ImageKit;
 * a built-in "/about-xxx-960.webp" one has three ready sizes in /public. A row without a photo is skipped.
 */
export function toAboutPhotos(items: { image: string; alt: string }[]): AboutPhoto[] {
  return items
    .filter((item) => item.image)
    .map((item, index) => {
      const builtIn = /^(\/about-[a-z0-9-]+)-960\.webp$/.exec(item.image);
      return {
        key: `${index}-${item.image}`,
        src: ikUrl(item.image, 960),
        srcSet: item.image.includes("imagekit.io")
          ? `${ikUrl(item.image, 640)} 640w, ${ikUrl(item.image, 960)} 960w, ${ikUrl(item.image, 1254)} 1254w`
          : builtIn
            ? `${builtIn[1]}-640.webp 640w, ${builtIn[1]}-960.webp 960w, ${builtIn[1]}-1254.webp 1254w`
            : undefined,
        alt: item.alt,
      };
    });
}
