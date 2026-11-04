import type { Metadata } from "next";
import { DestinationsExplorer } from "@/components/site/destinations-explorer";
import { PageShell } from "@/components/site/page-shell";
import { CtaBand, PageHero } from "@/components/site/page-parts";
import { destinationCategories, destinations } from "@/lib/content";
import { CATEGORY_PHOTOS, findPhoto } from "@/lib/destination-photos";

export const metadata: Metadata = {
  title: "Tourist Spots & Destinations from Pune",
  description:
    "Hill stations, temples, beaches and city trips from Pune — Lonavala, Mahabaleshwar, Shirdi, Ashtavinayak, Alibaug, Goa and more with Veera Tours & Travels.",
  alternates: { canonical: "/destinations" },
};

export default function DestinationsPage() {
  const seenInCategory: Record<string, number> = {};
  const items = destinations.map(
    ({ slug, name, category, distance, duration, bestTime, tagline }) => {
      const own = findPhoto(slug);
      const pool = CATEGORY_PHOTOS[category] ?? [];
      const turn = (seenInCategory[category] = (seenInCategory[category] ?? -1) + 1);
      return {
        slug,
        name,
        category,
        distance,
        duration,
        bestTime,
        tagline,
        photo: own ?? pool[turn % Math.max(pool.length, 1)],
        photoIsOfPlace: Boolean(own),
      };
    },
  );
  const categories = destinationCategories.map(({ id, label, plural }) => ({
    id,
    label,
    plural,
  }));

  return (
    <PageShell>
      <PageHero
        eyebrow="Tourist spots from Pune"
        title={
          <>
            Where would you <em>like to go?</em>
          </>
        }
        description="Hill stations, pilgrimage towns, beaches and city breaks — each with a clear idea of distance, drive time and the best season, so you can plan with confidence."
        crumbs={[{ label: "Home", href: "/" }, { label: "Destinations" }]}
        imageBase="hero-lake"
        imageRatio="16 / 9"
        vivid
      />

      <section className="section dx-section">
        <div className="shell">
          <DestinationsExplorer items={items} categories={categories} />

          <CtaBand
            label="Another destination?"
            title="Tell us where you want to go."
            text="We drive well beyond this list. Share your route and dates and we will quote it clearly."
            prefill={{ notes: "Enquiry for a different destination" }}
          />
        </div>
      </section>
    </PageShell>
  );
}
