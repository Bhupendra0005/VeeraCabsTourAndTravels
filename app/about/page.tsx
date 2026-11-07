import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeIndianRupee,
  CalendarCheck,
  Check,
  Clock3,
  MapPin,
  Phone,
  Send,
  ThumbsUp,
} from "lucide-react";
import { BookButton, WhatsAppButton } from "@/components/site/book-button";
import { AboutPhotos } from "@/components/site/about-photos";
import { PageShell } from "@/components/site/page-shell";
import {
  CtaBand,
  PageHero,
  SectionHead,
  delay,
} from "@/components/site/page-parts";
import { photoSrc, photoSrcSet } from "@/lib/cms/images";
import {
  getAreas,
  getDestinations,
  getFeatures,
  getFleet,
  getServices,
  getSite,
} from "@/lib/server/cms/content";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Veera Tours & Travels is a cab and tour service in Hadapsar, Pune. We offer airport pickup and drop, one-way cabs, outstation trips and tour packages across Maharashtra and India.",
  alternates: { canonical: "/about" },
};


const values = [
  "You know the fare before you book",
  "Licensed and polite drivers",
  "Clean cars with AC",
  "A real person to talk to, any time",
  "We know Pune well, and we travel across India",
];

const steps = [
  {
    icon: Send,
    title: "Tell us your trip",
    text: "Call or message us on WhatsApp. Tell us where to pick you up, where to go and the date.",
  },
  {
    icon: BadgeIndianRupee,
    title: "Get the price",
    text: "We reply with the fare and suggest the right car for the number of people.",
  },
  {
    icon: CalendarCheck,
    title: "Confirm your car",
    text: "Say yes on WhatsApp and your car is booked. You do not need to pay in advance.",
  },
  {
    icon: ThumbsUp,
    title: "Enjoy the ride",
    text: "Your driver comes on time. You sit back while he takes care of the road.",
  },
];

export default async function AboutPage() {
  const [areas, destinations, features, fleet, servicePages, site] = await Promise.all([
    getAreas(),
    getDestinations(),
    getFeatures(),
    getFleet(),
    getServices(),
    getSite(),
  ]);
  const stats = [
    { value: "24/7", label: "Hours, our desk is open" },
    { value: String(destinations.length), label: "Places we take you to" },
    { value: String(areas.length), label: "Pune areas we cover" },
    { value: String(servicePages.length), label: "Types of service" },
  ];
  return (
    <PageShell>
      <PageHero
        eyebrow="About us"
        title={
          <>
            Good travel begins with a <em>trusted ride.</em>
          </>
        }
        description="We are a cab and tour service in Pune. We help you reach the airport, travel to other cities and enjoy road trips, with a clean car and a friendly driver."
        crumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
        imageBase="hero-pune"
        imageRatio="16 / 9"
        vivid
      >
        <BookButton>Book your ride</BookButton>
        <WhatsAppButton />
      </PageHero>

      {/* Story */}
      <section className="section ab-story-section">
        <div className="shell ab-story">
          <div className="ab-media" data-reveal="left">
            <AboutPhotos />
            <div className="ab-float">
              <span className="ab-float-dot" aria-hidden="true" />
              <span>
                <b>Open 24/7</b>
                <small>Airport and late-night pickups</small>
              </span>
            </div>
          </div>

          <div className="ab-copy" data-reveal="right">
            <span className="mini-label">Who we are</span>
            <h2>
              A Pune cab service that keeps things <em>simple and honest.</em>
            </h2>
            <p>
              Veera Tours &amp; Travels is a cab and tour service. Our office is
              at Monal Park, Hadapsar, in Pune. You can book a car with a driver
              for the airport, for a day around the city, for a trip to another
              city, or for a holiday tour.
            </p>
            <p>
              Our idea is simple. Travel should feel easy. So you get a
              confirmed car, a polite driver and the price before you start. No
              hidden surprises, and a real person to speak to whenever you need
              help.
            </p>
            <ul className="ab-values">
              {values.map((item) => (
                <li key={item}>
                  <Check aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="ab-stats-section">
        <div className="shell">
          <div className="ab-stats" data-reveal="scale">
            {stats.map((stat) => (
              <div className="ab-stat" key={stat.label}>
                <b>{stat.value}</b>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section">
        <div className="shell">
          <SectionHead
            eyebrow="How it works"
            title={
              <>
                Booking a ride in <span className="gold">four easy steps.</span>
              </>
            }
            description="You do not need an app and you do not pay in advance. Just tell us where you want to go."
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
        </div>
      </section>

      {/* Why Veera */}
      <section className="section routes-section">
        <div className="shell">
          <SectionHead
            eyebrow="Why choose Veera"
            title={
              <>
                Comfortable, safe and{" "}
                <span className="gold">always on time.</span>
              </>
            }
          />
          <div className="why-cards about-why">
            {features.map(({ icon: Icon, title, text }, index) => (
              <article
                className="why-card"
                key={title}
                data-reveal
                style={delay(index, 60)}
              >
                <span className="why-card-top">
                  <span className="why-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <span className="why-index">0{index + 1}</span>
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Fleet */}
      <section className="section">
        <div className="shell">
          <SectionHead
            eyebrow="Our fleet"
            title={
              <>
                Select the right car for{" "}
                <span className="gold">your journey.</span>
              </>
            }
          />
          <div className="fleet-grid">
            {fleet.map(
              ({ icon: Icon, photo, image, title, seats, luggage, description }, index) => (
                <article
                  className="fleet-card"
                  key={title}
                  data-reveal
                  style={delay(index, 65)}
                >
                  <div className="fleet-photo">
                    <img
                      src={photoSrc({ photo, image }, 800)}
                      srcSet={photoSrcSet({ photo, image })}
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

      {/* Visit */}
      <section className="ab-visit-section">
        <div className="shell">
          <div className="ab-visit" data-reveal>
            <div className="ab-visit-copy">
              <span className="mini-label">Visit us</span>
              <h3>Drop by our Hadapsar office</h3>
              <ul>
                <li>
                  <MapPin aria-hidden="true" />
                  {site.address.full}
                </li>
                <li>
                  <Clock3 aria-hidden="true" />
                  {site.hours}
                </li>
                <li>
                  <Phone aria-hidden="true" />
                  <a href={site.primaryPhone.href}>{site.primaryPhone.display}</a>
                  {" · "}
                  <a href={site.secondaryPhone.href}>
                    {site.secondaryPhone.display}
                  </a>
                </li>
              </ul>
            </div>
            <Link className="btn btn-gold" href="/contact">
              Get directions
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          <CtaBand
            title="Let’s plan your next journey."
            text="Tell us where you want to go and the date. We will take care of the rest."
          />
        </div>
      </section>
    </PageShell>
  );
}
