import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, Check, Phone } from "lucide-react";
import { BookButton, WhatsAppButton } from "@/components/site/book-button";
import { PageShell } from "@/components/site/page-shell";
import {
  CtaBand,
  DestinationCard,
  PageHero,
  SectionHead,
} from "@/components/site/page-parts";
import {
  getAreaBySlug,
  getAreas,
  getDestinations,
  getServices,
  getSite,
} from "@/lib/server/cms/content";

type Params = { slug: string };

// new pages added in the admin panel are rendered on first visit
export async function generateStaticParams() {
  return (await getAreas()).map((area) => ({ slug: area.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const area = await getAreaBySlug(slug);
  if (!area) return {};
  return {
    title: `Taxi & Cab Service in ${area.name}, Pune`,
    description: `Book airport transfers, outstation cabs and local car hire in ${area.name}, Pune with Veera Tours & Travels. Doorstep pickup, clear fares, 24/7 support.`,
    alternates: { canonical: `/areas/${area.slug}` },
  };
}

const popularSlugs = [
  "mumbai",
  "shirdi",
  "lonavala-khandala",
  "mahabaleshwar-panchgani",
  "goa",
  "nashik-trimbakeshwar",
];

export default async function AreaPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const [area, areas, destinations, servicePages, site] = await Promise.all([
    getAreaBySlug(slug),
    getAreas(),
    getDestinations(),
    getServices(),
    getSite(),
  ]);
  if (!area) notFound();

  const trips = popularSlugs
    .map((item) => destinations.find((destination) => destination.slug === item))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 3);

  const prefill = {
    pickup: `${area.name}, Pune`,
    notes: `Pickup from ${area.name}, Pune`,
  };

  return (
    <PageShell>
      <PageHero
        eyebrow="Pune pickup area"
        title={
          <>
            Taxi service in <em>{area.name}</em>
          </>
        }
        description={`Airport transfers, outstation cabs and local car hire with doorstep pickup in ${area.name}.`}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Areas", href: "/areas" },
          { label: area.name },
        ]}
      >
        <BookButton prefill={prefill}>Book a cab</BookButton>
        <WhatsAppButton
          message={`Hi Veera Tours & Travels, I need a cab from ${area.name}, Pune.`}
        />
      </PageHero>

      <section className="section">
        <div className="shell detail-layout">
          <div className="detail-main">
            <div className="prose" data-reveal>
              <h2>Cabs in {area.name}</h2>
              <p>{area.blurb}</p>
              <p>
                Share your pickup address, date and destination. We confirm the
                vehicle, chauffeur and fare on WhatsApp before your journey, so
                there are no surprises.
              </p>
            </div>

            <div className="prose" data-reveal>
              <h2>Pickup points we cover</h2>
              <ul className="check-list">
                {area.landmarks.map((landmark) => (
                  <li key={landmark}>
                    <Check aria-hidden="true" />
                    {landmark}
                  </li>
                ))}
              </ul>
            </div>

            <div className="prose" data-reveal>
              <h2>Services from {area.name}</h2>
              <ul className="aside-links is-inline">
                {servicePages.map((service) => (
                  <li key={service.slug}>
                    <Link href={`/services/${service.slug}`}>
                      {service.title}
                      <ArrowUpRight aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside className="detail-aside" data-reveal="right">
            <h3>Book from {area.name}</h3>
            <dl className="fact-list">
              <div>
                <dt>Pickup</dt>
                <dd>Doorstep, {area.name}</dd>
              </div>
              <div>
                <dt>Support</dt>
                <dd>24/7 by phone and WhatsApp</dd>
              </div>
              <div>
                <dt>Booking desk</dt>
                <dd>Hadapsar, Pune</dd>
              </div>
            </dl>
            <BookButton prefill={prefill} className="btn btn-gold aside-btn">
              Get a quote
            </BookButton>
            <a className="aside-call" href={site.primaryPhone.href}>
              <Phone aria-hidden="true" />
              Call {site.primaryPhone.display}
            </a>
          </aside>
        </div>
      </section>

      <section className="section routes-section">
        <div className="shell">
          <SectionHead
            eyebrow={`Popular trips from ${area.name}`}
            title={<>Go farther, <span className="gold">comfortably.</span></>}
          />
          <div className="route-grid">
            {trips.map((destination, index) => (
              <DestinationCard
                key={destination.slug}
                destination={destination}
                index={index}
              />
            ))}
          </div>

          <div className="route-pills-wrap" data-reveal>
            <span className="route-pills-label">Other Pune areas</span>
            <div className="route-pills">
              {areas
                .filter((item) => item.slug !== area.slug)
                .map((item) => (
                  <Link className="route-pill" key={item.slug} href={`/areas/${item.slug}`}>
                    {item.name}
                  </Link>
                ))}
            </div>
          </div>

          <CtaBand
            title={`Need a cab in ${area.name}?`}
            text="Tell us your route and travel date. We will confirm the right car and a fair quote."
            prefill={prefill}
          />
        </div>
      </section>
    </PageShell>
  );
}
