"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ReviewCard } from "@/components/site/review-card";
import type { PublicReview } from "@/lib/booking/reviews";

/** How long a review stays before the row moves on. */
const INTERVAL_MS = 4500;

/**
 * The home page reviews as a row that moves by itself, one card at a time, and starts again from the first after the last.
 * It stops while the visitor points at it, touches it or tabs into it, and never moves for people who asked their device for less
 * motion. The arrows and a swipe work as well; a link goes on to the page with every review.
 */
export function ReviewsCarousel({ reviews }: { reviews: PublicReview[] }) {
  const track = useRef<HTMLUListElement>(null);
  const [paused, setPaused] = useState(false);

  const step = useCallback((direction: 1 | -1) => {
    const el = track.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 4) return; // everything is already in view
    const distance = first.offsetWidth + (Number.parseFloat(getComputedStyle(el).columnGap) || 18);
    const atEnd = el.scrollLeft >= max - 4;
    const atStart = el.scrollLeft <= 4;
    const left =
      direction === 1 ? (atEnd ? 0 : Math.min(max, el.scrollLeft + distance)) : atStart ? max : Math.max(0, el.scrollLeft - distance);
    el.scrollTo({ left, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (paused || reviews.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => step(1), INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [paused, reviews.length, step]);

  return (
    <div
      className={`reviews-carousel${reviews.length <= 3 ? " reviews-carousel--few" : ""}`}
      role="region"
      aria-roledescription="carousel"
      aria-label="Customer reviews"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <ul className="reviews-track" ref={track}>
        {reviews.map((review, index) => (
          <ReviewCard key={`${review.date}-${index}`} review={review} />
        ))}
      </ul>
      <div className="reviews-bar">
        <Link className="btn btn-ghost" href="/reviews">
          View all reviews <ArrowRight aria-hidden="true" />
        </Link>
        <div className="reviews-arrows">
          <button type="button" aria-label="Previous reviews" onClick={() => step(-1)}>
            <ChevronLeft aria-hidden="true" />
          </button>
          <button type="button" aria-label="Next reviews" onClick={() => step(1)}>
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
