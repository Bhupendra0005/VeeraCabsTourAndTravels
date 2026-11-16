/** Built-in defaults. The live values come from Admin > Contact & business (see getSite / useSite). */
export const site: SiteData = {
  name: "Veera Tours & Travels",
  shortName: "Veera",
  tagline: "Tours & Travels",
  primaryPhone: {
    display: "+91 96968 88585",
    raw: "9696888585",
    href: "tel:+919696888585",
  },
  secondaryPhone: {
    display: "+91 99756 83458",
    raw: "9975683458",
    href: "tel:+919975683458",
  },
  whatsapp: "919696888585",
  email: "veeratours5000@gmail.com",
  address: {
    line1: "Shop No B10, Monal Park, Hadapsar",
    line2: "Pune, Maharashtra 411028",
    full: "Shop No B10, Monal Park, Hadapsar, Pune, Maharashtra 411028",
  },
  hours: "Open 24 hours · 7 days a week",
  gstin: "",
  // Google Maps. To pin the exact shop, open it on Google Maps, then
  //  - Share > Embed a map > copy the src="..." URL into embedSrc
  //  - Share > Send a link > copy the link into shareUrl
  // When these are empty the map is found by searching `query`.
  map: {
    query:
      "Veera Tours & Travels, Monal Park, Hadapsar, Pune, Maharashtra 411028",
    embedSrc: "" as string,
    shareUrl: "" as string,
  },
  // Add the client's profile URLs here; icons only render when a URL is set.
  social: {
    facebook: "",
    instagram: "",
  },
};

export const navItems = [
  { label: "Home", href: "/", id: "home" },
  { label: "Book Online", href: "/book", id: "book" },
  { label: "Services", href: "/services", id: "services" },
  { label: "Destinations", href: "/destinations", id: "destinations" },
  { label: "About", href: "/about", id: "about" },
  { label: "Contact", href: "/contact", id: "contact" },
  { label: "My Bookings", href: "/bookings", id: "bookings" },
] as const;

export const tripTypes = [
  "One Way",
  "Round Trip",
  "Airport Transfer",
  "Local Rental",
] as const;

export type TripType = (typeof tripTypes)[number];

export const vehicleOptions = [
  "Any vehicle",
  "Sedan",
  "Premium SUV",
  "Spacious MPV",
  "Tempo Traveller",
] as const;

export const passengerOptions = [
  "1 passenger",
  "2 passengers",
  "3 passengers",
  "4 passengers",
  "5–6 passengers",
  "7+ passengers",
  "12+ passengers",
] as const;

export function whatsappLink(
  message = "Hi Veera Tours & Travels, I'd like to book a cab.",
  from: SiteData = site,
): string {
  return whatsappUrl(from.whatsapp, message);
}

/** Map shown on the contact page: the exact embed link if set, otherwise a search. */
export function mapEmbedUrl(from: SiteData = site): string {
  if (from.map.embedSrc) return from.map.embedSrc;
  return `https://www.google.com/maps?q=${encodeURIComponent(from.map.query)}&z=16&output=embed`;
}

/** "Open map" link. */
export function mapsOpenUrl(from: SiteData = site): string {
  if (from.map.shareUrl) return from.map.shareUrl;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(from.map.query)}`;
}

/** "Get directions" link. */
export function mapsDirectionsUrl(from: SiteData = site): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(from.map.query)}`;
}

/* ------------------------------------------------------------------ */
/* Editable business details (Admin > Contact & business)              */
/* ------------------------------------------------------------------ */

export type SiteData = {
  name: string;
  shortName: string;
  tagline: string;
  primaryPhone: { display: string; raw: string; href: string };
  secondaryPhone: { display: string; raw: string; href: string };
  whatsapp: string;
  email: string;
  address: { line1: string; line2: string; full: string };
  hours: string;
  gstin: string;
  map: { query: string; embedSrc: string; shareUrl: string };
  social: { facebook: string; instagram: string };
};

export type SiteInfoDoc = {
  name: string;
  shortName: string;
  tagline: string;
  primaryPhone: { display: string; raw: string };
  secondaryPhone: { display: string; raw: string };
  whatsapp: string;
  email: string;
  address: { line1: string; line2: string };
  hours: string;
  gstin: string;
  mapQuery: string;
  mapEmbedSrc: string;
  mapShareUrl: string;
  facebook: string;
  instagram: string;
};

const digits = (value: string) => value.replace(/\D/g, "");

/** Turns the stored document into the shape the components use (call links, joined address). */
export function buildSite(info: SiteInfoDoc): SiteData {
  const phone = (p: { display: string; raw: string }) => ({
    display: p.display,
    raw: digits(p.raw),
    href: `tel:+91${digits(p.raw).slice(-10)}`,
  });
  return {
    name: info.name,
    shortName: info.shortName,
    tagline: info.tagline,
    primaryPhone: phone(info.primaryPhone),
    secondaryPhone: phone(info.secondaryPhone),
    whatsapp: digits(info.whatsapp),
    email: info.email,
    address: { ...info.address, full: `${info.address.line1}, ${info.address.line2}` },
    hours: info.hours,
    gstin: info.gstin,
    map: { query: info.mapQuery, embedSrc: info.mapEmbedSrc, shareUrl: info.mapShareUrl },
    social: { facebook: info.facebook, instagram: info.instagram },
  };
}

export function whatsappUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
