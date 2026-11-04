import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeIndianRupee,
  CalendarCheck,
  Send,
  ThumbsUp,
  Briefcase,
  CarFront,
  Check,
  Compass,
  MapPin,
  Mountain,
  Plane,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageShell } from "@/components/site/page-shell";
import {
  CtaBand,
  DestinationCard,
  PageHero,
  SectionHead,
  delay,
} from "@/components/site/page-parts";
import { FaqAccordion } from "@/components/site/faq";
import { destinations, fleet, servicePages } from "@/lib/content";
import { BookButton } from "@/components/site/book-button";

export const metadata: Metadata = {
  title: "Car Hire Services in Pune",
  description:
    "Local car hire, outstation cabs, airport pickup and drop, tour packages and corporate travel in Pune with Veera Tours & Travels.",
  alternates: { canonical: "/services" },
};

const photos: Record<string, string> = {
  "local-car-hire-pune": "service-local",
  "outstation-car-hire": "service-outstation",
  "airport-pickup-drop": "service-airport",
  "tour-packages": "service-tour",
  "corporate-event-travel": "service-corporate",
};

const icons: Record<string, LucideIcon> = {
  "local-car-hire-pune": MapPin,
  "outstation-car-hire": Compass,
  "airport-pickup-drop": Plane,
  "tour-packages": Mountain,
  "corporate-event-travel": Briefcase,
};

// "I need…" shortcuts built from each service's own "ideal for" list
const situations = servicePages.flatMap((service) =>
  service.idealFor.slice(0, 2).map((text) => ({
    text,
    slug: service.slug,
    title: service.title,
  })),
);

const steps = [
  {
    icon: Send,
    title: "Tell us your plan",
    text: "Share pickup, drop, date and the number of people on a call or WhatsApp.",
  },
  {
    icon: BadgeIndianRupee,
    title: "Get a clear quote",
    text: "We suggest the right vehicle and send the fare before you commit to anything.",
  },
  {
    icon: CalendarCheck,
    title: "Confirm your car",
    text: "Lock the booking on WhatsApp. No advance payment is needed to reserve.",
  },
  {
    icon: ThumbsUp,
    title: "Ride with confidence",
    text: "Your chauffeur arrives on time and handles the road, tolls and stops.",
  },
];

const popularSlugs = [
  "mumbai",
  "shirdi",
  "lonavala-khandala",
  "mahabaleshwar-panchgani",
  "goa",
  "alibaug",
];
const popularRoutes = popularSlugs
  .map((slug) => destinations.find((place) => place.slug === slug))
  .filter((place): place is NonNullable<typeof place> => Boolean(place));

const confirmBeforeTravel = [
  "Total distance, tolls and parking, explained before you book",
  "Waiting time and overnight halts for multi-day trips",
  "State permits for trips that cross borders",
  "Luggage space and child seats, if you need them",
  "Vehicle and chauffeur details shared before pickup",
  "Cancellation and change terms, told to you upfront",
];

const serviceFaqs = servicePages
  .flatMap((service) => service.faqs.slice(0, 2))
  .slice(0, 8);

