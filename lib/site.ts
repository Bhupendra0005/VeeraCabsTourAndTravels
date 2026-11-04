export const site = {
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
} as const;

export const navItems = [
  { label: "Home", href: "/", id: "home" },
  { label: "Services", href: "/services", id: "services" },
  { label: "Destinations", href: "/destinations", id: "destinations" },
  { label: "Rate Card", href: "/rate-card", id: "rate-card" },
  { label: "About", href: "/about", id: "about" },
  { label: "Contact", href: "/contact", id: "contact" },
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
): string {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`;
}

/** Map shown on the contact page: the exact embed link if set, otherwise a search. */
export function mapEmbedUrl(): string {
  if (site.map.embedSrc) return site.map.embedSrc;
  return `https://www.google.com/maps?q=${encodeURIComponent(site.map.query)}&z=16&output=embed`;
}

/** "Open map" link. */
export function mapsOpenUrl(): string {
  if (site.map.shareUrl) return site.map.shareUrl;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.map.query)}`;
}

/** "Get directions" link. */
export function mapsDirectionsUrl(): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(site.map.query)}`;
}
