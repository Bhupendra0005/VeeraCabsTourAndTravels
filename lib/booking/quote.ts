import { formatDate, to12h } from "@/lib/booking/config";

/**
 * A link to the Contact enquiry form, prefilled with what the visitor was looking for.
 * Used where there is no fixed fare ("Can't find your route?"): the visitor sends their trip, it lands in Admin > Enquiries.
 */
export function quoteHref(trip: { from?: string; to?: string; date?: string; time?: string; passengers?: number; kind?: string }): string {
  const parts: string[] = [];
  if (trip.from || trip.to) parts.push(`Trip: ${trip.from || "?"} to ${trip.to || "?"}`);
  if (trip.kind) parts.push(trip.kind);
  if (trip.date) parts.push(`on ${formatDate(trip.date)}${trip.time ? `, ${to12h(trip.time)}` : ""}`);
  if (trip.passengers && trip.passengers > 0) parts.push(`${trip.passengers} ${trip.passengers === 1 ? "traveller" : "travellers"}`);
  const q = new URLSearchParams({ topic: trip.kind === "Airport transfer" ? "Airport pickup / drop" : "Outstation trip" });
  const details = parts.join(", ");
  if (details) q.set("details", `${details}. Please share the fare.`.slice(0, 400));
  return `/contact?${q.toString()}#enquiry`;
}
