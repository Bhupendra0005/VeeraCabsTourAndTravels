import type { Metadata } from "next";
import { Stars } from "@/components/booking/stars";
import { PageShell } from "@/components/site/page-shell";
import { CtaBand, PageHero } from "@/components/site/page-parts";
import { ReviewCard } from "@/components/site/review-card";
import { RATING_WORDS } from "@/lib/booking/reviews";
import { getHomeReviews } from "@/lib/server/bookings/reviews";

export const metadata: Metadata = {
  title: "Customer Reviews",
  description: "What customers say about Veera Tours & Travels: real reviews of our cabs, drivers and outstation trips from Pune.",
  alternates: { canonical: "/reviews" },
};

// reviews are added and hidden from the admin panel at any time: always show the current list
export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const data = await getHomeReviews(500);
  const word = data ? RATING_WORDS[Math.min(5, Math.max(1, Math.round(data.overall)))] : "";

  return (
    <PageShell>
      <PageHero
        eyebrow="Customer reviews"
        title={
          <>
            What our customers <em>say.</em>
          </>
        }
        description="Real reviews from people who travelled with Veera Tours & Travels, from our own bookings and from Google and other sites."
        crumbs={[{ label: "Home", href: "/" }, { label: "Reviews" }]}
      />

      <section className="section">
        <div className="shell">
          {data ? (
            <>
              <div className="home-reviews-head">
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
                  <ReviewCard key={`${review.date}-${index}`} review={review} />
                ))}
              </ul>
            </>
          ) : (
            <p className="text-center text-(--muted)">No reviews yet. They appear here after our customers have travelled with us.</p>
          )}
          <CtaBand label="Ready to travel?" title="Book your ride with us." text="Choose your route, pick a cab and pay securely online. Your ticket arrives by email." />
        </div>
      </section>
    </PageShell>
  );
}
