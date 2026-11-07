import type { Metadata } from "next";
import {
  BadgeIndianRupee,
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  Phone,
  Plane,
  ReceiptText,
  Route,
  Users,
} from "lucide-react";
import { BookButton, WhatsAppButton } from "@/components/site/book-button";
import { PageShell } from "@/components/site/page-shell";
import {
  CtaBand,
  PageHero,
  SectionHead,
  delay,
} from "@/components/site/page-parts";
import { FaqAccordion } from "@/components/site/faq";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { photoSrc, photoSrcSet } from "@/lib/cms/images";
import { getFleet, getRateCard, getSite } from "@/lib/server/cms/content";
import { whatsappLink as buildWhatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Rate Card — Cab Fares in Pune",
  description:
    "Vehicle-wise fares for local car hire, outstation trips and airport transfers from Pune with Veera Tours & Travels. Get a clear quote on WhatsApp.",
  alternates: { canonical: "/rate-card" },
};

const factors = [
  { icon: Route, text: "Route and total distance" },
  { icon: Users, text: "Vehicle type and passenger count" },
  { icon: CalendarDays, text: "Travel dates and number of days" },
  { icon: Clock3, text: "Waiting time and overnight halts" },
  {
    icon: ReceiptText,
    text: "Tolls, parking and state permits, explained upfront",
  },
];

const promises = [
  "Fare confirmed before you book",
  "No advance payment",
  "Tolls and permits explained",
  "Quote on WhatsApp in minutes",
];

const services = [
  { key: "local", label: "Local city hire", icon: MapPin },
  { key: "outstation", label: "Outstation", icon: Route },
  { key: "airport", label: "Airport transfer", icon: Plane },
] as const;

const pricingFaqs = [
  {
    question: "How is my fare decided?",
    answer:
      "Mainly by the route and total distance, the vehicle you choose and the number of days. We add up tolls, parking and any permits and tell you the full amount before you book.",
  },
  {
    question: "Do I pay anything to reserve a car?",
    answer:
      "No advance payment is needed to reserve. We confirm the vehicle and fare on WhatsApp, and we explain how payment works for your booking.",
  },
  {
    question: "Are tolls and parking included?",
    answer:
      "We tell you upfront whether they are part of the quote or paid separately, so there are no surprises at the end of the trip.",
  },
  {
    question: "What if my plan changes?",
    answer:
      "Let us know as early as you can. We will explain the options for changing the date, route or vehicle, and any terms that apply, before you confirm.",
  },
  {
    question: "Can I get a fare for a custom route?",
    answer:
      "Yes. Share your pickup, destination, dates and the number of people, and we will quote it clearly, including multi-day and multi-city trips.",
  },
];

