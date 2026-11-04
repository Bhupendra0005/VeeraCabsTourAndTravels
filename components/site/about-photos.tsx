"use client";

import { MapPin } from "lucide-react";
import { useEffect, useState } from "react";

const photos = [
  {
    key: "airport",
    src: "/about-airport-960.webp",
    srcSet:
      "/about-airport-640.webp 640w, /about-airport-960.webp 960w, /about-airport-1254.webp 1254w",
    alt: "A white Veera Tours & Travels MPV on a mountain road at sunset beside an airport",
  },
  {
    key: "ghat",
    src: "/about-ghat-960.webp",
    srcSet:
      "/about-ghat-640.webp 640w, /about-ghat-960.webp 960w, /about-ghat-1254.webp 1254w",
    alt: "A black Veera Tours & Travels SUV on a ghat road below a hill fort at sunset",
  },
  {
    key: "hills",
    src: "/about-hills-960.webp",
    srcSet:
      "/about-hills-640.webp 640w, /about-hills-960.webp 960w, /about-hills-1254.webp 1254w",
    alt: "A silver Veera Tours & Travels MPV on a misty hill road beside waterfalls",
  },
];

const INTERVAL = 4500;

/**
 * Three tilted photo cards that keep trading places: the front card drops to
 * the back, the next one comes forward. Pauses on hover/focus and when the
 * visitor prefers reduced motion; the dots let people pick a photo.
 */
export function AboutPhotos() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // `active` is a dependency so a manual pick restarts the countdown
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % photos.length);
    }, INTERVAL);
    return () => window.clearInterval(timer);
  }, [paused, active]);

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
          const slot = (index - active + photos.length) % photos.length;
          return (
            <div
              key={photo.key}
              className={`about-card about-slot-${slot}`}
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

        <span className="about-badge">
          <MapPin aria-hidden="true" />
          Based in Pune · Serving all India
        </span>
      </div>

      <div className="about-dots" role="group" aria-label="Choose a photo">
        {photos.map((photo, index) => (
          <button
            type="button"
            key={photo.key}
            className={`about-dot${index === active ? " is-active" : ""}`}
            aria-label={`Show photo ${index + 1}`}
            aria-current={index === active ? "true" : undefined}
            onClick={() => setActive(index)}
          />
        ))}
      </div>
    </div>
  );
}
