/**
 * The website grouped by page. Each page has sections (tabs); a section edits one content document,
 * or only some of its top-level fields. Saving always keeps the rest of the document untouched.
 */

export type PageSection = {
  id: string;
  label: string;
  /** Icon key, resolved by the admin page. */
  icon: string;
  text: string;
  /** Content document this section edits (see lib/cms/docs.ts). */
  doc: string;
  /** Show only these top-level fields. Omit to show the whole document. */
  fields?: string[];
  /** Where the visitor sees this section, for a "View on website" link. */
  viewPath?: string;
};

export type PageDef = {
  id: string;
  label: string;
  icon: string;
  description: string;
  viewPath: string;
  sections: PageSection[];
};

export const PAGES: PageDef[] = [
  {
    id: "home",
    label: "Home page",
    icon: "home",
    description: "Everything on the home page, section by section.",
    viewPath: "/",
    sections: [
      { id: "announcement", label: "Announcement bar", icon: "megaphone", text: "The thin message bar at the very top of every page.", doc: "home", fields: ["announcement"], viewPath: "/" },
      { id: "hero", label: "Hero", icon: "image", text: "The big heading, sub-heading, badges, button and photo at the top.", doc: "home", fields: ["hero"], viewPath: "/" },
      { id: "trust", label: "Trust points", icon: "shield", text: "The strip of short promises under the hero.", doc: "home", fields: ["assurances"], viewPath: "/" },
      { id: "strips", label: "Strips & searches", icon: "tags", text: "Scrolling words and the popular searches under the booking box.", doc: "home", fields: ["marquee", "popularSearches"], viewPath: "/" },
      { id: "services", label: "Services", icon: "sparkles", text: "The services shown on the home page and their own pages.", doc: "services", viewPath: "/#services" },
      { id: "destinations", label: "Tours & destinations", icon: "map", text: "Places people travel to. Each one gets its own page.", doc: "destinations", viewPath: "/#tours" },
      { id: "why", label: "Why choose us", icon: "star", text: "The reasons to book with you.", doc: "features", viewPath: "/#why-us" },
      { id: "fleet", label: "Fleet", icon: "car", text: "Your vehicles. Names must match the vehicle types in Routes & fares.", doc: "fleet", viewPath: "/#fleet" },
      { id: "faqs", label: "FAQs", icon: "help", text: "Questions shown at the bottom of the home page.", doc: "faqs", viewPath: "/#faqs" },
    ],
  },
  {
    id: "contact",
    label: "Contact & business",
    icon: "phone",
    description: "Business details used on the Contact page, footer, invoices and emails.",
    viewPath: "/contact",
    sections: [
      { id: "business", label: "Business", icon: "building", text: "Name, tagline, opening hours and GSTIN.", doc: "site_info", fields: ["name", "shortName", "tagline", "hours", "gstin"], viewPath: "/contact" },
      { id: "phones", label: "Phones & email", icon: "phone", text: "How customers reach you.", doc: "site_info", fields: ["primaryPhone", "secondaryPhone", "whatsapp", "email"], viewPath: "/contact" },
      { id: "address", label: "Address & map", icon: "map-pin", text: "Your shop address and Google Maps links.", doc: "site_info", fields: ["address", "mapQuery", "mapEmbedSrc", "mapShareUrl"], viewPath: "/contact" },
      { id: "social", label: "Social links", icon: "share", text: "Facebook and Instagram pages.", doc: "site_info", fields: ["facebook", "instagram"], viewPath: "/contact" },
    ],
  },
  {
    id: "services",
    label: "Services",
    icon: "sparkles",
    description: "Service pages: airport transfers, outstation, local hire and more.",
    viewPath: "/services",
    sections: [{ id: "services", label: "Services", icon: "sparkles", text: "Each service has its own page, with questions and answers.", doc: "services", viewPath: "/services" }],
  },
  {
    id: "destinations",
    label: "Destinations",
    icon: "map",
    description: "Places people travel to from Pune.",
    viewPath: "/destinations",
    sections: [{ id: "destinations", label: "Destinations", icon: "map", text: "Each destination gets its own page.", doc: "destinations", viewPath: "/destinations" }],
  },
  {
    id: "areas",
    label: "Pune areas",
    icon: "building",
    description: "Pickup areas around Pune.",
    viewPath: "/areas",
    sections: [{ id: "areas", label: "Pune areas", icon: "building", text: "Each area gets its own page.", doc: "areas", viewPath: "/areas" }],
  },
  {
    id: "rate-card",
    label: "Rate card",
    icon: "rupee",
    description: "Rates, vehicles and payment methods shown to customers.",
    viewPath: "/rate-card",
    sections: [
      { id: "rates", label: "Rate card", icon: "rupee", text: "Per-kilometre and package rates by vehicle.", doc: "rate_card", viewPath: "/rate-card" },
      { id: "fleet", label: "Fleet", icon: "car", text: "Your vehicles. Names must match the vehicle types in Routes & fares.", doc: "fleet", viewPath: "/rate-card" },
      { id: "payments", label: "Payment methods", icon: "wallet", text: "The ways customers can pay you.", doc: "payment_methods", viewPath: "/payment-options" },
    ],
  },
  {
    id: "seo",
    label: "SEO",
    icon: "globe",
    description: "How the website appears in Google and when shared.",
    viewPath: "/",
    sections: [{ id: "seo", label: "Search & sharing", icon: "globe", text: "Default title, description, keywords and share image.", doc: "seo", viewPath: "/" }],
  },
];

export function getPage(id: string): PageDef | undefined {
  return PAGES.find((page) => page.id === id);
}
