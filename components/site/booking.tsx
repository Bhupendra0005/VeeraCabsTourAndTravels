"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { TripType } from "@/lib/site";

/**
 * Every "Book" button on the website calls openBooking(). Booking happens only on the /book page
 * (search, choose a cab, review, pay), so this sends the visitor there with whatever they already
 * typed. BookingLauncher (mounted once per page) listens for the call and does the navigation.
 */
const BOOK_EVENT = "veera:open-booking";

export type BookingPrefill = {
  tripType?: TripType;
  pickup?: string;
  drop?: string;
  date?: string;
  time?: string;
  passengers?: string;
  vehicle?: string;
  name?: string;
  phone?: string;
  notes?: string;
  /** A question rather than a booking (custom quote, tour package, a place we do not list): goes to the Contact form. */
  enquiry?: boolean;
};

const TRIP_PARAM: Record<TripType, string> = {
  "One Way": "one_way",
  "Round Trip": "round_trip",
  "Airport Transfer": "airport_pickup",
  "Local Rental": "hourly",
};

/** "Pune, Maharashtra" -> "Pune", "Mumbai / BOM Airport" -> "Mumbai" (the booking page works with city names). */
const cityOf = (value?: string) => (value ?? "").split(/[,/]/)[0].trim();

/** Best matching Contact-form topic for an enquiry. */
function topicFor(prefill: BookingPrefill): string {
  const text = `${prefill.notes ?? ""} ${prefill.drop ?? ""} ${prefill.vehicle ?? ""}`;
  if (/corporate|event|wedding/i.test(text)) return "Corporate or event travel";
  if (/tour|pilgrim|yatra|holiday|itinerary|package/i.test(text)) return "Tour package";
  if (prefill.tripType === "Airport Transfer" || /airport/i.test(text)) return "Airport pickup / drop";
  if (prefill.tripType === "Local Rental" || /local|city/i.test(text)) return "Local car hire in Pune";
  if (prefill.tripType === "One Way" || prefill.tripType === "Round Trip" || prefill.drop || prefill.vehicle) return "Outstation trip";
  return "Something else";
}

function enquiryHref(prefill: BookingPrefill): string {
  const details = [prefill.notes, prefill.drop && `Destination: ${prefill.drop}`, prefill.vehicle && `Vehicle: ${prefill.vehicle}`].filter(Boolean).join(". ");
  const q = new URLSearchParams({ topic: topicFor(prefill) });
  if (details) q.set("details", details.slice(0, 400));
  return `/contact?${q.toString()}#enquiry`;
}

export function bookingHref(prefill: BookingPrefill = {}): string {
  if (prefill.enquiry) return enquiryHref(prefill);
  const q = new URLSearchParams();
  if (prefill.tripType) q.set("tripType", TRIP_PARAM[prefill.tripType]);
  // "Pune to Mumbai" style labels carry both cities
  const pair = /^(.+?)\s+to\s+(.+)$/i.exec((prefill.drop ?? "").trim());
  const from = pair ? cityOf(pair[1]) : cityOf(prefill.pickup);
  const to = pair ? cityOf(pair[2]) : cityOf(prefill.drop);
  // the company is Pune based: a route like "Mumbai" means Pune to Mumbai
  if (from) q.set("from", from);
  else if (to && prefill.tripType !== "Local Rental" && !prefill.tripType?.startsWith("Airport")) q.set("from", "Pune");
  if (to && prefill.tripType !== "Local Rental") q.set("to", to);
  if (prefill.date && /^\d{4}-\d{2}-\d{2}$/.test(prefill.date)) q.set("date", prefill.date);
  if (prefill.time && /^\d{2}:\d{2}$/.test(prefill.time)) q.set("time", prefill.time);
  const passengers = Number.parseInt(prefill.passengers ?? "", 10);
  if (Number.isInteger(passengers) && passengers >= 1 && passengers <= 17) q.set("passengers", String(passengers));
  // a vehicle picked on the home page bar pre-selects that cab type on the results
  if (prefill.vehicle && prefill.vehicle !== "Any vehicle") q.set("cab", prefill.vehicle);
  const query = q.toString();
  return query ? `/book?${query}` : "/book";
}

export function openBooking(prefill: BookingPrefill = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<BookingPrefill>(BOOK_EVENT, { detail: prefill }));
}

export function BookingLauncher() {
  const router = useRouter();
  useEffect(() => {
    const handler = (event: Event) => {
      router.push(bookingHref((event as CustomEvent<BookingPrefill>).detail ?? {}));
    };
    window.addEventListener(BOOK_EVENT, handler);
    return () => window.removeEventListener(BOOK_EVENT, handler);
  }, [router]);
  return null;
}
