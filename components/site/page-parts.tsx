import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  Clock3,
  Landmark,
  Mountain,
  Sparkles,
  Waves,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { BookButton, WhatsAppButton } from "@/components/site/book-button";
import type { BookingPrefill } from "@/components/site/booking";
import {
  destinationCategories,
  type Destination,
  type DestinationCategory,
} from "@/lib/content";

export const categoryIcon: Record<DestinationCategory, LucideIcon> = {
  "hill-station": Mountain,
  temple: Landmark,
  beach: Waves,
  city: Building2,
};

const heroImages: Record<DestinationCategory | "default", string> = {
  "hill-station": "hero2",
  temple: "hero3",
  beach: "hero2",
  city: "hero1",
  default: "hero1",
};

export const delay = (index: number, step = 70) =>
  ({ "--reveal-delay": `${index * step}ms` }) as CSSProperties;

export type Crumb = { label: string; href?: string };

export function PageHero({
  eyebrow,
  title,
  description,
  crumbs,
  image = "default",
  imageBase,
  mobileImageBase,
  vivid = false,
  imageRatio,
  overlay = false,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  crumbs: Crumb[];
  image?: DestinationCategory | "default";
  /** Use a specific hero photo: files named `<imageBase>-800/1200/1600.webp` in /public. */
  imageBase?: string;
  /** Portrait photo for phones: `<mobileImageBase>-480/720/1122.webp` in /public. */
  mobileImageBase?: string;
  /** Show the photo at full brightness with a light overlay (default is a dim backdrop). */
  vivid?: boolean;
  /** Width / height of the photo (e.g. "16 / 9"), used for the uncropped phone banner. */
  imageRatio?: string;
  /** On phones, put the text over the photo instead of below it (needs a photo with empty sky on top). */
  overlay?: boolean;
  children?: ReactNode;
}) {
  const base = imageBase ?? heroImages[image];
  return (
    <section
      className={`page-hero${vivid ? " page-hero--vivid" : ""}${
        overlay ? " page-hero--overlay" : ""
      }`}
      style={
        imageRatio
          ? ({ "--hero-ratio": imageRatio } as CSSProperties)
          : undefined
      }
    >
      <div className="page-hero-media" aria-hidden="true">
        <picture>
          {mobileImageBase ? (
            <source
              media="(max-width: 760px)"
              srcSet={`/${mobileImageBase}-480.webp 480w, /${mobileImageBase}-720.webp 720w, /${mobileImageBase}-1122.webp 1122w`}
              sizes="100vw"
            />
          ) : null}
          <img
            src={`/${base}-1600.webp`}
            srcSet={`/${base}-800.webp 800w, /${base}-1200.webp 1200w, /${base}-1600.webp 1600w`}
            sizes="100vw"
            width={1600}
            height={600}
            alt=""
            decoding="async"
          />
        </picture>
      </div>
      <div className="shell page-hero-inner">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          {crumbs.map((crumb, index) => (
            <span key={crumb.label}>
              {crumb.href ? <a href={crumb.href}>{crumb.label}</a> : crumb.label}
              {index < crumbs.length - 1 ? <i>/</i> : null}
            </span>
          ))}
        </nav>
        <span className="kicker">
          <Sparkles aria-hidden="true" />
          {eyebrow}
        </span>
        <h1>{title}</h1>
        {description ? <p className="page-hero-sub">{description}</p> : null}
        {children ? <div className="page-hero-actions">{children}</div> : null}
      </div>
    </section>
  );
}

export function SectionHead({
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

export function CtaBand({
  label = "Ready when you are",
  title,
  text,
  prefill,
}: {
  label?: string;
  title: string;
  text: string;
  prefill?: BookingPrefill;
}) {
  return (
    <div className="inline-cta" data-reveal>
      <span className="inline-cta-glow" aria-hidden="true" />
      <div>
        <span className="mini-label">{label}</span>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <div className="cta-actions">
        <BookButton prefill={prefill}>Get a quote</BookButton>
        <WhatsAppButton />
      </div>
    </div>
  );
}

export function DestinationCard({
  destination,
  index = 0,
}: {
  destination: Destination;
  index?: number;
}) {
  const Icon = categoryIcon[destination.category];
  const category = destinationCategories.find(
    (item) => item.id === destination.category,
  );
  return (
    <article
      className="route-card"
      data-reveal
      style={delay(index % 3, 80)}
    >
      <div className="route-top">
        <span className="route-badge">{category?.label}</span>
        <span className="route-icon">
          <Icon aria-hidden="true" />
        </span>
      </div>
      <h3>{destination.name}</h3>
      <span className="route-meta">
        <Clock3 aria-hidden="true" />
        {destination.distance} · {destination.duration}
      </span>
      <p>{destination.tagline}</p>
      <div className="route-footer">
        <small>From Pune</small>
        <Link href={`/destinations/${destination.slug}`}>
          View trip
          <ArrowUpRight aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
