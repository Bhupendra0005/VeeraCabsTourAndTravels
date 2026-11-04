import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, Check } from "lucide-react";
import { BookButton, WhatsAppButton } from "@/components/site/book-button";
import { FaqAccordion } from "@/components/site/faq";
import { PageShell } from "@/components/site/page-shell";
import {
  CtaBand,
  PageHero,
  SectionHead,
} from "@/components/site/page-parts";
import { getServicePage, servicePages } from "@/lib/content";

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams() {
  return servicePages.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getServicePage(slug);
  if (!service) return {};
  return {
    title: service.title,
    description: `${service.summary} Book with Veera Tours & Travels, Hadapsar, Pune.`,
    alternates: { canonical: `/services/${service.slug}` },
  };
}

export default async function ServicePageRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const service = getServicePage(slug);
  if (!service) notFound();

  const others = servicePages.filter((item) => item.slug !== service.slug);

  return (
    <PageShell>
      <PageHero
        eyebrow={service.tag}
        title={service.title}
        description={service.tagline}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Services", href: "/services" },
          { label: service.title },
        ]}
      >
        <BookButton prefill={service.booking}>Book this service</BookButton>
        <WhatsAppButton
          message={`Hi Veera Tours & Travels, I have a question about ${service.title.toLowerCase()}.`}
        />
      </PageHero>

      <section className="section">
        <div className="shell detail-layout">
          <div className="detail-main">
            <div className="prose" data-reveal>
              <h2>Overview</h2>
              {service.intro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <div className="prose" data-reveal>
              <h2>What you get</h2>
              <ul className="check-list">
                {service.whatYouGet.map((item) => (
                  <li key={item}>
                    <Check aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="prose" data-reveal>
              <h2>Ideal for</h2>
              <ul className="check-list">
                {service.idealFor.map((item) => (
                  <li key={item}>
                    <Check aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside className="detail-aside" data-reveal="right">
            <h3>Other services</h3>
            <ul className="aside-links">
              {others.map((item) => (
                <li key={item.slug}>
                  <Link href={`/services/${item.slug}`}>
                    {item.title}
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
            <BookButton prefill={service.booking} className="btn btn-gold aside-btn">
              Get a quote
            </BookButton>
          </aside>
        </div>
      </section>

      <section className="section faq-section">
        <div className="shell">
          <SectionHead
            eyebrow="Questions"
            title={<>Good to <span className="gold">know.</span></>}
          />
          <FaqAccordion items={service.faqs} />
          <CtaBand
            title={`Ready to book ${service.title.toLowerCase()}?`}
            text="Share your date, route and group size. We will confirm the car, chauffeur and fare on WhatsApp."
            prefill={service.booking}
          />
        </div>
      </section>
    </PageShell>
  );
}
