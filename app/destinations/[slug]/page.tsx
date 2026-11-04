import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Check,
  Clock3,
  Lightbulb,
  MapPin,
  Phone,
  Route,
  Sparkles,
} from "lucide-react";
import { BookButton, WhatsAppButton } from "@/components/site/book-button";
import { FaqAccordion } from "@/components/site/faq";
import { PageShell } from "@/components/site/page-shell";
import {
  CtaBand,
  DestinationCard,
  PageHero,
  SectionHead,
} from "@/components/site/page-parts";
import {
  destinationCategories,
  destinations,
  getDestination,
} from "@/lib/content";
import {
  CATEGORY_HERO,
  CATEGORY_PHOTOS,
  findPhoto,
  shortSeason,
} from "@/lib/destination-photos";
import { site } from "@/lib/site";

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams() {
  return destinations.map((destination) => ({ slug: destination.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const destination = getDestination(slug);
  if (!destination) return {};
  return {
    title: `Pune to ${destination.name} Taxi & Tour Package`,
    description: `${destination.tagline} Book a chauffeur-driven cab from Pune to ${destination.name} (${destination.distance}, ${destination.duration}) with Veera Tours & Travels.`,
    alternates: { canonical: `/destinations/${destination.slug}` },
  };
}

export default async function DestinationPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const destination = getDestination(slug);
  if (!destination) notFound();

  const category = destinationCategories.find(
    (item) => item.id === destination.category,
  );
  const related = destinations
    .filter(
      (item) =>
        item.category === destination.category && item.slug !== destination.slug,
    )
    .slice(0, 3);

  const ownPhoto = findPhoto(destination.slug);
  const pool = CATEGORY_PHOTOS[destination.category] ?? [];
  const photo = ownPhoto ?? pool[0];

  const facts = [
    { icon: MapPin, label: "Starts from", value: "Pune" },
    { icon: Route, label: "Distance", value: destination.distance },
    { icon: Clock3, label: "Drive time", value: destination.duration },
    {
      icon: CalendarDays,
      label: "Best time",
      value: shortSeason(destination.bestTime),
    },
  ];

  const prefill = {
    tripType: "Round Trip" as const,
    pickup: "Pune, Maharashtra",
    drop: destination.name,
    notes: `Trip enquiry: Pune to ${destination.name}`,
  };

  const faqs = [
    {
      question: `How far is ${destination.name} from Pune?`,
      answer: `${destination.name} is roughly ${destination.distance} from Pune, about ${destination.duration} one way by road. Actual time depends on traffic, weather and your stops.`,
    },
    {
      question: `What is the best time to visit ${destination.name}?`,
      answer: `${destination.bestTime}.`,
    },
    {
      question: `Can I book a one-way or round-trip taxi to ${destination.name}?`,
      answer: `Yes. We offer one-way drops, same-day returns and multi-day round trips. Share your dates and group size and we will confirm the vehicle and fare before you travel.`,
    },
    {
      question: "Which vehicle should I choose?",
      answer:
        "A sedan suits up to four passengers, an SUV or MPV suits families of six or seven, and a tempo traveller is best for larger groups. Tell us your group size and luggage and we will recommend one.",
    },
  ];

  return (
    <PageShell>
      <PageHero
        eyebrow={category?.label ?? "Destination"}
        title={
          <>
            Pune to <em>{destination.name}</em>
          </>
        }
        description={destination.tagline}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Destinations", href: "/destinations" },
          { label: destination.name },
        ]}
        imageBase={CATEGORY_HERO[destination.category] ?? "hero-pune"}
        imageRatio="16 / 9"
        vivid
      >
        <BookButton prefill={prefill}>Book this trip</BookButton>
        <WhatsAppButton
          message={`Hi Veera Tours & Travels, I'd like a quote for a cab from Pune to ${destination.name}.`}
        />
      </PageHero>

      <section className="section dd-section">
        <div className="shell">
          <ul className="dd-facts" data-reveal>
            {facts.map(({ icon: Icon, label, value }) => (
              <li key={label}>
                <span className="dd-fact-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span>
                  <small>{label}</small>
                  <b>{value}</b>
                </span>
              </li>
            ))}
          </ul>

          <div className="detail-layout dd-layout">
            <div className="detail-main">
              {photo ? (
                <figure
                  className={`dd-photo${ownPhoto ? " dd-photo--square" : ""}`}
                  data-reveal
                >
                  <img
                    src={photo}
                    alt={ownPhoto ? destination.name : ""}
                    width={1200}
                    height={675}
                    loading="lazy"
                    decoding="async"
                  />
                  <figcaption>
                    <Sparkles aria-hidden="true" />
                    {destination.tagline}
                  </figcaption>
                </figure>
              ) : null}

              <div className="dd-block" data-reveal>
                <h2>About this trip</h2>
                <p>{destination.intro}</p>
              </div>

              <div className="dd-block" data-reveal>
                <h2>Highlights</h2>
                <ul className="dd-cards">
                  {destination.highlights.map((item) => (
                    <li key={item}>
                      <Check aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="dd-block" data-reveal>
                <h2>Travel tips</h2>
                <ul className="dd-tips">
                  {destination.tips.map((item) => (
                    <li key={item}>
                      <Lightbulb aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="dd-help" data-reveal>
                <h2>How Veera Tours &amp; Travels helps</h2>
                <p>
                  We pick you up from your door anywhere in Pune, confirm the
                  car and chauffeur before you travel and share a clear fare on
                  WhatsApp. Distances and timings on this page are approximate
                  and vary with traffic and route.
                </p>
              </div>
            </div>

            <aside className="detail-aside dd-aside" data-reveal="right">
              <span className="mini-label">Plan this trip</span>
              <h3>Pune to {destination.name}</h3>
              <dl className="fact-list">
                <div>
                  <dt>Distance</dt>
                  <dd>{destination.distance}</dd>
                </div>
                <div>
                  <dt>Drive time</dt>
                  <dd>{destination.duration}</dd>
                </div>
                <div>
                  <dt>Best time</dt>
                  <dd>{destination.bestTime}</dd>
                </div>
              </dl>
              <BookButton prefill={prefill} className="btn btn-gold aside-btn">
                Get a quote
              </BookButton>
              <WhatsAppButton
                className="btn btn-ghost aside-btn"
                message={`Hi Veera Tours & Travels, I'd like a quote for a cab from Pune to ${destination.name}.`}
              />
              <a className="aside-call" href={site.primaryPhone.href}>
                <Phone aria-hidden="true" />
                Call {site.primaryPhone.display}
              </a>
            </aside>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section routes-section">
          <div className="shell">
            <SectionHead
              eyebrow="More to explore"
              title={<>Similar <span className="gold">trips.</span></>}
            />
            <div className="route-grid">
              {related.map((item, index) => (
                <DestinationCard key={item.slug} destination={item} index={index} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section faq-section">
        <div className="shell">
          <SectionHead
            eyebrow="Trip questions"
            title={<>Good to <span className="gold">know.</span></>}
          />
          <FaqAccordion items={faqs} />
          <CtaBand
            title={`Plan your ${destination.name} trip`}
            text="Tell us your dates and group size. We will confirm the right car, a fair quote and a chauffeur you can trust."
            prefill={prefill}
          />
        </div>
      </section>
    </PageShell>
  );
}
