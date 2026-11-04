"use client";

import Link from "next/link";
import { ArrowUp, ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { openBooking } from "@/components/site/booking";
import { BookButton } from "@/components/site/book-button";
import { servicePages } from "@/lib/content";
import { mapsOpenUrl, navItems, site, whatsappLink } from "@/lib/site";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14.5 8.4h2.7V5.3h-2.7c-2.4 0-4.3 1.9-4.3 4.3v2.1H7.7v3.1h2.5V21h3.2v-6.2h2.6l.4-3.1h-3v-1.9c0-.8.5-1.4 1.1-1.4Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FloatingActions() {
  return (
    <div className="floating-actions">
      <a
        className="float-btn float-whatsapp"
        href={whatsappLink()}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with Veera Tours & Travels on WhatsApp"
      >
        <span className="float-tip" aria-hidden="true">
          <b>Chat on WhatsApp</b>
          <small>Get your fare in minutes</small>
        </span>
        <WhatsAppIcon aria-hidden="true" />
      </a>
      <a
        className="float-btn float-call"
        href={site.primaryPhone.href}
        aria-label="Call Veera Tours & Travels"
      >
        <span className="float-tip" aria-hidden="true">
          <b>Call us 24/7</b>
          <small>{site.primaryPhone.display}</small>
        </span>
        <Phone aria-hidden="true" />
      </a>
    </div>
  );
}

export function SiteFooter() {
  const contacts = [
    {
      icon: Phone,
      label: "Call us 24/7",
      value: site.primaryPhone.display,
      href: site.primaryPhone.href,
    },
    {
      icon: WhatsAppIcon,
      label: "WhatsApp booking",
      value: "Chat with our team",
      href: whatsappLink(),
      external: true,
      tone: "is-whatsapp",
    },
    {
      icon: Mail,
      label: "Email us",
      value: site.email,
      href: `mailto:${site.email}`,
    },
    {
      icon: MapPin,
      label: "Visit our office",
      value: `${site.address.line1}, ${site.address.line2}`,
      href: mapsOpenUrl(),
      external: true,
    },
  ];

  return (
    <footer className="site-footer">
      <div className="checker-strip" aria-hidden="true" />

      <div className="shell">
        <div className="footer-cta">
          <div>
            <h3>Ready for your next ride?</h3>
            <p>Share your route and date. We reply with a clear fare on WhatsApp.</p>
          </div>
          <div className="footer-cta-actions">
            <BookButton>Book your ride</BookButton>
            <a className="btn btn-ghost" href={site.primaryPhone.href}>
              <Phone aria-hidden="true" />
              {site.primaryPhone.display}
            </a>
          </div>
        </div>
      </div>

      <div className="shell footer-grid">
        <div className="footer-brand">
          <Link
            className="footer-brand-head"
            href="/"
            aria-label="Veera Tours & Travels home"
          >
            <img
              className="brand-logo"
              src="/logo-navbar-96.webp"
              width={249}
              height={48}
              alt="Veera Tours & Travels"
              loading="lazy"
              decoding="async"
            />
          </Link>
          <p>
            Taxi and cab service for all India, proudly based in Pune. Airport
            transfers, outstation rides and tour packages with a personal touch.
          </p>
          <span className="footer-availability">
            <i />
            Available for bookings 24/7
          </span>
          {(site.social.facebook || site.social.instagram) && (
            <div className="socials">
              {site.social.facebook && (
                <a
                  className="social-link"
                  href={site.social.facebook}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Veera Tours & Travels on Facebook"
                >
                  <FacebookIcon />
                </a>
              )}
              {site.social.instagram && (
                <a
                  className="social-link"
                  href={site.social.instagram}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Veera Tours & Travels on Instagram"
                >
                  <InstagramIcon />
                </a>
              )}
            </div>
          )}
        </div>

        <nav className="footer-col" aria-label="Explore">
          <h4>Explore</h4>
          {navItems.map((item) => (
            <Link key={item.id} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href="/areas">Areas We Serve</Link>
          <Link href="/payment-options">Payment Options</Link>
          <Link href="/#faqs">FAQs</Link>
        </nav>

        <nav className="footer-col" aria-label="Services">
          <h4>Services</h4>
          {servicePages.map((service) => (
            <Link key={service.slug} href={`/services/${service.slug}`}>
              {service.title}
            </Link>
          ))}
        </nav>

        <nav className="footer-col" aria-label="Popular routes">
          <h4>Popular routes</h4>
          <Link href="/destinations/mumbai">Pune to Mumbai</Link>
          <Link href="/destinations/shirdi">Pune to Shirdi</Link>
          <Link href="/destinations/mahabaleshwar-panchgani">
            Pune to Mahabaleshwar
          </Link>
          <Link href="/destinations/lonavala-khandala">Pune to Lonavala</Link>
          <Link href="/destinations/goa">Pune to Goa</Link>
          <button
            type="button"
            className="footer-route-link"
            onClick={() => openBooking({ notes: "Footer route enquiry" })}
          >
            Ask about another route
            <ArrowUpRight aria-hidden="true" />
          </button>
        </nav>
      </div>

      <div className="shell">
        <div className="footer-contacts">
          {contacts.map(({ icon: Icon, label, value, href, external, tone }) => (
            <a
              key={label}
              className={`footer-contact-item ${tone ?? ""}`}
              href={href}
              {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              <span className="fci-icon">
                <Icon aria-hidden="true" />
              </span>
              <span className="fci-copy">
                <small>{label}</small>
                <b>{value}</b>
              </span>
            </a>
          ))}
        </div>
      </div>

      <div className="shell footer-bottom">
        <p>
          © {new Date().getFullYear()} Veera Tours & Travels. All rights
          reserved.
        </p>
        <p className="footer-bottom-note">Pune · Maharashtra · All India</p>
        <button
          type="button"
          className="footer-top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
        >
          <ArrowUp aria-hidden="true" />
        </button>
      </div>
    </footer>
  );
}
