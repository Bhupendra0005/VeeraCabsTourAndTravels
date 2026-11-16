import "server-only";
import { DEFAULT_BOOKING_EXTRAS } from "@/lib/booking/extras";
import { BOOKING_PAGE_KEY, DEFAULT_BOOKING_PAGE } from "@/lib/booking/page-content";
import { AIRPORT_KEY, DEFAULT_AIRPORT, DEFAULT_HOURLY, HOURLY_KEY } from "@/lib/booking/transfers";
import { DEFAULT_FAQS } from "@/lib/cms/default-faqs";
import { ICONS } from "@/lib/cms/icons";
import { areas, destinations, features, fleet, paymentMethods, servicePages } from "@/lib/content";
import { site } from "@/lib/site";

/** Built-in content, derived from the original static content. Used until the owner saves their own version. */

function iconKey(component: unknown): string {
  return Object.entries(ICONS).find(([, value]) => value === component)?.[0] ?? "star";
}

const CAPACITY: Record<string, number> = { Sedan: 4, "Premium SUV": 7, "Spacious MPV": 6, "Tempo Traveller": 17 };
/** Sample listing details per vehicle (cab type, fuel, models, boot bags, extra-km rate in ₹). The owner edits these in Fleet. */
const CAB_DETAILS: Record<string, { category: string; fuel: string; models: string; bags: number; extraKmRate: number; listDiscountPercent: number }> = {
  Sedan: { category: "Sedan", fuel: "Diesel", models: "Dzire, Etios", bags: 2, extraKmRate: 12, listDiscountPercent: 0 },
  "Premium SUV": { category: "SUV", fuel: "Diesel", models: "Innova Crysta", bags: 4, extraKmRate: 19, listDiscountPercent: 0 },
  "Spacious MPV": { category: "MPV", fuel: "Diesel", models: "Ertiga", bags: 3, extraKmRate: 15, listDiscountPercent: 0 },
  "Tempo Traveller": { category: "Tempo Traveller", fuel: "Diesel", models: "", bags: 10, extraKmRate: 26, listDiscountPercent: 0 },
};

export const SITE_INFO_DEFAULTS = {
  name: site.name,
  shortName: site.shortName,
  tagline: site.tagline,
  primaryPhone: { display: site.primaryPhone.display, raw: site.primaryPhone.raw },
  secondaryPhone: { display: site.secondaryPhone.display, raw: site.secondaryPhone.raw },
  whatsapp: site.whatsapp,
  email: site.email,
  address: { line1: site.address.line1, line2: site.address.line2 },
  hours: site.hours,
  gstin: "",
  mapQuery: site.map.query,
  mapEmbedSrc: site.map.embedSrc as string,
  mapShareUrl: site.map.shareUrl as string,
  facebook: site.social.facebook as string,
  instagram: site.social.instagram as string,
};

export const HOME_DEFAULTS = {
  announcement: { enabled: false, text: "", linkLabel: "", linkHref: "" },
  hero: {
    kicker: "Pune’s premier 24/7 cab network",
    line1: "Travel India",
    line2: "with",
    highlight: "confidence.",
    subtitle:
      "From smooth airport transfers to unforgettable hill journeys, Veera Tours & Travels keeps every mile comfortable.",
    badges: ["Verified chauffeurs", "24/7 availability", "All India permits"],
    primaryCta: "Book your ride",
    note: "Fixed fares shown upfront. Pay securely online and get your e-ticket instantly.",
    slides: [
      {
        desktopImage: "/hero-pune-1600.webp",
        mobileImage: "/hero-pune-mobile-940.webp",
        alt: "Black Veera Tours & Travels SUV in front of a historic fort in Pune at sunset",
      },
      {
        desktopImage: "/hero-palace-1600.webp",
        mobileImage: "/hero-palace-mobile-940.webp",
        alt: "White Veera Tours & Travels SUV in front of a palace at sunset",
      },
      {
        desktopImage: "/hero-lake-1600.webp",
        mobileImage: "/hero-fort-mobile-940.webp",
        alt: "White Veera Tours & Travels SUV beside a lake palace at sunset",
      },
    ],
  },
  assurances: [
    { icon: "shield", title: "Experienced chauffeurs", text: "Licensed, courteous drivers" },
    { icon: "clock", title: "24/7 booking support", text: "A real person on the phone" },
    { icon: "pin", title: "Pune based", text: "Local knowledge, all-India reach" },
    { icon: "car", title: "Clean, AC vehicles", text: "Comfort checked before every trip" },
  ],
  marquee: [
    "Airport transfers",
    "One-way cabs",
    "Outstation journeys",
    "All India taxi",
    "Tour packages",
    "24/7 booking support",
  ],
  popularSearches: [
    "Pune to Mumbai",
    "Mumbai to Pune",
    "Pune to Shirdi",
    "Pune airport taxi",
    "Mahabaleshwar tour package",
    "Pune to Goa",
  ],
};

