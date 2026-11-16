import { RATING_WORDS, type PublicReview, type ReviewSummary } from "@/lib/booking/reviews";
import { Stars } from "@/components/booking/stars";
import { ui } from "@/components/ui/styles";

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/** "Customer reviews" card of the review-booking page. Shows nothing until the vehicle has a review. */
export function CustomerReviews({ summary, reviews, vehicle }: { summary: ReviewSummary | null; reviews: PublicReview[]; vehicle: string }) {
  if (!summary) return null;
  const word = RATING_WORDS[Math.min(5, Math.max(1, Math.round(summary.overall)))];
  return (
    <section className={ui.card} aria-labelledby="customer-reviews-title">
      <h2 id="customer-reviews-title" className={ui.cardTitle}>
        Customer reviews
      </h2>
      <div className="mb-4 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div>
          <p className="font-(family-name:--font-display) text-3xl font-bold leading-none">{summary.overall.toFixed(1)}</p>
          <p className="text-sm font-semibold text-ok">{word}</p>
          <p className="text-xs text-muted">
            {summary.count} {summary.count === 1 ? "review" : "reviews"}
          </p>
        </div>
        <dl className="grid gap-1.5 text-sm">
          <div className="flex items-center gap-3">
            <dt className="w-28 text-muted">Driver Rating</dt>
            <dd className="flex items-center gap-2">
              <Stars value={summary.driver} /> <b>{summary.driver.toFixed(1)}</b>
            </dd>
          </div>
          <div className="flex items-center gap-3">
            <dt className="w-28 text-muted">Cab Rating</dt>
            <dd className="flex items-center gap-2">
              <Stars value={summary.cab} /> <b>{summary.cab.toFixed(1)}</b>
            </dd>
          </div>
        </dl>
      </div>

      {summary.tags.length > 0 ? (
        <ul className="m-0 mb-4 flex list-none flex-wrap gap-2 p-0">
          {summary.tags.map(({ tag, count }) => (
            <li key={tag} className="rounded-full border border-line px-3 py-1 text-xs font-semibold">
              {tag} <span className="text-muted">({count})</span>
            </li>
          ))}
        </ul>
      ) : null}

      <ul className="m-0 grid list-none gap-4 p-0">
        {reviews.map((review, index) => (
          <li key={`${review.date}-${index}`} className="grid gap-1.5 border-t border-line pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b>{review.reviewer}</b>
              <span className="text-xs text-muted">{dateFormat.format(new Date(review.date))}</span>
            </div>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <Stars value={(review.cabRating + review.driverRating) / 2} />
              Booked {vehicle}
            </p>
            {review.comment ? <p className="text-sm">{review.comment}</p> : null}
            {review.tags.length > 0 ? <p className="text-xs text-muted">{review.tags.join(" · ")}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
