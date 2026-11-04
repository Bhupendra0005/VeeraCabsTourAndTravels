import type { Metadata } from "next";
import {
  ArrowUpRight,
  Clock3,
  Mail,
  MapPin,
  Navigation,
  Phone,
} from "lucide-react";
import { BookButton } from "@/components/site/book-button";
import { ContactForm } from "@/components/site/contact-form";
import { PageShell } from "@/components/site/page-shell";
import { PageHero, SectionHead, delay } from "@/components/site/page-parts";
import {
  mapEmbedUrl,
  mapsDirectionsUrl,
  mapsOpenUrl,
  site,
  whatsappLink,
} from "@/lib/site";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Call, WhatsApp or visit Veera Tours & Travels at Monal Park, Hadapsar, Pune 411028 for taxi bookings, airport transfers and tour packages.",
  alternates: { canonical: "/contact" },
};

const mapEmbed = mapEmbedUrl();
const mapsUrl = mapsOpenUrl();
const directionsUrl = mapsDirectionsUrl();

const quickContacts = [
  {
    icon: Phone,
    label: "Call us 24/7",
    value: site.primaryPhone.display,
    href: site.primaryPhone.href,
    tone: "",
  },
  {
    icon: WhatsAppIcon,
    label: "WhatsApp booking",
    value: "Chat with our team",
    href: whatsappLink(),
    tone: "is-whatsapp",
    external: true,
  },
  {
    icon: Mail,
    label: "Email us",
    value: site.email,
    href: `mailto:${site.email}`,
    tone: "",
  },
  {
    icon: MapPin,
    label: "Visit our office",
    value: "Hadapsar, Pune",
    href: mapsUrl,
    tone: "",
    external: true,
  },
];

export default function ContactPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Contact us"
        title={
          <>
            Talk to a local, <em>not a bot.</em>
          </>
        }
        description="Call or message us with your route and date. We will take care of the rest."
        crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
        imageBase="contact-hero"
        mobileImageBase="contact-hero-mobile"
        imageRatio="1122 / 1402"
        overlay
        vivid
      >
        <BookButton>Book your ride</BookButton>
      </PageHero>

      <section className="section cx-section">
        <div className="shell">
          <div className="cx-cards">
            {quickContacts.map((item, index) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  className={`cx-card ${item.tone}`}
                  href={item.href}
                  style={delay(index)}
                  data-reveal
                  {...(item.external
                    ? { target: "_blank", rel: "noreferrer" }
                    : {})}
                >
                  <span className="cx-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <span className="cx-card-copy">
                    <small>{item.label}</small>
                    <b>{item.value}</b>
                  </span>
                  <ArrowUpRight className="cx-arrow" aria-hidden="true" />
                </a>
              );
            })}
          </div>

          <div className="cx-split">
            <div className="cx-form-card" data-reveal>
              <span className="mini-label">Send an enquiry</span>
              <h2>Tell us about your trip</h2>
              <p>
                Share the basics and we will reply on WhatsApp with the fare and
                the best vehicle for your route.
              </p>
              <ContactForm />
            </div>

            <aside className="cx-info" data-reveal="right">
              <span className="contact-status">
                <i aria-hidden="true" />
                Open now · 24/7
              </span>
              <h3>Veera Tours &amp; Travels</h3>

              <ul className="cx-info-list">
                <li>
                  <MapPin aria-hidden="true" />
                  <span>
                    <small>Office address</small>
                    <b>{site.address.line1}</b>
                    {site.address.line2}
                  </span>
                </li>
                <li>
                  <Clock3 aria-hidden="true" />
                  <span>
                    <small>Working hours</small>
                    <b>{site.hours}</b>
                    Airport and late-night pickups included
                  </span>
                </li>
                <li>
                  <Phone aria-hidden="true" />
                  <span>
                    <small>Alternate number</small>
                    <a href={site.secondaryPhone.href}>
                      <b>{site.secondaryPhone.display}</b>
                    </a>
                  </span>
                </li>
              </ul>

              <a
                className="btn btn-gold cx-directions"
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
              >
                <Navigation aria-hidden="true" />
                Get directions
              </a>
            </aside>
          </div>
        </div>
      </section>

      <section className="cx-map-section" aria-labelledby="cx-map-title">
        <div className="shell">
          <SectionHead
            eyebrow="Find us"
            title={
              <span id="cx-map-title">
                Right in <em>Hadapsar, Pune</em>
              </span>
            }
            description="Drop by the office or share your pickup point and we will come to you."
          />
          <div className="cx-map-wrap" data-reveal="scale">
            <div className="cx-map-frame">
              <iframe
                title="Veera Tours & Travels on Google Maps"
                src={mapEmbed}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
            <div className="cx-map-card">
              <span className="mini-label">Our office</span>
              <b>{site.address.line1}</b>
              <p>{site.address.line2}</p>
              <div className="cx-map-actions">
                <a
                  className="btn btn-gold"
                  href={directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Navigation aria-hidden="true" />
                  Directions
                </a>
                <a
                  className="btn btn-ghost"
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open map
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