export default async function RateCardPage() {
  const [fleet, rateCard, site] = await Promise.all([getFleet(), getRateCard(), getSite()]);
  const whatsappLink = (message?: string) => buildWhatsappLink(message, site);
  const photoOf = (vehicle: string) => {
    const item = fleet.find((entry) => entry.title === vehicle);
    return { photo: item?.photo ?? "fleet-sedan", image: item?.image ?? "" };
  };
  return (
    <PageShell>
      <PageHero
        eyebrow="Rate card"
        title={
          <>
            Clear fares, <em>no surprises.</em>
          </>
        }
        description="Every trip is different, so we quote each route clearly before you travel. Here is how our pricing works."
        crumbs={[{ label: "Home", href: "/" }, { label: "Rate Card" }]}
        imageBase="hero-pune"
        imageRatio="16 / 9"
        vivid
      >
        <BookButton>Get a quote</BookButton>
        <WhatsAppButton />
      </PageHero>

      <section className="section rc-section">
        <div className="shell">
          <SectionHead
            eyebrow="Vehicle-wise fares"
            title={
              <>
                Choose your <span className="gold">vehicle.</span>
              </>
            }
            description="Contact us for the current fare on your route. We confirm the total on WhatsApp before you book."
          />

          <div className="rc-grid">
            {rateCard.map((row, index) => {
              const Icon =
                fleet.find((item) => item.title === row.vehicle)?.icon ??
                Users;
              return (
                <article
                  className="rc-card"
                  key={row.vehicle}
                  data-reveal
                  style={delay(index, 70)}
                >
                  <div className="rc-photo">
                    <img
                      src={photoSrc(photoOf(row.vehicle), 800)}
                      srcSet={photoSrcSet(photoOf(row.vehicle))}
                      sizes="(max-width: 600px) 90vw, (max-width: 1200px) 44vw, 22vw"
                      width={800}
                      height={420}
                      alt={`${row.vehicle} by Veera Tours & Travels`}
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="rc-icon">
                      <Icon aria-hidden="true" />
                    </span>
                  </div>
                  <header className="rc-card-head">
                    <div>
                      <h3>{row.vehicle}</h3>
                      <span className="rc-seats">
                        <Users aria-hidden="true" />
                        {row.seats}
                      </span>
                    </div>
                  </header>

                  <ul className="rc-rows">
                    {services.map(({ key, label, icon: RowIcon }) => {
                      const value = row[key];
                      return (
                        <li key={key}>
                          <span className="rc-row-label">
                            <RowIcon aria-hidden="true" />
                            {label}
                          </span>
                          {value ? (
                            <b className="rc-price">{value}</b>
                          ) : (
                            <span className="rc-request">On request</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  <BookButton
                    className="btn btn-gold rc-cta"
                    prefill={{
                      vehicle: row.vehicle,
                      notes: `Fare enquiry for ${row.vehicle} from the rate card.`,
                    }}
                  >
                    Get a quote
                  </BookButton>
                  <a
                    className="rc-wa"
                    href={whatsappLink(
                      `Hi Veera Tours & Travels, please share the fare for a ${row.vehicle}.`,
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <WhatsAppIcon aria-hidden="true" />
                    Ask on WhatsApp
                  </a>
                </article>
              );
            })}
          </div>

          <ul className="rc-promises" data-reveal>
            {promises.map((item) => (
              <li key={item}>
                <Check aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section rc-factors-section">
        <div className="shell rc-split">
          <div>
            <span className="mini-label" data-reveal>
              How pricing works
            </span>
            <h2 className="rc-title" data-reveal>
              What affects <em>your fare</em>
            </h2>
            <p className="rc-lead" data-reveal>
              We price every trip on its own details, so you only pay for what
              you actually need.
            </p>
            <ul className="rc-factors">
              {factors.map(({ icon: Icon, text }, index) => (
                <li
                  key={text}
                  data-reveal
                  style={delay(index, 60)}
                >
                  <span className="rc-factor-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <aside className="rc-quote" data-reveal="right">
            <span className="rc-quote-icon">
              <BadgeIndianRupee aria-hidden="true" />
            </span>
            <h3>Get an exact fare</h3>
            <p>
              Share your pickup, destination and date. We reply with a clear
              quote, usually within minutes.
            </p>
            <BookButton className="btn btn-gold rc-quote-btn">
              Request a quote
            </BookButton>
            <a
              className="btn btn-ghost rc-quote-btn"
              href={whatsappLink()}
              target="_blank"
              rel="noreferrer"
            >
              <WhatsAppIcon aria-hidden="true" />
              WhatsApp us
            </a>
            <a className="rc-quote-call" href={site.primaryPhone.href}>
              <Phone aria-hidden="true" />
              Call {site.primaryPhone.display}
            </a>
          </aside>
        </div>

        <div className="shell rc-faq">
          <SectionHead
            eyebrow="Pricing questions"
            title={
              <>
                Fares, <span className="gold">explained.</span>
              </>
            }
          />
          <FaqAccordion items={pricingFaqs} />
        </div>

        <div className="shell">
          <CtaBand
            title="Need a fare for a specific route?"
            text="Tell us where you are going and we will quote it clearly, with tolls and permits explained."
          />
        </div>
      </section>
    </PageShell>
  );
}
