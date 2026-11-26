"use client";

import { ArrowRight, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SectionCard } from "@/components/booking/section-card";
import { RATING_WORDS, type PublicReview, type ReviewSummary } from "@/lib/booking/reviews";
import { cn } from "@/lib/utils/cn";

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

const PER_VIEW = 3;
const CHANGE_MS = 5000;
const AVATAR = ["bg-[#1f74ee]", "bg-[#0f9d58]", "bg-[#e8930c]", "bg-[#8b5cf6]", "bg-[#e0483c]", "bg-[#0891b2]"];

/** Every published review (website and owner-added), used when the chosen cab has none of its own yet. */
type AllReviews = { overall: number; count: number; reviews: PublicReview[] };

function RatingBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)_32px] items-center gap-3 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="contents">
        <span className="h-1.5 overflow-hidden rounded-full bg-[#e3e9f2]" aria-hidden="true">
          <span className="block h-full rounded-full bg-[#0b57b7]" style={{ width: `${(Math.min(5, Math.max(0, value)) / 5) * 100}%` }} />
        </span>
        <b className="text-right tabular-nums">{value.toFixed(1)}</b>
      </dd>
    </div>
  );
}

/**
 * "Customer reviews" card of the review-booking page: score banner, driver and cab bars, tag filters and three reviews at a
 * time that change by themselves. Only real reviews are shown: this cab's own, else all published ones (each marked with
 * where it was written), else nothing.
 */
export function CustomerReviews({ summary, reviews, vehicle, all }: { summary: ReviewSummary | null; reviews: PublicReview[]; vehicle: string; all?: AllReviews | null }) {
  const [tag, setTag] = useState("");
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const overall = summary?.overall ?? all?.overall;
  const count = summary?.count ?? all?.count ?? 0;
  const list = summary ? reviews : (all?.reviews ?? []);
  const matching = tag ? list.filter((review) => review.tags.includes(tag)) : list;
  const pages = Math.max(1, Math.ceil(matching.length / PER_VIEW));
  const current = page % pages;

  // moves on by itself; stops while the visitor is reading (pointer or keyboard inside) or asked for less motion
  useEffect(() => {
    if (paused || pages < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => setPage((value) => (value + 1) % pages), CHANGE_MS);
    return () => window.clearTimeout(timer);
  }, [current, pages, paused]);

  if (overall === undefined || count === 0) return null;

  const word = RATING_WORDS[Math.min(5, Math.max(1, Math.round(overall)))];
  // always three on screen: the last page borrows from the start of the list
  const shown = Array.from({ length: Math.min(PER_VIEW, matching.length) }, (_, i) => matching[(current * PER_VIEW + i) % matching.length]);

  return (
    <SectionCard icon={<Star aria-hidden="true" />} title="Customer reviews">
      <div className="flex items-center gap-3 rounded-2xl bg-linear-to-r from-[#0a3a80] to-[#1f74ee] px-4 py-3.5 text-white sm:gap-4 sm:px-5 sm:py-4">
        <b className="font-(family-name:--font-display) text-3xl font-extrabold leading-none sm:text-4xl">{overall.toFixed(1)}</b>
        <div className="grid min-w-0 gap-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="flex gap-0.5" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className={cn("size-4.5", star <= Math.round(overall) ? "fill-amber-300 text-amber-300" : "text-white/40")} />
              ))}
            </span>
            <span className="text-sm font-bold">{word}</span>
          </div>
          <p className="text-[13px] text-white/85">
            {summary
              ? `Rated by ${count} ${count === 1 ? "traveller" : "travellers"} who booked ${vehicle}`
              : `Rated by ${count} ${count === 1 ? "customer" : "customers"} of Veera Tours & Travels`}
          </p>
        </div>
      </div>

      {summary ? (
        <dl className="grid gap-2.5 pt-4">
          <RatingBar label="Driver Rating" value={summary.driver} />
          <RatingBar label="Cab Rating" value={summary.cab} />
        </dl>
      ) : null}

      <h3 className="pt-5 pb-3 text-base font-bold">{summary ? "All reviews" : "What our customers say"}</h3>
      {summary && summary.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2 pb-3" role="group" aria-label="Filter reviews">
          {summary.tags.map((item) => (
            <button
              key={item.tag}
              type="button"
              aria-pressed={tag === item.tag}
              onClick={() => {
                setTag(tag === item.tag ? "" : item.tag);
                setPage(0);
              }}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm transition",
                tag === item.tag ? "border-[#0b57b7] bg-[#0b57b7]/10 font-semibold text-[#0b57b7]" : "border-line hover:border-[#0b57b7]/60",
              )}
            >
              {item.tag}
            </button>
          ))}
        </div>
      ) : null}

      <div onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
        {/* grid-cols-1 (minmax(0, 1fr)): without it a long name or date line widens the cards past a phone screen */}
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0">
          {shown.map((review, index) => {
            const score = ((review.cabRating + review.driverRating) / 2).toFixed(1);
            const from = review.source ? `Review on ${review.source}` : review.vehicle ? `Booked ${review.vehicle}` : "";
            return (
              // the key changes with the page, so each new review fades in
              <li
                key={`${current}-${index}`}
                className="grid min-w-0 grid-cols-1 gap-2.5 rounded-2xl border border-[#dbe6f3] bg-[#f7faff] p-3 transition duration-500 starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none sm:p-4"
              >
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-sm font-extrabold text-white sm:size-10 sm:text-base", AVATAR[(review.reviewer.codePointAt(0) ?? 0) % AVATAR.length])} aria-hidden="true">
                    {review.reviewer.trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{review.reviewer}</p>
                    <p className="truncate text-xs text-muted">
                      {from ? `${from} • ` : ""}
                      {dateFormat.format(new Date(review.date))}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#fff3d1] px-2 py-0.5 text-[13px] font-bold text-[#7a5200] tabular-nums sm:px-2.5 sm:py-1 sm:text-sm" aria-label={`${score} out of 5`}>
                    <Star className="size-3.5 fill-[#e8a50c] text-[#e8a50c]" aria-hidden="true" />
                    {score}
                  </span>
                </div>
                {/* three lines for every review, so the page below does not jump when they change */}
                <p className="line-clamp-3 min-h-[4.5em] text-sm leading-normal wrap-anywhere" title={review.comment || undefined}>
                  {review.comment || review.tags.join(" · ")}
                </p>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
          <div className="flex items-center">
            {pages > 1
              ? Array.from({ length: pages }, (_, index) => (
                  <button key={index} type="button" aria-label={`Show reviews ${index + 1} of ${pages}`} aria-current={index === current} onClick={() => setPage(index)} className="grid h-6 place-items-center px-1">
                    <span className={cn("block h-2 rounded-full transition-all", index === current ? "w-6 bg-[#0b57b7]" : "w-2 bg-[#c5d6ee]")} />
                  </button>
                ))
              : null}
          </div>
          {/* a new tab, so the half-filled booking form is not lost */}
          <Link href="/reviews" target="_blank" className="ml-auto flex items-center gap-1.5 text-sm font-bold text-[#0b57b7] hover:underline">
            See all reviews <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </SectionCard>
  );
}
