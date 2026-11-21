import { Quote } from "lucide-react";
import { Stars } from "@/components/booking/stars";
import { ReviewAvatar } from "@/components/site/review-avatar";
import { RATING_WORDS, type PublicReview } from "@/lib/booking/reviews";

const monthYear = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export type HomeReviewsData = { overall: number; count: number; reviews: PublicReview[] };

/** "What our customers say": real reviews written by customers after their trip. Renders nothing until there is one. */
export function HomeReviews({ data }: { data: HomeReviewsData | null }) {
  if (!data || data.reviews.length === 0) return null;
  const word = RATING_WORDS[Math.min(5, Math.max(1, Math.round(data.overall)))];

  return (
    <section className="section reviews-section" id="reviews" aria-label="Customer reviews">
      <div className="shell home-reviews">
      <div className="home-reviews-head" data-reveal>
        <div>
          <span className="mini-label">Customer reviews</span>
          <h3>What our customers say.</h3>
        </div>
        <div className="home-reviews-score" aria-label={`Average rating ${data.overall.toFixed(1)} out of 5 from ${data.count} reviews`}>
          <b>{data.overall.toFixed(1)}</b>
          <span>
            <Stars value={data.overall} />
            <small>
              {word} · {data.count} {data.count === 1 ? "review" : "reviews"}
            </small>
          </span>
        </div>
      </div>

      <ul className="home-reviews-grid">
        {data.reviews.map((review, index) => (
          <li className="home-review" key={`${review.date}-${index}`} data-reveal style={{ transitionDelay: `${(index % 3) * 70}ms` }}>
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
        ))}
      </ul>
      </div>
    </section>
  );
}
