import { initialsOf } from "@/lib/booking/reviews";

/**
 * The round picture next to a review: the reviewer's photo when there is one, otherwise the initials of the name
 * ("Shikha B." -> "SB"). The caller sets the size and colours with `className`.
 */
export function ReviewAvatar({ name, url, className }: { name: string; url?: string; className?: string }) {
  const src = url ? (url.includes("imagekit.io") ? `${url}${url.includes("?") ? "&" : "?"}tr=w-128,h-128,c-at_max` : url) : "";
  return (
    <span className={className} aria-hidden="true">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={64} height={64} loading="lazy" decoding="async" />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}
