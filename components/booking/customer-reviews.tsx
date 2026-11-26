"use client";

import { ThumbsUp, Star } from "lucide-react";
import { useState } from "react";
import { SectionCard } from "@/components/booking/section-card";
import { RATING_WORDS, type PublicReview, type ReviewSummary } from "@/lib/booking/reviews";
import { cn } from "@/lib/utils/cn";

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

const FIRST_SHOWN = 3;

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
 * "Customer reviews" card of the review-booking page: score box, driver and cab bars, tag filters and the latest reviews.
 * Only real reviews are shown: this cab's own, else all published ones (each marked with where it was written), else nothing.
 */
export function CustomerReviews({ summary, reviews, vehicle, all }: { summary: ReviewSummary | null; reviews: PublicReview[]; vehicle: string; all?: AllReviews | null }) {
  const [tag, setTag] = useState("");
  const [expanded, setExpanded] = useState(false);
  const overall = summary?.overall ?? all?.overall;
  const count = summary?.count ?? all?.count ?? 0;
  const list = summary ? reviews : (all?.reviews ?? []);
  if (overall === undefined || count === 0) return null;

  const word = RATING_WORDS[Math.min(5, Math.max(1, Math.round(overall)))];
  const matching = tag ? list.filter((review) => review.tags.includes(tag)) : list;
  const shown = expanded ? matching : matching.slice(0, FIRST_SHOWN);

  return (
    <SectionCard icon={<Star aria-hidden="true" />} title="Customer reviews">
      <div className="flex flex-wrap items-stretch overflow-hidden rounded-xl border border-line">
        <div className="grid min-w-28 content-center justify-items-center gap-0.5 bg-[#0b57b7] px-5 py-3.5 text-white max-sm:w-full">
          <b className="font-(family-name:--font-display) text-2xl leading-none">{overall.toFixed(1)}</b>
          <span className="text-sm font-semibold">{word}</span>
        </div>
        {summary ? (
          <dl className="grid min-w-0 flex-1 basis-60 content-center gap-2.5 px-4 py-3">
            <RatingBar label="Driver Rating" value={summary.driver} />
            <RatingBar label="Cab Rating" value={summary.cab} />
          </dl>
        ) : (
          <dl className="grid min-w-0 flex-1 basis-60 content-center px-4 py-3">
            <RatingBar label="Overall" value={overall} />
          </dl>
        )}
      </div>

      <p className="flex items-start gap-2 pt-3.5 pb-4 text-sm font-bold text-[#0a2a5e]">
        <ThumbsUp className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />
        {summary
          ? `Rated by ${count} ${count === 1 ? "traveller" : "travellers"} who booked ${vehicle}`
          : `Rated by ${count} ${count === 1 ? "customer" : "customers"} of Veera Tours & Travels`}
      </p>

      <h3 className="border-t border-line pt-4 text-base font-bold">{summary ? "All reviews" : "What our customers say"}</h3>
      {summary && summary.tags.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label="Filter reviews">
          {summary.tags.map((item) => (
            <button
              key={item.tag}
              type="button"
              aria-pressed={tag === item.tag}
              onClick={() => {
                setTag(tag === item.tag ? "" : item.tag);
                setExpanded(false);
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

      <ul className="m-0 mt-1 grid list-none p-0">
        {shown.map((review, index) => (
          <li key={`${review.date}-${review.reviewer}-${index}`} className="grid gap-1 border-b border-line py-3.5 last:border-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm">
                  <b>{review.reviewer}</b>
                  {review.source ? (
                    <span className="text-muted"> • Review on {review.source}</span>
                  ) : review.vehicle ? (
                    <span className="text-muted"> • Booked {review.vehicle}</span>
                  ) : null}
                </p>
                <p className="text-xs text-muted">{dateFormat.format(new Date(review.date))}</p>
              </div>
              <span className="shrink-0 rounded-lg border border-[#0b57b7] px-2.5 py-1 text-sm font-bold text-[#0b57b7] tabular-nums" aria-label={`${((review.cabRating + review.driverRating) / 2).toFixed(1)} out of 5`}>
                {((review.cabRating + review.driverRating) / 2).toFixed(1)}
              </span>
            </div>
            {review.comment ? <p className="text-sm wrap-anywhere">{review.comment}</p> : null}
            {review.tags.length > 0 ? <p className="text-xs text-muted">{review.tags.join(" · ")}</p> : null}
          </li>
        ))}
      </ul>
      {matching.length > FIRST_SHOWN ? (
        <button type="button" onClick={() => setExpanded((current) => !current)} className="mt-1 ml-auto block text-sm font-bold text-[#0b57b7] hover:underline">
          {expanded ? "Show fewer reviews" : "See more reviews"}
        </button>
      ) : null}
    </SectionCard>
  );
}
