"use client";

import { MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import type { AboutPhoto } from "@/lib/cms/about-photos";

const INTERVAL = 4500;

/**
 * Tilted photo cards that keep trading places: the front card drops to
 * the back, the next one comes forward. Pauses on hover/focus and when the
 * visitor prefers reduced motion; the dots let people pick a photo.
 * The photos and the badge text come from Admin > Pages > About page.
 */
export function AboutPhotos({ photos, badge }: { photos: AboutPhoto[]; badge: string }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = photos.length;

  useEffect(() => {
    if (paused || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // `active` is a dependency so a manual pick restarts the countdown
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % count);
    }, INTERVAL);
    return () => window.clearInterval(timer);
  }, [paused, active, count]);

  if (count === 0) return null;
  // the owner may have removed photos since the last visit: never point at one that is gone
  const front = Math.min(active, count - 1);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="about-stack">
        {photos.map((photo, index) => {
          // 0 = front, 1 = back right, 2 = back left
          const slot = (index - front + count) % count;
          return (
            <div
              key={photo.key}
              className={`about-card about-slot-${Math.min(slot, 2)}`}
              aria-hidden={slot !== 0}
              onClick={slot === 0 ? undefined : () => setActive(index)}
            >
              <img
                src={photo.src}
                srcSet={photo.srcSet}
                sizes="(max-width: 900px) 90vw, 45vw"
                width={960}
                height={960}
                alt={photo.alt}
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                draggable={false}
              />
            </div>
          );
        })}

        {badge ? (
          <span className="about-badge">
            <MapPin aria-hidden="true" />
            {badge}
          </span>
        ) : null}
      </div>

      {count > 1 ? (
        <div className="about-dots" role="group" aria-label="Choose a photo">
          {photos.map((photo, index) => (
            <button
              type="button"
              key={photo.key}
              className={`about-dot${index === front ? " is-active" : ""}`}
              aria-label={`Show photo ${index + 1}`}
              aria-current={index === front ? "true" : undefined}
              onClick={() => setActive(index)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