export const FLEET_DEFAULTS = {
  items: fleet.map((vehicle) => ({
    title: vehicle.title,
    seats: vehicle.seats,
    capacity: CAPACITY[vehicle.title] ?? 4,
    luggage: vehicle.luggage,
    ...(CAB_DETAILS[vehicle.title] ?? { category: "Sedan", fuel: "Diesel", models: "", bags: 2, extraKmRate: 12, listDiscountPercent: 0 }),
    description: vehicle.description,
    icon: iconKey(vehicle.icon),
    image: "",
    photo: vehicle.photo,
    active: true,
  })),
};

export const FEATURES_DEFAULTS = {
  items: features.map((feature) => ({ icon: iconKey(feature.icon), title: feature.title, text: feature.text })),
};

export const FAQS_DEFAULTS = { items: DEFAULT_FAQS };

export const DESTINATIONS_DEFAULTS = {
  items: destinations.map((destination) => ({ ...destination, image: "" })),
};

export const AREAS_DEFAULTS = { items: areas.map((area) => ({ ...area })) };

export const SERVICES_DEFAULTS = {
  items: servicePages.map((service) => ({
    slug: service.slug,
    title: service.title,
    tag: service.tag,
    tagline: service.tagline,
    summary: service.summary,
    intro: service.intro,
    whatYouGet: service.whatYouGet,
    idealFor: service.idealFor,
    faqs: service.faqs,
    bookingTripType: service.booking.tripType,
    bookingDrop: service.booking.drop ?? "",
    bookingNotes: service.booking.notes,
  })),
};

export const PAYMENT_METHODS_DEFAULTS = { items: paymentMethods };

export const SEO_DEFAULTS = {
  title: "Veera Tours & Travels | Taxi & Cab Service in Pune, Maharashtra",
  description:
    "Book taxis, airport transfers, one-way cabs, outstation rides and tour packages with Veera Tours & Travels, Hadapsar, Pune. 24/7 bookings, experienced chauffeurs and clear upfront fares.",
  keywords: [
    "Veera Tours & Travels",
    "taxi service Pune",
    "cab service Pune",
    "Pune to Mumbai taxi",
    "Pune airport taxi",
    "Hadapsar cab service",
    "Pune to Shirdi cab",
    "outstation cabs Maharashtra",
  ],
  shareImage: "",
};

export const DEFAULTS: Record<string, unknown> = {
  site_info: SITE_INFO_DEFAULTS,
  home: HOME_DEFAULTS,
  fleet: FLEET_DEFAULTS,
  booking_extras: DEFAULT_BOOKING_EXTRAS,
  [BOOKING_PAGE_KEY]: DEFAULT_BOOKING_PAGE,
  [AIRPORT_KEY]: DEFAULT_AIRPORT,
  [HOURLY_KEY]: DEFAULT_HOURLY,
  features: FEATURES_DEFAULTS,
  faqs: FAQS_DEFAULTS,
  destinations: DESTINATIONS_DEFAULTS,
  areas: AREAS_DEFAULTS,
  services: SERVICES_DEFAULTS,
  payment_methods: PAYMENT_METHODS_DEFAULTS,
  seo: SEO_DEFAULTS,
};
