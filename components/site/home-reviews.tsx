import { Stars } from "@/components/booking/stars";
import { ReviewsCarousel } from "@/components/site/reviews-carousel";
import { RATING_WORDS, type PublicReview } from "@/lib/booking/reviews";

export type HomeReviewsData = { overall: number; count: number; reviews: PublicReview[] };

/** "What our customers say": real reviews, moving by themselves. Renders nothing until there is one. */
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

        <ReviewsCarousel reviews={data.reviews} />
      </div>
    </section>
  );
}
