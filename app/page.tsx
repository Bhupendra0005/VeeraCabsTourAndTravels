"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  CalendarDays,
  CarFront,
  Clock3,
  Compass,
  Headphones,
  Landmark,
  Luggage,
  MapPin,
  MapPinned,
  Mountain,
  Navigation,
  Phone,
  Plane,
  Route,
  ShieldCheck,
  Sparkles,
  Star,
  TreePalm,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties, PointerEvent, ReactNode } from "react";
import {
  BookingModal,
  openBooking,
  type BookingPrefill,
} from "@/components/site/booking";
import { AboutPhotos } from "@/components/site/about-photos";
import { FaqAccordion, type FaqItem } from "@/components/site/faq";
import { FloatingActions, SiteFooter } from "@/components/site/footer";
import { Hero } from "@/components/site/hero";
import { SiteHeader } from "@/components/site/header";
import { ScrollEffects } from "@/components/site/scroll-effects";
import { features, fleet } from "@/lib/content";
import { site, whatsappLink } from "@/lib/site";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";

/** Passes the pointer position to the hovered card so its glow can follow the cursor. */
function trackSpotlight(event: PointerEvent<HTMLElement>) {
  const card = (event.target as HTMLElement).closest<HTMLElement>(
    ".service-card",
  );
  if (!card) return;
  const rect = card.getBoundingClientRect();
  card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
  card.style.setProperty("--my", `${event.clientY - rect.top}px`);
}

const delay = (index: number, step = 70) =>
  ({ "--reveal-delay": `${index * step}ms` }) as CSSProperties;

const assurances: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: ShieldCheck,
    title: "Experienced chauffeurs",
    text: "Licensed, courteous drivers",
  },
  {
    icon: Clock3,
    title: "24/7 booking support",
    text: "A real person on the phone",
  },
  {
    icon: MapPin,
    title: "Pune based",
    text: "Local knowledge, all-India reach",
  },
  {
    icon: CarFront,
    title: "Clean, AC vehicles",
    text: "Comfort checked before every trip",
  },
];

const marqueeItems = [
  "Airport transfers",
  "One-way cabs",
  "Outstation journeys",
  "All India taxi",
  "Tour packages",
  "24/7 booking support",
];

type Service = {
  icon: LucideIcon;
  /** Banner photo in /public: `<photo>-640/960/1254.webp`. */
  photo: string;
  title: string;
  tag: string;
  description: string;
  label: string;
  booking: BookingPrefill;
};

const services: Service[] = [
  {
    icon: Plane,
    photo: "service-airport",
    title: "Airport Transfers",
    tag: "Most popular",
    description:
      "On-time pickups and drops for Pune, Mumbai and Shirdi airports, with a chauffeur who tracks your flight.",
    label: "Book a transfer",
    booking: {
      tripType: "Airport Transfer",
      notes: "Airport transfer enquiry",
    },
  },
  {
    icon: Route,
    photo: "service-oneway",
    title: "One Way Cabs",
    tag: "Best value",
    description:
      "Comfortable, direct rides between cities. You pay for the journey you take — not the return.",
    label: "Book one way",
    booking: {
      tripType: "One Way",
      notes: "One-way cab enquiry",
    },
  },
  {
    icon: Compass,
    photo: "service-outstation",
    title: "Outstation Journeys",
    tag: "All India",
    description:
      "Planned highway travel across Maharashtra, Goa, Gujarat and beyond with a dedicated chauffeur.",
    label: "Plan an outstation trip",
    booking: {
      tripType: "Round Trip",
      notes: "Outstation journey enquiry",
    },
  },
  {
    icon: MapPin,
    photo: "service-local",
    title: "Local City Taxi",
    tag: "Quick dispatch",
    description:
      "Point-to-point and hourly rides around Pune, Hadapsar, Kharadi, Magarpatta, Viman Nagar and Pimpri-Chinchwad.",
    label: "Book a city ride",
    booking: {
      tripType: "Local Rental",
      drop: "Local city ride",
      notes: "Local city taxi enquiry",
    },
  },
  {
    icon: Mountain,
    photo: "service-tour",
    title: "Tour & Pilgrimage Packages",
    tag: "Family special",
    description:
      "Curated journeys to Shirdi, the Ashtavinayak temples and Mahabaleshwar, with every road detail taken care of.",
    label: "Explore packages",
    booking: {
      tripType: "Round Trip",
      drop: "Tour package",
      notes: "Tour and pilgrimage package enquiry",
    },
  },
  {
    icon: Briefcase,
    photo: "service-corporate",
    title: "Corporate & Event Travel",
    tag: "Premium",
    description:
      "Executive cars for business meetings, weddings, VIP guests and group events — quietly professional.",
    label: "Plan corporate travel",
    booking: {
      tripType: "Local Rental",
      drop: "Corporate / event travel",
      notes: "Corporate and event travel enquiry",
    },
  },
];

