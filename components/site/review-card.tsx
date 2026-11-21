import { Quote } from "lucide-react";
import { Stars } from "@/components/booking/stars";
import { ReviewAvatar } from "@/components/site/review-avatar";
import type { PublicReview } from "@/lib/booking/reviews";

const monthYear = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/** One customer review as a card: stars, the text, and who wrote it and where. Used by the home page slider and the all-reviews page. */
export function ReviewCard({ review }: { review: PublicReview }) {
  return (
    <li className="home-review">
      <Quote className="home-review-quote" aria-hidden="true" />
      <Stars value={(review.cabRating + review.driverRating) / 2} />
      <p className="home-review-text">{review.comment}</p>
      {review.tags.length > 0 ? <p className="home-review-tags">{review.tags.slice(0, 3).join(" · ")}</p> : null}
      <footer>
        <ReviewAvatar name={review.reviewer} url={review.avatarUrl} className="home-review-avatar" />
        <span>
          <b>{review.reviewer}</b>
          <small>
            {review.source ? `${review.source} review` : review.vehicle} · {monthYear.format(new Date(review.date))}
          </small>
        </span>
      </footer>
    </li>
  );
}
