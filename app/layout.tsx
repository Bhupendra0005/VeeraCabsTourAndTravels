import type { Metadata, Viewport } from "next";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://veera-cabs.com"),
  title: {
    default: "Veera Tours & Travels | Taxi & Cab Service in Pune, Maharashtra",
    template: "%s | Veera Tours & Travels",
  },
  description:
    "Book taxis, airport transfers, one-way cabs, outstation rides and tour packages with Veera Tours & Travels, Hadapsar, Pune. 24/7 bookings, experienced chauffeurs and clear upfront fares.",
  applicationName: site.name,
  keywords: [
    "Veera Tours & Travels",
    "Veera Cabs",
    "taxi service Pune",
    "cab service Pune",
    "Pune to Mumbai taxi",
    "Pune airport taxi",
    "Hadapsar cab service",
    "Pune to Shirdi cab",
    "outstation cabs Maharashtra",
    "Mahabaleshwar tour package",
    "Goa tour package from Pune",
  ],
  authors: [{ name: site.name }],
  creator: site.name,
  category: "travel",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Veera Tours & Travels | Taxi & Cab Service in Pune",
    description:
      "Airport transfers, one-way cabs, outstation journeys and curated tours across Maharashtra and India. Proudly based in Hadapsar, Pune, available 24/7.",
    type: "website",
    locale: "en_IN",
    siteName: site.name,
    images: [{ url: "/logo.png", width: 458, height: 360, alt: site.name }],
  },
  twitter: {
    card: "summary",
    title: "Veera Tours & Travels | Taxi & Cab Service in Pune",
    description:
      "Reliable taxis, airport transfers and tour packages from Pune. Clear fares, verified chauffeurs and 24/7 support.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0096db",
  colorScheme: "dark",
};

const jsonLd = {
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
      <body>{children}</body>
    </html>
  );
}