const perks: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: ShieldCheck,
    title: "Guaranteed car & chauffeur",
    text: "Your vehicle is confirmed before the journey, not left to chance.",
  },
  {
    icon: Wallet,
    title: "Clear, upfront quotes",
    text: "Know the fare before you travel. No surprise add-ons at the end.",
  },
  {
    icon: Headphones,
    title: "Real human support",
    text: "A local team answers the phone — before, during and after your ride.",
  },
];

type RouteCard = {
  icon: LucideIcon;
  title: string;
  badge: string;
  meta: string;
  description: string;
  tags: string[];
  booking: BookingPrefill;
};

const routeCards: RouteCard[] = [
  {
    icon: Plane,
    title: "Pune ↔ Mumbai & Airport",
    badge: "Bestseller",
    meta: "~150 km · 3–3.5 hrs via Expressway",
    description:
      "Smooth air-conditioned rides on the Mumbai–Pune Expressway to Mumbai airport (BOM), Navi Mumbai and South Mumbai, with one-way drops and returns.",
    tags: ["Mumbai Airport", "Expressway", "One way"],
    booking: { tripType: "One Way", drop: "Mumbai / BOM Airport" },
  },
  {
    icon: Landmark,
    title: "Pune ↔ Shirdi & Shani Shingnapur",
    badge: "Pilgrimage",
    meta: "~185 km · 4–5 hrs via NH60",
    description:
      "Comfortable darshan trips to Sai Baba’s Shirdi and Shani Shingnapur, with Shirdi airport pickups and family-friendly stops.",
    tags: ["Shirdi", "Shani Shingnapur", "Family trips"],
    booking: { tripType: "Round Trip", drop: "Shirdi / Shani Shingnapur" },
  },
  {
    icon: Mountain,
    title: "Pune ↔ Mahabaleshwar & Panchgani",
    badge: "Hill escape",
    meta: "~120 km · 3 hrs via Satara Road",
    description:
      "Weekend hill-station getaways with strawberry farms, Venna Lake and Kaas Plateau viewpoints — we handle the ghat driving.",
    tags: ["Mahabaleshwar", "Panchgani", "Weekend trip"],
    booking: { tripType: "Round Trip", drop: "Mahabaleshwar / Panchgani" },
  },
  {
    icon: MapPinned,
    title: "Pune ↔ Lonavala & Khandala",
    badge: "Quick getaway",
    meta: "~65 km · 1.5 hrs",
    description:
      "Monsoon drives, resort stays and day trips to Lonavala, Khandala and Lavasa with flexible pickup and waiting times.",
    tags: ["Lonavala", "Khandala", "Day trip"],
    booking: { tripType: "Round Trip", drop: "Lonavala / Khandala" },
  },
  {
    icon: Navigation,
    title: "Pune ↔ Nashik & Trimbakeshwar",
    badge: "Temple circuit",
    meta: "~210 km · 4.5 hrs",
    description:
      "Reliable intercity rides for Nashik, Trimbakeshwar and Saptashrungi darshan, vineyard visits and business travel.",
    tags: ["Nashik", "Trimbakeshwar", "Vineyards"],
    booking: { tripType: "One Way", drop: "Nashik / Trimbakeshwar" },
  },
  {
    icon: Route,
    title: "Pune ↔ Goa & Konkan",
    badge: "Long haul",
    meta: "~450 km · 9–10 hrs",
    description:
      "Chauffeur-driven holidays to Goa and the Konkan coast, planned around your pace, meal breaks and overnight stops.",
    tags: ["Goa", "Kolhapur", "Konkan beaches"],
    booking: { tripType: "Round Trip", drop: "Goa / Konkan" },
  },
];

const popularSearches = [
  "Pune to Mumbai",
  "Mumbai to Pune",
  "Pune to Shirdi",
  "Pune airport taxi",
  "Mahabaleshwar tour package",
  "Pune to Goa",
];

type Tour = {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  srcSet: string;
  alt: string;
  /** Width / height of the photo, so the card shows it uncropped. */
  ratio: string;
  icon: LucideIcon;
  points: { icon: LucideIcon; text: string }[];
  cta: string;
  booking: BookingPrefill;
};