export default function ServicesPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="What we offer"
        title={
          <>
            Premium rides for every <em>kind of journey.</em>
          </>
        }
        description="From a quick city run to a multi-day pilgrimage, Veera Tours & Travels delivers clean cars, courteous chauffeurs and clear pricing."
        crumbs={[{ label: "Home", href: "/" }, { label: "Services" }]}
        imageBase="hero-palace"
        imageRatio="16 / 9"
        vivid
      >
        <BookButton>Book your ride</BookButton>
      </PageHero>

      {/* Services bento */}
      <section className="section sv-section">
        <div className="shell">
          <div className="sv-rows">
            {servicePages.map((service, index) => {
              const Icon = icons[service.slug] ?? CarFront;
              const photo = photos[service.slug];
              return (
                <article
                  className={`sv-row${index % 2 ? " is-flipped" : ""}`}
                  key={service.slug}
                  data-reveal={index % 2 ? "right" : "left"}
                >
                  <Link
                    className="sv-row-photo"
                    href={`/services/${service.slug}`}
                    aria-label={service.title}
                    tabIndex={-1}
                  >
                    {photo ? (
                      <img
                        src={`/${photo}-960.webp`}
                        srcSet={`/${photo}-640.webp 640w, /${photo}-960.webp 960w, /${photo}-1254.webp 1254w`}
                        sizes="(max-width: 900px) 92vw, 520px"
                        width={960}
                        height={960}
                        alt={`${service.title} with Veera Tours & Travels`}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                  </Link>

                  <div className="sv-row-copy">
                    <span className="sv-row-top">
                      <span className="sv-icon">
                        <Icon aria-hidden="true" />
                      </span>
                      <span className="sv-tag">{service.tag}</span>
                      <span className="sv-row-num" aria-hidden="true">
                        0{index + 1}
                      </span>
                    </span>
                    <h3>{service.title}</h3>
                    <p className="sv-row-tagline">{service.tagline}</p>
                    <p className="sv-row-summary">{service.summary}</p>

                    <ul className="sv-perks">
                      {service.whatYouGet.slice(0, 4).map((perk) => (
                        <li key={perk}>
                          <Check aria-hidden="true" />
                          {perk}
                        </li>
                      ))}
                    </ul>

                    <div className="sv-row-ideal">
                      <b>Ideal for</b>
                      {service.idealFor.slice(0, 3).map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>

                    <div className="sv-row-actions">
                      <Link
                        className="btn btn-gold"
                        href={`/services/${service.slug}`}
                      >
                        View details
                        <ArrowRight aria-hidden="true" />
                      </Link>
                      <BookButton
                        className="btn btn-ghost"
                        prefill={service.booking}
                      >
                        Get a quote
                      </BookButton>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section routes-section">
        <div className="shell">
          <SectionHead
            eyebrow="How it works"
            title={
              <>
                Booking in <span className="gold">four easy steps.</span>
              </>
            }
            description="No app to download and no advance payment. Just tell us where you are headed."
          />
          <ol className="ab-steps">
            {steps.map(({ icon: Icon, title, text }, index) => (
              <li
                className="ab-step"
                key={title}
                data-reveal
                style={delay(index, 80)}
              >
                <span className="ab-step-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span className="ab-step-num">0{index + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>

          <div className="sv-confirm" data-reveal>
            <div>
              <span className="mini-label">Transparent by default</span>
              <h3>What we confirm before you travel</h3>
            </div>
            <ul>
              {confirmBeforeTravel.map((item) => (
                <li key={item}>
                  <Check aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Popular routes */}
      <section className="section">
        <div className="shell">
          <SectionHead
            eyebrow="Popular routes from Pune"
            title={
              <>
                Where our guests <span className="gold">travel most.</span>
              </>
            }
            description="Every one of these can be booked as a one-way drop, a round trip or a full tour package."
          />
          <div className="route-grid">
            {popularRoutes.map((destination, index) => (
              <DestinationCard
                key={destination.slug}
                destination={destination}
                index={index}
              />
            ))}
          </div>
          <div className="section-more" data-reveal>
            <Link className="btn btn-ghost" href="/destinations">
              Explore all destinations
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Find your fit */}
      <section className="section routes-section">
        <div className="shell">
          <SectionHead
            eyebrow="Find your fit"
            title={
              <>
                Not sure what <span className="gold">you need?</span>
              </>
            }
            description="Pick the situation closest to yours and we will take you to the right service."
          />
          <div className="sv-fit-grid">
            {situations.map(({ text, slug, title }, index) => {
              const Icon = icons[slug] ?? CarFront;
              return (
                <Link
                  className="sv-fit"
                  key={`${slug}-${text}`}
                  href={`/services/${slug}`}
                  data-reveal
                  style={delay(index % 4, 50)}
                >
                  <span className="sv-fit-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <span className="sv-fit-copy">
                    <b>{text}</b>
                    <small>{title}</small>
                  </span>
                  <ArrowRight className="sv-fit-arrow" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Fleet */}
      <section className="section">
        <div className="shell">
          <SectionHead
            eyebrow="Our vehicle options"
            title={
              <>
                Select the right car for{" "}
                <span className="gold">your journey.</span>
              </>
            }
            description="All vehicles are cleaned and comfort-checked before every ride. Availability depends on your route and dates."
          />
          <div className="fleet-grid">
            {fleet.map(
              ({ icon: Icon, photo, title, seats, luggage, description }, index) => (
                <article
                  className="fleet-card"
                  key={title}
                  data-reveal
                  style={delay(index, 65)}
                >
                  <div className="fleet-photo">
                    <img
                      src={`/${photo}-800.webp`}
                      srcSet={`/${photo}-480.webp 480w, /${photo}-800.webp 800w`}
                      sizes="(max-width: 640px) 90vw, (max-width: 1100px) 45vw, 22vw"
                      width={800}
                      height={420}
                      alt={`${title} by Veera Tours & Travels`}
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="fleet-icon">
                      <Icon aria-hidden="true" />
                    </span>
                  </div>
                  <h4>{title}</h4>
                  <p>{description}</p>
                  <div className="fleet-meta">
                    <span>{seats}</span>
                    <span>{luggage}</span>
                  </div>
                </article>
              ),
            )}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="section routes-section">
        <div className="shell">
          <SectionHead
            eyebrow="Good to know"
            title={
              <>
                Service <span className="gold">questions, answered.</span>
              </>
            }
            description="The things guests ask most before booking a car with us."
          />
          <FaqAccordion items={serviceFaqs} />
          <CtaBand
            title="Not sure which service you need?"
            text="Tell us what you have in mind and we will suggest the simplest way to do it."
          />
        </div>
      </section>
    </PageShell>
  );
}
