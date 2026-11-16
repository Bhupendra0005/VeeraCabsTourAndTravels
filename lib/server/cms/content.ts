import "server-only";
import type { ComponentType, SVGProps } from "react";
import { DEFAULT_DOCUMENT_LAYOUT, DOCUMENT_LAYOUT_KEY, type DocumentLayout } from "@/lib/booking/document-layout";
import { BOOKING_EXTRAS_KEY, DEFAULT_BOOKING_EXTRAS, type BookingExtras } from "@/lib/booking/extras";
import { AIRPORT_KEY, DEFAULT_AIRPORT, DEFAULT_HOURLY, HOURLY_KEY, type AirportDoc, type HourlyDoc } from "@/lib/booking/transfers";
import { BOOKING_PAGE_KEY, DEFAULT_BOOKING_PAGE, type BookingPageDoc } from "@/lib/booking/page-content";
import { BOOKING_SETTINGS_KEY, DEFAULT_BOOKING_SETTINGS, type BookingSettings } from "@/lib/booking/settings";
import { photoSrc } from "@/lib/cms/images";
import { resolveIcon } from "@/lib/cms/icons";
import type { Area, Destination, DestinationCategory, ServicePage } from "@/lib/content";
import { buildSite, type SiteData, type SiteInfoDoc } from "@/lib/site";
import {
  AREAS_DEFAULTS,
  DESTINATIONS_DEFAULTS,
  FAQS_DEFAULTS,
  FEATURES_DEFAULTS,
  FLEET_DEFAULTS,
  HOME_DEFAULTS,
  PAYMENT_METHODS_DEFAULTS,
  SEO_DEFAULTS,
  SERVICES_DEFAULTS,
  SITE_INFO_DEFAULTS,
} from "@/lib/server/cms/defaults";
import { doc } from "@/lib/server/cms/store";

/**
 * Typed read access to the editable website content. Every function falls back to the built-in defaults,
 * so the public site renders even if the database is unreachable.
 */

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const siteInfo = doc<SiteInfoDoc>("site_info", SITE_INFO_DEFAULTS);
export async function getSite(): Promise<SiteData> {
  return buildSite(await siteInfo());
}

export const getBookingSettings = doc<BookingSettings>(BOOKING_SETTINGS_KEY, DEFAULT_BOOKING_SETTINGS);

/** Wording and on/off switches of the booking pages. */
export const getBookingPage = doc<BookingPageDoc>(BOOKING_PAGE_KEY, DEFAULT_BOOKING_PAGE);

export const getAirportFares = doc<AirportDoc>(AIRPORT_KEY, DEFAULT_AIRPORT);
export const getHourlyFares = doc<HourlyDoc>(HOURLY_KEY, DEFAULT_HOURLY);

/** Coupons, paid special requests and fare-inclusion lines for the booking pages. */
export const getBookingExtras = doc<BookingExtras>(BOOKING_EXTRAS_KEY, DEFAULT_BOOKING_EXTRAS);

/** Look and wording of the PDF invoice and e-ticket. */
export const getDocumentLayout = doc<DocumentLayout>(DOCUMENT_LAYOUT_KEY, DEFAULT_DOCUMENT_LAYOUT);

export type Home = typeof HOME_DEFAULTS;
export const getHome = doc<Home>("home", HOME_DEFAULTS);
export async function getAssurances() {
  const home = await getHome();
  return home.assurances.map((item) => ({ ...item, Icon: resolveIcon(item.icon) as Icon }));
}

export type Seo = typeof SEO_DEFAULTS;
export const getSeo = doc<Seo>("seo", SEO_DEFAULTS);

const faqs = doc("faqs", FAQS_DEFAULTS);
export async function getFaqs() {
  return (await faqs()).items;
}

