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
type CabDetails = { category: string; fuel: string; models: string; bags: number; extraKmRate: number; minKmPerDay: number; driverAllowance: number; ratePerKm: number; minFare: number; listDiscountPercent: number; tollPercent: number };
const CAB_DETAILS: Record<string, CabDetails> = {
  Sedan: { category: "Sedan", fuel: "Diesel", models: "Dzire, Etios", bags: 2, extraKmRate: 12, minKmPerDay: 300, driverAllowance: 0, ratePerKm: 12, minFare: 0, listDiscountPercent: 0, tollPercent: 100 },
  "Premium SUV": { category: "SUV", fuel: "Diesel", models: "Innova Crysta", bags: 4, extraKmRate: 19, minKmPerDay: 300, driverAllowance: 0, ratePerKm: 19, minFare: 0, listDiscountPercent: 0, tollPercent: 100 },
  "Spacious MPV": { category: "MPV", fuel: "Diesel", models: "Ertiga", bags: 3, extraKmRate: 15, minKmPerDay: 300, driverAllowance: 0, ratePerKm: 15, minFare: 0, listDiscountPercent: 0, tollPercent: 100 },
  "Tempo Traveller": { category: "Tempo Traveller", fuel: "Diesel", models: "", bags: 10, extraKmRate: 26, minKmPerDay: 300, driverAllowance: 0, ratePerKm: 26, minFare: 0, listDiscountPercent: 0, tollPercent: 160 },
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
  topbar: { enabled: true, label: "Call us 24/7:", showSecondary: true, showHours: true },
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
  routeCards: [
    {
      icon: "plane",
      title: "Pune ↔ Mumbai & Airport",
      badge: "Bestseller",
      price: "",
      meta: "~150 km · 3–3.5 hrs via Expressway",
      description:
        "Smooth air-conditioned rides on the Mumbai–Pune Expressway to Mumbai airport (BOM), Navi Mumbai and South Mumbai, with one-way drops and returns.",
      tags: ["Mumbai Airport", "Expressway", "One way"],
      tripType: "One Way",
      drop: "Mumbai / BOM Airport",
    },
    {
      icon: "landmark",
      title: "Pune ↔ Shirdi & Shani Shingnapur",
      badge: "Pilgrimage",
      price: "",
      meta: "~185 km · 4–5 hrs via NH60",
      description:
        "Comfortable darshan trips to Sai Baba’s Shirdi and Shani Shingnapur, with Shirdi airport pickups and family-friendly stops.",
      tags: ["Shirdi", "Shani Shingnapur", "Family trips"],
      tripType: "Round Trip",
      drop: "Shirdi / Shani Shingnapur",
    },
    {
      icon: "mountain",
      title: "Pune ↔ Mahabaleshwar & Panchgani",
      badge: "Hill escape",
      price: "",
      meta: "~120 km · 3 hrs via Satara Road",
      description:
        "Weekend hill-station getaways with strawberry farms, Venna Lake and Kaas Plateau viewpoints — we handle the ghat driving.",
      tags: ["Mahabaleshwar", "Panchgani", "Weekend trip"],
      tripType: "Round Trip",
      drop: "Mahabaleshwar / Panchgani",
    },
    {
      icon: "navigation",
      title: "Pune ↔ Nashik & Trimbakeshwar",
      badge: "Temple circuit",
      price: "",
      meta: "~210 km · 4.5 hrs",
      description:
        "Reliable intercity rides for Nashik, Trimbakeshwar and Saptashrungi darshan, vineyard visits and business travel.",
      tags: ["Nashik", "Trimbakeshwar", "Vineyards"],
      tripType: "One Way",
      drop: "Nashik / Trimbakeshwar",
    },
    {
      icon: "route",
      title: "Pune ↔ Goa & Konkan",
      badge: "Long haul",
      price: "",
      meta: "~450 km · 9–10 hrs",
      description:
        "Chauffeur-driven holidays to Goa and the Konkan coast, planned around your pace, meal breaks and overnight stops.",
      tags: ["Goa", "Kolhapur", "Konkan beaches"],
      tripType: "Round Trip",
      drop: "Goa / Konkan",
    },
    {
      icon: "car",
      title: "Pune ↔ Hyderabad",
      badge: "Long haul",
      price: "",
      meta: "~560 km · 9–10 hrs via NH65",
      description:
        "Chauffeur-driven trips between Pune and Hyderabad on the highway, planned around your pace, meal breaks and overnight stops.",
      tags: ["Hyderabad", "Solapur", "Long trip"],
      tripType: "Round Trip",
      drop: "Hyderabad",
    },
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
    ...(CAB_DETAILS[vehicle.title] ?? ({ category: "Sedan", fuel: "Diesel", models: "", bags: 2, extraKmRate: 12, minKmPerDay: 300, driverAllowance: 0, ratePerKm: 12, minFare: 0, listDiscountPercent: 0, tollPercent: 100 } satisfies CabDetails)),
    ac: "AC",
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

export const ABOUT_DEFAULTS = {
  seo: {
    title: "About Us",
    description:
      "Veera Tours & Travels is a cab and tour service in Hadapsar, Pune: airport transfers, one-way cabs, outstation trips and tour packages across Maharashtra.",
  },
  hero: {
    eyebrow: "About us",
    titleStart: "Good travel begins with a",
    titleHighlight: "trusted ride.",
    description:
      "We are a cab and tour service in Pune. We help you reach the airport, travel to other cities and enjoy road trips, with a clean car and a friendly driver.",
    image: "",
    bookLabel: "Book your ride",
  },
  story: {
    label: "Who we are",
    titleStart: "A Pune cab service that keeps things",
    titleHighlight: "simple and honest.",
    paragraphs: [
      "Veera Tours & Travels is a cab and tour service. Our office is at Monal Park, Hadapsar, in Pune. You can book a car with a driver for the airport, for a day around the city, for a trip to another city, or for a holiday tour.",
      "Our idea is simple. Travel should feel easy. So you get a confirmed car, a polite driver and the price before you start. No hidden surprises, and a real person to speak to whenever you need help.",
    ],
    values: [
      "You know the fare before you book",
      "Licensed and polite drivers",
      "Clean cars with AC",
      "A real person to talk to, any time",
      "We know Pune well, and we travel across India",
    ],
  },
  photos: {
    badge: "Based in Pune · Serving all India",
    openTitle: "Open 24/7",
    openText: "Airport and late-night pickups",
    items: [
      { image: "/about-airport-960.webp", alt: "A white Veera Tours & Travels MPV on a mountain road at sunset beside an airport" },
      { image: "/about-ghat-960.webp", alt: "A black Veera Tours & Travels SUV on a ghat road below a hill fort at sunset" },
      { image: "/about-hills-960.webp", alt: "A silver Veera Tours & Travels MPV on a misty hill road beside waterfalls" },
    ],
  },
  stats: [
    { value: "24/7", label: "Hours, our desk is open", source: "manual" },
    { value: "22", label: "Places we take you to", source: "manual" },
    { value: "11", label: "Areas we cover", source: "manual" },
    { value: "4", label: "Types of vehicles", source: "manual" },
  ],
  steps: {
    label: "How it works",
    titleStart: "Booking a ride in",
    titleHighlight: "four easy steps.",
    description: "No app to download. Search your route, see the fare and book online in a few minutes.",
    items: [
      { icon: "send", title: "Search your trip", text: "Open Book Online and enter where to pick you up, where to go and the date." },
      { icon: "rupee", title: "See the fixed fare", text: "Compare cars for your group size and see the full fare before you pay." },
      { icon: "calendar", title: "Pay and confirm", text: "Pay securely online, part now or in full, and your car is booked. Your e-ticket arrives by email." },
      { icon: "thumbs", title: "Enjoy the ride", text: "Your driver comes on time. You sit back while he takes care of the road." },
    ],
  },
  why: { label: "Why choose Veera", titleStart: "Comfortable, safe and", titleHighlight: "always on time." },
  fleet: { label: "Our fleet", titleStart: "Select the right car for", titleHighlight: "your journey." },
  visit: { label: "Visit us", title: "Drop by our Hadapsar office", buttonLabel: "Get directions", buttonLink: "/contact" },
  cta: { title: "Let\u2019s plan your next journey.", text: "Tell us where you want to go and the date. We will take care of the rest." },
};

export const DEFAULTS: Record<string, unknown> = {
  site_info: SITE_INFO_DEFAULTS,
  home: HOME_DEFAULTS,
  about: ABOUT_DEFAULTS,
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
