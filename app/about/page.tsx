import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Clock3, MapPin, Phone } from "lucide-react";
import { BookButton, WhatsAppButton } from "@/components/site/book-button";
import { AboutPhotos } from "@/components/site/about-photos";
import { PageShell } from "@/components/site/page-shell";
import { CtaBand, PageHero, SectionHead, delay } from "@/components/site/page-parts";
import { resolveIcon } from "@/lib/cms/icons";
import { toAboutPhotos } from "@/lib/cms/about-photos";
import { photoSrc, photoSrcSet } from "@/lib/cms/images";
import { getAbout, getAreas, getDestinations, getFeatures, getFleet, getServices, getSite } from "@/lib/server/cms/content";

/** Everything on this page is edited in Admin > Pages > About page. */

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getAbout();
  return { title: seo.title || "About Us", description: seo.description || undefined, alternates: { canonical: "/about" } };
}

/** A heading made of two parts: the plain words, then the highlighted ones (any of them may be empty). */
function Heading({ start, highlight, tag }: { start: string; highlight: string; tag: "em" | "gold" }) {
  return (
    <>
      {start}
      {start && highlight ? " " : ""}
      {highlight ? tag === "em" ? <em>{highlight}</em> : <span className="gold">{highlight}</span> : null}
    </>
  );
}

export default async function AboutPage() {
  const [about, areas, destinations, features, fleet, servicePages, site] = await Promise.all([
    getAbout(),
    getAreas(),
    getDestinations(),
    getFeatures(),
    getFleet(),
    getServices(),
    getSite(),
  ]);
  const counts = { destinations: destinations.length, areas: areas.length, services: servicePages.length, fleet: fleet.length } as const;
  const stats = about.stats
    .map((stat) => ({
      label: stat.label,
      value: stat.source === "manual" ? stat.value : String(counts[stat.source as keyof typeof counts] ?? stat.value),
    }))
    .filter((stat) => stat.value);
  const photos = toAboutPhotos(about.photos.items);

  return (
    <PageShell>
      <PageHero
        eyebrow={about.hero.eyebrow}
        title={<Heading start={about.hero.titleStart} highlight={about.hero.titleHighlight} tag="em" />}
        description={about.hero.description}
        crumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
        imageBase="hero-pune"
        imageUrl={about.hero.image || undefined}
        imageRatio="16 / 9"
        vivid
      >
        <BookButton>{about.hero.bookLabel || "Book your ride"}</BookButton>
        <WhatsAppButton />
      </PageHero>

      {/* Story */}
      <section className="section ab-story-section">
        <div className="shell ab-story">
          <div className="ab-media" data-reveal="left">
            <AboutPhotos photos={photos} badge={about.photos.badge} />
            {about.photos.openTitle || about.photos.openText ? (
              <div className="ab-float">
                <span className="ab-float-dot" aria-hidden="true" />
                <span>
                  <b>{about.photos.openTitle}</b>
                  <small>{about.photos.openText}</small>
                </span>
              </div>
            ) : null}
          </div>

          <div className="ab-copy" data-reveal="right">
            <span className="mini-label">{about.story.label}</span>
            <h2>
              <Heading start={about.story.titleStart} highlight={about.story.titleHighlight} tag="em" />
            </h2>
            {about.story.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {about.story.values.length > 0 ? (
              <ul className="ab-values">
                {about.story.values.map((item) => (
                  <li key={item}>
                    <Check aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </section>

      {/* Stats */}
      {stats.length > 0 ? (
        <section className="ab-stats-section">
          <div className="shell">
            <div className="ab-stats" data-reveal="scale">
              {/* words such as "All Over India" are set smaller than a short number */}
              {stats.map((stat) => (
                <div className={stat.value.length > 7 ? "ab-stat ab-stat--text" : "ab-stat"} key={stat.label}>
                  <b>{stat.value}</b>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* How it works */}
      {about.steps.items.length > 0 ? (
        <section className="section">
          <div className="shell">
            <SectionHead
              eyebrow={about.steps.label}
              title={<Heading start={about.steps.titleStart} highlight={about.steps.titleHighlight} tag="gold" />}
              description={about.steps.description || undefined}
            />
            <ol className="ab-steps">
              {about.steps.items.map(({ icon, title, text }, index) => {
                const Icon = resolveIcon(icon);
                return (
                  <li className="ab-step" key={`${title}-${index}`} data-reveal style={delay(index, 80)}>
                    <span className="ab-step-icon">
                      <Icon aria-hidden="true" />
                    </span>
                    <span className="ab-step-num">0{index + 1}</span>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      ) : null}

      {/* Why Veera */}
      <section className="section routes-section">
        <div className="shell">
          <SectionHead eyebrow={about.why.label} title={<Heading start={about.why.titleStart} highlight={about.why.titleHighlight} tag="gold" />} />
          <div className="why-cards about-why">
            {features.map(({ icon: Icon, title, text }, index) => (
              <article className="why-card" key={title} data-reveal style={delay(index, 60)}>
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
          <SectionHead eyebrow={about.fleet.label} title={<Heading start={about.fleet.titleStart} highlight={about.fleet.titleHighlight} tag="gold" />} />
          <div className="fleet-grid">
            {fleet.map(({ icon: Icon, photo, image, title, seats, luggage, description }, index) => (
              <article className="fleet-card" key={title} data-reveal style={delay(index, 65)}>
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
            ))}
          </div>
        </div>
      </section>

      {/* Visit */}
      <section className="ab-visit-section">
        <div className="shell">
          <div className="ab-visit" data-reveal>
            <div className="ab-visit-copy">
              <span className="mini-label">{about.visit.label}</span>
              <h3>{about.visit.title}</h3>
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
                  <a href={site.primaryPhone.href} className="whitespace-nowrap">{site.primaryPhone.display}</a>
                  {" · "}
                  <a href={site.secondaryPhone.href} className="whitespace-nowrap">{site.secondaryPhone.display}</a>
                </li>
              </ul>
            </div>
            {about.visit.buttonLabel ? (
              <Link className="btn btn-gold" href={about.visit.buttonLink || "/contact"}>
                {about.visit.buttonLabel}
                <ArrowRight aria-hidden="true" />
              </Link>
            ) : null}
          </div>

          <CtaBand title={about.cta.title} text={about.cta.text} />
        </div>
      </section>
    </PageShell>
  );
}