const fleetDoc = doc("fleet", FLEET_DEFAULTS);
export type FleetVehicle = {
  icon: Icon;
  photo: string;
  /** Owner-uploaded photo URL; empty means use the built-in photo. */
  image: string;
  title: string;
  seats: string;
  capacity: number;
  luggage: string;
  /** Listing details; older saved fleets may not have them yet, so each has a fallback. */
  category?: string;
  fuel?: string;
  models?: string;
  bags?: number;
  extraKmRate?: number;
  listDiscountPercent?: number;
  /** How many of this vehicle the owner has; 0 or missing means "do not limit". */
  count?: number;
  description: string;
};
export async function getFleet(): Promise<FleetVehicle[]> {
  return (await fleetDoc()).items
    .filter((vehicle) => vehicle.active)
    .map((vehicle) => {
      // a fleet saved before the listing fields existed has none of them: use the built-in values for that vehicle name
      const base = FLEET_DEFAULTS.items.find((item) => item.title === vehicle.title);
      const stored = vehicle as Partial<Pick<FleetVehicle, "category" | "fuel" | "models" | "bags" | "extraKmRate" | "listDiscountPercent" | "count">>;
      return {
        ...vehicle,
        category: stored.category || base?.category,
        fuel: stored.fuel || base?.fuel,
        models: stored.models ?? base?.models,
        bags: stored.bags ?? base?.bags,
        extraKmRate: stored.extraKmRate ?? base?.extraKmRate,
        listDiscountPercent: stored.listDiscountPercent ?? base?.listDiscountPercent,
        count: stored.count ?? 0,
        icon: resolveIcon(vehicle.icon, "car") as Icon,
      };
    });
}

/** Plain data (icon as a key string) so it can be passed to client components. */
export async function getFleetData() {
  return (await fleetDoc()).items.filter((vehicle) => vehicle.active);
}

/** Every vehicle, including ones hidden from the website (used when setting fares). */
export async function getFleetAll() {
  return (await fleetDoc()).items.map((vehicle) => ({
    title: vehicle.title,
    capacity: vehicle.capacity,
    active: vehicle.active,
    /** Small photo for the admin screens: the uploaded image, else the built-in one. */
    photo: photoSrc(vehicle, 480),
  }));
}

const featuresDoc = doc("features", FEATURES_DEFAULTS);
export async function getFeatures() {
  return (await featuresDoc()).items.map((item) => ({ ...item, icon: resolveIcon(item.icon) as Icon }));
}

export async function getFeaturesData() {
  return (await featuresDoc()).items;
}

const destinationsDoc = doc("destinations", DESTINATIONS_DEFAULTS);
export type DestinationItem = Destination & { image: string };
export async function getDestinations(): Promise<DestinationItem[]> {
  return (await destinationsDoc()).items.map((item) => ({ ...item, category: item.category as DestinationCategory }));
}
export async function getDestinationBySlug(slug: string) {
  return (await getDestinations()).find((item) => item.slug === slug);
}

const areasDoc = doc("areas", AREAS_DEFAULTS);
export async function getAreas(): Promise<Area[]> {
  return (await areasDoc()).items;
}
export async function getAreaBySlug(slug: string) {
  return (await getAreas()).find((item) => item.slug === slug);
}

const servicesDoc = doc("services", SERVICES_DEFAULTS);
export async function getServices(): Promise<ServicePage[]> {
  return (await servicesDoc()).items.map((item) => ({
    slug: item.slug,
    title: item.title,
    tag: item.tag,
    tagline: item.tagline,
    summary: item.summary,
    intro: item.intro,
    whatYouGet: item.whatYouGet,
    idealFor: item.idealFor,
    faqs: item.faqs,
    booking: {
      tripType: item.bookingTripType as ServicePage["booking"]["tripType"],
      drop: item.bookingDrop || undefined,
      notes: item.bookingNotes,
      // packages and corporate travel are quoted by the team, everything else can be booked online
      enquiry: item.slug === "tour-packages" || item.slug === "corporate-event-travel" || undefined,
    },
  }));
}
export async function getServiceBySlug(slug: string) {
  return (await getServices()).find((item) => item.slug === slug);
}

const paymentDoc = doc("payment_methods", PAYMENT_METHODS_DEFAULTS);
export async function getPaymentMethods() {
  return (await paymentDoc()).items;
}

