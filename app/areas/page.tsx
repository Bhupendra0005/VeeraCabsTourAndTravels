import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, MapPin } from "lucide-react";
import { PageShell } from "@/components/site/page-shell";
import {
  CtaBand,
  PageHero,
  SectionHead,
  delay,
} from "@/components/site/page-parts";
import { getAreas } from "@/lib/server/cms/content";

export const metadata: Metadata = {
  title: "Taxi Service Across Pune",
  description:
    "Doorstep cab pickup in Hadapsar, Kharadi, Magarpatta, Viman Nagar, Koregaon Park, Kothrud, Aundh, Baner, Wakad, Hinjewadi and Pimpri-Chinchwad.",
  alternates: { canonical: "/areas" },
};

export default async function AreasPage() {
  const areas = await getAreas();
  return (
    <PageShell>
      <PageHero
        eyebrow="Pune pickup areas"
        title={
          <>
            Doorstep pickup <em>across Pune.</em>
          </>
        }
        description="Our booking desk is in Hadapsar, and our chauffeurs pick up from homes, offices and hotels across the city."
        crumbs={[{ label: "Home", href: "/" }, { label: "Areas we serve" }]}
      />

      <section className="section">
        <div className="shell">
          <SectionHead
            eyebrow="Where we pick up"
            title={<>Your neighbourhood, <span className="gold">covered.</span></>}
          />
          <div className="route-grid">
            {areas.map((area, index) => (
              <article
                className="route-card"
                key={area.slug}
                data-reveal
                style={delay(index % 3, 80)}
              >
                <div className="route-top">
                  <span className="route-badge">Pune</span>
                  <span className="route-icon">
                    <MapPin aria-hidden="true" />
                  </span>
                </div>
                <h3>{area.name}</h3>
                <div className="route-tags">
                  {area.landmarks.slice(0, 3).map((landmark) => (
                    <span key={landmark}>{landmark}</span>
                  ))}
                </div>
                <div className="route-footer">
                  <small>Cab service</small>
                  <Link href={`/areas/${area.slug}`}>
                    View area
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <CtaBand
            label="Not on the list?"
            title="We cover the rest of Pune too."
            text="Share your pickup address and we will confirm availability and the fare."
          />
        </div>
      </section>
    </PageShell>
  );
}