const tours: Tour[] = [
  {
    eyebrow: "Sacred journeys",
    title: "Shirdi & Ashtavinayak Darshan",
    description:
      "Travel with ease on a spiritual journey to Shirdi, Shani Shingnapur and the Ashtavinayak temples, with a chauffeur who handles the highways and ghats.",
    image: "/tour-temple-1451.webp",
    srcSet:
      "/tour-temple-800.webp 800w, /tour-temple-1200.webp 1200w, /tour-temple-1451.webp 1451w",
    alt: "A white marble temple glowing at sunset",
    ratio: "1451 / 894",
    icon: Landmark,
    points: [
      { icon: CarFront, text: "Chauffeur-driven" },
      { icon: CalendarDays, text: "Your dates" },
      { icon: Users, text: "Family friendly" },
    ],
    cta: "Ask About the Yatra",
    booking: {
      tripType: "Round Trip",
      drop: "Shirdi & Ashtavinayak Darshan",
      notes: "Shirdi / Ashtavinayak darshan tour enquiry",
    },
  },
  {
    eyebrow: "Hills & coast",
    title: "Mahabaleshwar & Goa Tour Package",
    description:
      "Let the winding ghats, cool air and sweeping valleys do the talking. We handle the driving while you stay present for the view.",
    image: "/tour-beach-1600.webp",
    srcSet:
      "/tour-beach-800.webp 800w, /tour-beach-1200.webp 1200w, /tour-beach-1600.webp 1600w",
    alt: "A palm-fringed beach at sunset",
    ratio: "1672 / 941",
    icon: TreePalm,
    points: [
      { icon: Mountain, text: "Flexible stops" },
      { icon: CarFront, text: "Ghat-ready cars" },
      { icon: Route, text: "Custom itinerary" },
    ],
    cta: "Plan My Holiday",
    booking: {
      tripType: "Round Trip",
      drop: "Mahabaleshwar / Goa Tour Package",
      notes: "Mahabaleshwar / Goa tour package enquiry",
    },
  },
];

const faqs: FaqItem[] = [
  {
    question: "How do I book a cab with Veera Tours & Travels?",
    answer:
      "Use the booking form on this page, call +91 96968 88585 or message us on WhatsApp. Share your pickup, destination, date and group size. We’ll confirm the vehicle, chauffeur and fare before your journey.",
  },
  {
    question: "Do you provide airport transfers?",
    answer:
      "Yes. We arrange airport pickups and drops for Pune (PNQ), Mumbai (BOM) and Shirdi (SAG), as well as local Pune transfers. Add your flight details when booking and we’ll plan around your arrival.",
  },
  {
    question: "Can I book a one-way outstation cab?",
    answer:
      "Yes. One-way drops are available to Mumbai, Shirdi, Nashik, Mahabaleshwar, Goa and other destinations. Tell us your route and we’ll quote for the journey you actually need.",
  },
  {
    question: "What vehicles are available?",
    answer:
      "We can arrange sedans, premium SUVs, spacious MPVs and tempo travellers depending on your route and group size. If you have a preference, mention it in the booking form and we’ll confirm availability.",
  },
  {
    question: "How are fares calculated?",
    answer:
      "Your quote is based on the route, vehicle, travel dates and any waiting time. We confirm the fare on WhatsApp before you book, so there are no surprises. Tolls, parking and state permits can vary by route and are explained upfront.",
  },
  {
    question: "Do you organise tour packages?",
    answer:
      "Yes. We plan chauffeur-driven tours such as Shirdi and Ashtavinayak darshan, Mahabaleshwar and Goa holidays, along with custom itineraries. Share your dates and the places you’d like to visit and we’ll put together a route.",
  },
];

