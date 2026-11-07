import "server-only";
import type { ComponentType, SVGProps } from "react";
import { DEFAULT_DOCUMENT_LAYOUT, DOCUMENT_LAYOUT_KEY, type DocumentLayout } from "@/lib/booking/document-layout";
import { BOOKING_SETTINGS_KEY, DEFAULT_BOOKING_SETTINGS, type BookingSettings } from "@/lib/booking/settings";
import { resolveIcon } from "@/lib/cms/icons";
import type { Area, Destination, DestinationCategory, RateRow, ServicePage } from "@/lib/content";
import { buildSite, type SiteData, type SiteInfoDoc } from "@/lib/site";
import {
  AREAS_DEFAULTS,
  DESTINATIONS_DEFAULTS,
  FAQS_DEFAULTS,
  FEATURES_DEFAULTS,
  FLEET_DEFAULTS,
  HOME_DEFAULTS,
  PAYMENT_METHODS_DEFAULTS,
  RATE_CARD_DEFAULTS,
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
  description: string;
};
export async function getFleet(): Promise<FleetVehicle[]> {
  return (await fleetDoc()).items
    .filter((vehicle) => vehicle.active)
    .map((vehicle) => ({ ...vehicle, icon: resolveIcon(vehicle.icon, "car") as Icon }));
}

/** Plain data (icon as a key string) so it can be passed to client components. */
export async function getFleetData() {
  return (await fleetDoc()).items.filter((vehicle) => vehicle.active);
}

/** Every vehicle, including ones hidden from the website (used when setting fares). */
export async function getFleetAll() {
  return (await fleetDoc()).items.map((vehicle) => ({ title: vehicle.title, capacity: vehicle.capacity, active: vehicle.active }));
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

const rateDoc = doc("rate_card", RATE_CARD_DEFAULTS);
export async function getRateCard(): Promise<RateRow[]> {
  return (await rateDoc()).items.map((row) => ({
    vehicle: row.vehicle,
    seats: row.seats,
    local: row.local || null,
    outstation: row.outstation || null,
    airport: row.airport || null,
  }));
}
