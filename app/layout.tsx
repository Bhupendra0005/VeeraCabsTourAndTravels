import type { Metadata, Viewport } from "next";
import { SiteProvider } from "@/components/site/site-context";
import { ikUrl } from "@/lib/cms/images";
import { getHome, getSeo, getFleet, getServices, getSite } from "@/lib/server/cms/content";
import type { SiteData } from "@/lib/site";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const [seo, site] = await Promise.all([getSeo(), getSite()]);
  const shareImage = seo.shareImage ? ikUrl(seo.shareImage, 1200) : "/logo.png";
  return {
    metadataBase: new URL("https://veera-cabs.com"),
    title: { default: seo.title, template: `%s | ${site.name}` },
    description: seo.description,
    applicationName: site.name,
    keywords: seo.keywords,
    authors: [{ name: site.name }],
    creator: site.name,
    category: "travel",
    icons: { icon: "/favicon.png", shortcut: "/favicon.png", apple: "/apple-touch-icon.png" },
    openGraph: {
      title: seo.title,
      description: seo.description,
      type: "website",
      locale: "en_IN",
      siteName: site.name,
      images: [{ url: shareImage, alt: site.name }],
    },
    twitter: { card: seo.shareImage ? "summary_large_image" : "summary", title: seo.title, description: seo.description, images: [shareImage] },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0096db",
  colorScheme: "dark",
};

function buildJsonLd(site: SiteData) {
  return {
  "@context": "https://schema.org",
  "@type": "TaxiService",
  name: site.name,
  description:
    "Taxi and cab service based in Hadapsar, Pune offering airport transfers, one-way cabs, outstation journeys and tour packages across Maharashtra and India.",
  telephone: site.primaryPhone.href.replace("tel:", ""),
  email: site.email,
  url: "https://veera-cabs.com",
  image: "https://veera-cabs.com/logo.png",
  priceRange: "₹₹",
  address: {
    "@type": "PostalAddress",
    streetAddress: site.address.line1,
    addressLocality: "Pune",
    addressRegion: "Maharashtra",
    postalCode: "411028",
    addressCountry: "IN",
  },
  areaServed: [
    "Pune",
    "Mumbai",
    "Shirdi",
    "Nashik",
    "Mahabaleshwar",
    "Goa",
    "Maharashtra",
    "India",
  ],
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "00:00",
      closes: "23:59",
    },
  ],
  sameAs: [site.social.facebook, site.social.instagram].filter(Boolean),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [site, home, services, fleet] = await Promise.all([getSite(), getHome(), getServices(), getFleet()]);
  const jsonLd = buildJsonLd(site);
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          rel="preload"
          as="image"
          media="(min-width: 761px)"
          href="/hero-pune-1600.webp"
          imageSrcSet="/hero-pune-800.webp 800w, /hero-pune-1200.webp 1200w, /hero-pune-1600.webp 1600w"
          imageSizes="100vw"
          fetchPriority="high"
        />
        <link
          rel="preload"
          as="image"
          media="(max-width: 760px)"
          href="/hero-pune-mobile-720.webp"
          imageSrcSet="/hero-pune-mobile-480.webp 480w, /hero-pune-mobile-720.webp 720w, /hero-pune-mobile-940.webp 940w"
          imageSizes="100vw"
          fetchPriority="high"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <SiteProvider
          site={site}
          announcement={home.announcement}
          services={services.map((service) => ({ slug: service.slug, title: service.title }))}
          vehicles={fleet.map((vehicle) => vehicle.title)}
        >
          {children}
        </SiteProvider>
      </body>
    </html>
  );
}