function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  align?: "center" | "left";
}) {
  return (
    <div
      className={`section-heading${align === "left" ? " is-left" : ""}`}
      data-reveal
    >
      <span className="kicker">
        <Sparkles aria-hidden="true" />
        {eyebrow}
      </span>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

function Marquee() {
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {[0, 1].map((copy) => (
          <div className="marquee-group" key={copy}>
            {marqueeItems.map((item) => (
              <span className="marquee-item" key={`${copy}-${item}`}>
                <Star />
                {item}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <ScrollEffects />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <SiteHeader />

      <main id="main-content">
        <Hero />
        <div className="checker-strip" aria-hidden="true" />
        <Marquee />

        <section className="assurance" aria-label="Booking assurances">
          <div className="shell assurance-grid">
            {assurances.map(({ icon: Icon, title, text }, index) => (
              <div
                className="assurance-item"
                key={title}
                data-reveal
                style={delay(index, 60)}
              >
                <span className="assurance-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="section services-section" id="services">
          <div className="shell">
            <SectionHeading
              eyebrow="What we offer"
              title={
                <>
                  Premium rides for every{" "}
                  <span className="gold">kind of journey.</span>
                </>
              }
              description="Whether it’s a quick city run or a multi-day mountain escape, Veera Tours & Travels delivers clean cars, courteous drivers and clear pricing."
            />

            <div className="service-grid" onPointerMove={trackSpotlight}>
              {services.map(({ photo, title, tag, description, label, booking }, index) => (
                <article
                  className="service-card has-photo"
                  key={title}
                  data-reveal
                  style={delay(index % 3, 80)}
                >
                  <div className="service-photo">
                    <img
                      src={`/${photo}-960.webp`}
                      srcSet={`/${photo}-640.webp 640w, /${photo}-960.webp 960w, /${photo}-1254.webp 1254w`}
                      sizes="(max-width: 700px) 92vw, (max-width: 1024px) 46vw, 31vw"
                      width={960}
                      height={960}
                      alt={title}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="service-body">
                    <span className="service-tag">{tag}</span>
                    <h3>{title}</h3>
                    {/* the photo already shows the copy; keep it for screen readers and search */}
                    <p className="service-desc">{description}</p>
                    <button
                      type="button"
                      className="service-link"
                      onClick={() =>
                        openBooking({
                          ...booking,
                          notes:
                            booking.notes ?? `${title} enquiry from the website.`,
                        })
                      }
                    >
                      <span>{label}</span>
                      <span className="service-link-arrow">
                        <ArrowUpRight aria-hidden="true" />
                      </span>
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="service-perks">
              {perks.map(({ icon: Icon, title, text }, index) => (
                <div
                  className="perk-card"
                  key={title}
                  data-reveal
                  style={delay(index, 80)}
                >
                  <span className="perk-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="section-more" data-reveal>
              <Link className="btn btn-ghost" href="/services">
                View all services
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>

            <div className="inline-cta" data-reveal>
              <span className="inline-cta-glow" aria-hidden="true" />
              <div>
                <span className="mini-label">Custom itineraries</span>
                <h3>Need a route that isn’t on the list?</h3>
                <p>
                  Tell us where you’re starting and where you need to be. We’ll
                  shape the cars, chauffeurs and timing around your plans.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-gold"
                onClick={() =>
                  openBooking({
                    notes: "Custom route or group tour enquiry",
                  })
                }
              >
                Request a custom quote
                <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <section className="section routes-section" id="routes">
          <div className="shell">
            <SectionHeading
              eyebrow="Popular intercity routes"
              title={
                <>
                  Go farther with a{" "}
                  <span className="gold">fare you know.</span>
                </>
              }
              description="Reliable doorstep pickups, one-way drops and airport transfers connecting Pune with Mumbai, Shirdi, Nashik and the hill stations."
            />

            <div className="route-grid">
              {routeCards.map(({ icon: Icon, title, badge, meta, description, tags, booking }, index) => (
                <article
                  className="route-card"
                  key={title}
                  data-reveal
                  style={delay(index % 3, 80)}
                >
                  <div className="route-top">
                    <span className="route-badge">{badge}</span>
                    <span className="route-icon">
                      <Icon aria-hidden="true" />
                    </span>
                  </div>
                  <h3>{title}</h3>
                  <span className="route-meta">
                    <Clock3 aria-hidden="true" />
                    {meta}
                  </span>
                  <p>{description}</p>
                  <div className="route-tags">
                    {tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <div className="route-footer">
                    <small>Doorstep pickup</small>
                    <button
                      type="button"
                      onClick={() =>
                        openBooking({
                          ...booking,
                          notes: `Route enquiry: ${title}`,
                        })
                      }
                    >
                      Book this route
                      <ArrowUpRight aria-hidden="true" />
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="route-banner" data-reveal>
              <div>
                <span className="mini-label">Across Maharashtra & all India</span>
                <h3>Looking for a different destination?</h3>
                <p>
                  We drive beyond the usual routes — across Goa, Gujarat,
                  Karnataka and Madhya Pradesh. Send us your itinerary and we’ll
                  quote it clearly.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-gold"
                onClick={() =>
                  openBooking({ notes: "Enquiry for a different destination" })
                }
              >
                Request a route quote
                <ArrowRight aria-hidden="true" />
              </button>
            </div>

            <div className="section-more" data-reveal>
              <Link className="btn btn-ghost" href="/destinations">
                Explore all destinations
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>

            <div className="route-pills-wrap" data-reveal>
              <span className="route-pills-label">
                <Star aria-hidden="true" />
                Popular searches
              </span>
              <div className="route-pills">
                {popularSearches.map((search) => (
                  <button
                    type="button"
                    className="route-pill"
                    key={search}
                    onClick={() =>
                      openBooking({
                        drop: search,
                        notes: `Popular route enquiry: ${search}`,
                      })
                    }
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section tours-section" id="tours">
          <div className="shell">
            <SectionHeading
              eyebrow="Curated for the road"
              title={
                <>
                  Go where your heart is{" "}
                  <span className="gold">calling.</span>
                </>
              }
              description="Handpicked tour packages for spiritual journeys, scenic getaways and refreshing road trips — all with the comfort of a private, chauffeur-driven ride."
            />

            <div className="tour-grid">
              {tours.map((tour, index) => (
                <article
                  className="tour-card"
                  key={tour.title}
                  data-reveal="scale"
                  style={delay(index, 120)}
                >
                  <div className="tour-media" style={{ aspectRatio: tour.ratio }}>
                    <img
                      src={tour.image}
                      srcSet={tour.srcSet}
                      sizes="(max-width: 900px) 100vw, 50vw"
                      width={1600}
                      height={900}
                      alt={tour.alt}
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="kicker">
                      <tour.icon aria-hidden="true" />
                      {tour.eyebrow}
                    </span>
                  </div>
                  <div className="tour-content">
                    <h3>{tour.title}</h3>
                    <p>{tour.description}</p>
                    <div className="tour-points">
                      {tour.points.map(({ icon: PointIcon, text }) => (
                        <span key={text}>
                          <PointIcon aria-hidden="true" />
                          {text}
                        </span>
                      ))}
                    </div>
                    <div className="tour-footer">
                      <span className="tour-meta">
                        <MapPin aria-hidden="true" />
                        Private, chauffeur-driven
                      </span>
                      <button
                        type="button"
                        className="btn btn-gold"
                        onClick={() => openBooking(tour.booking)}
                      >
                        {tour.cta}
                        <ArrowUpRight aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="tour-note" data-reveal>
              <span className="tour-note-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 96 64"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M26 6c-7 0-12 5-12 12 0 9 12 22 12 22s12-13 12-22c0-7-5-12-12-12Z" />
                  <circle cx="26" cy="18" r="4.5" />
                  <path d="M32 46c12 5 20-4 30-9" strokeDasharray="0.5 6" />
                  <path d="M70 2c-5 0-9 4-9 9 0 7 9 16 9 16s9-9 9-16c0-5-4-9-9-9Z" />
                  <circle cx="70" cy="11" r="3.2" />
                </svg>
              </span>
              <div className="tour-note-copy">
                <b>Have another destination in mind?</b>
                <span>
                  We build custom tour itineraries across Maharashtra and
                  beyond.
                </span>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() =>
                  openBooking({
                    tripType: "Round Trip",
                    notes: "Custom tour itinerary enquiry",
                  })
                }
              >
                Create My Tour
                <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <section className="section about-section" id="about">
          <span className="about-wave" aria-hidden="true" />
          <div className="shell about-grid">
            <div className="about-media" data-reveal="left">
              <AboutPhotos />
            </div>

            <div className="about-copy" data-reveal="right">
              <span className="kicker">
                <Plane aria-hidden="true" />
                The Veera way
              </span>
              <h2>
                Good travel begins with a{" "}
                <span className="gold">trusted ride.</span>
              </h2>
              <p>
                Veera Tours & Travels is your Pune travel partner for
                airport cabs, one-way drops, outstation taxis and inspiring road
                trips across India.
              </p>

              <ul className="about-feats">
                <li>
                  <span className="about-feat-icon">
                    <CarFront aria-hidden="true" />
                  </span>
                  Local Pune knowledge
                </li>
                <li>
                  <span className="about-feat-icon">
                    <Plane aria-hidden="true" />
                  </span>
                  Airport & outstation specialists
                </li>
                <li>
                  <span className="about-feat-icon">
                    <Headphones aria-hidden="true" />
                  </span>
                  Personal, 24/7 support
                </li>
              </ul>

              <div className="about-contacts">
                <a href={site.primaryPhone.href}>
                  <span className="about-phone-icon">
                    <Phone aria-hidden="true" />
                  </span>
                  {site.primaryPhone.display}
                </a>
                <a href={site.secondaryPhone.href}>
                  <span className="about-phone-icon">
                    <Phone aria-hidden="true" />
                  </span>
                  {site.secondaryPhone.display}
                </a>
              </div>

              <div className="about-actions">
                <button
                  type="button"
                  className="btn btn-gold"
                  onClick={() => openBooking()}
                >
                  Book your ride
                  <ArrowRight aria-hidden="true" />
                </button>
                <a
                  className="btn btn-ghost"
                  href={whatsappLink(
                    "Hi Veera Tours & Travels, I'd like to know more about your taxi services.",
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  <WhatsAppIcon aria-hidden="true" />
                  WhatsApp us
                </a>
              </div>
            </div>
          </div>

          {/* decorative route: dashed road ending at a map pin */}
          <span className="about-route" aria-hidden="true">
            <svg className="about-route-path" viewBox="0 0 240 120" fill="none">
              <path
                d="M8 112 C 60 100, 90 108, 128 90 S 196 70, 212 22"
                stroke="rgba(60,184,242,0.55)"
                strokeWidth="2"
                strokeDasharray="6 7"
                strokeLinecap="round"
              />
            </svg>
            <CarFront className="about-route-car" />
            <MapPin className="about-route-pin" />
          </span>
        </section>

        <section className="section why-section" id="why-us">
          <div className="shell">
            <div className="why-grid">
              <div className="why-copy" data-reveal="left">
                <span className="kicker">Why choose Veera</span>
                <h2>
                  Comfortable, safe and{" "}
                  <span className="gold">always on time.</span>
                </h2>
                <p>
                  Travel across Maharashtra and India should be simple, safe and pleasant.
                  Veera Tours & Travels delivers clean cars, courteous
                  chauffeurs and clear pricing for city and outstation journeys.
                </p>
                <div className="why-actions">
                  <button
                    type="button"
                    className="btn btn-gold"
                    onClick={() => openBooking()}
                  >
                    Book your ride
                    <ArrowRight aria-hidden="true" />
                  </button>
                  <a
                    className="btn btn-ghost"
                    href={whatsappLink()}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <WhatsAppIcon aria-hidden="true" />
                    WhatsApp us
                  </a>
                </div>
                <div className="why-note">
                  <ShieldCheck aria-hidden="true" />
                  <span>
                    A local team, a confirmed car and a real person to call.
                  </span>
                </div>
              </div>

              <div className="why-cards">
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

            <div className="fleet-block" id="fleet">
              <div className="fleet-heading" data-reveal>
                <div>
                  <span className="mini-label">Our vehicle options</span>
                  <h3>Select the right car for your journey.</h3>
                  <p>
                    All vehicles are cleaned and comfort-checked before every
                    ride. Every car is driven by a polite, licensed
                    professional.
                  </p>
                </div>
                <span className="fleet-note">
                  Available on request · Subject to your route and dates
                </span>
              </div>

              <div className="fleet-grid">
                {fleet.map(({ icon: Icon, photo, title, seats, luggage, description }, index) => (
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
                      <span>
                        <Users aria-hidden="true" />
                        {seats}
                      </span>
                      <span>
                        <Luggage aria-hidden="true" />
                        {luggage}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        openBooking({
                          vehicle: title,
                          notes: `Vehicle request: ${title}`,
                        })
                      }
                    >
                      Request this vehicle
                      <ArrowUpRight aria-hidden="true" />
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section faq-section" id="faqs">
          <div className="shell">
            <SectionHeading
              eyebrow="Got questions? We have answers."
              title={
                <>
                  Frequently asked <span className="gold">questions.</span>
                </>
              }
              description="Everything you need to plan a smooth booking with Veera Tours & Travels, from airport transfers to outstation fares."
            />

            <FaqAccordion items={faqs} />

            <div className="faq-help" data-reveal>
              <span>Didn’t find the answer you were looking for?</span>
              <a href={site.primaryPhone.href}>
                <Phone aria-hidden="true" />
                Call {site.primaryPhone.display}
              </a>
              <a
                href={whatsappLink(
                  "Hi Veera Tours & Travels, I have a question about booking a cab.",
                )}
                target="_blank"
                rel="noreferrer"
              >
                <WhatsAppIcon aria-hidden="true" />
                Ask on WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />

      <FloatingActions />
      <BookingModal />
    </>
  );
}
