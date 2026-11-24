import "server-only";
import { BOOKING_EXTRAS_KEY, DEFAULT_BOOKING_EXTRAS, normaliseExtras, type BookingExtras } from "@/lib/booking/extras";
import { mergeDefaults } from "@/lib/cms/validate";
import { readRaw } from "@/lib/server/cms/store";

/**
 * The saved booking offers for editing. Unlike the website's reader this throws when the database cannot be
 * read, so a failed read can never be mistaken for "defaults" and then saved over the real coupons.
 */
export async function readExtrasForEdit(): Promise<BookingExtras> {
  const raw = await readRaw(BOOKING_EXTRAS_KEY);
  return raw === null ? DEFAULT_BOOKING_EXTRAS : normaliseExtras(mergeDefaults(DEFAULT_BOOKING_EXTRAS, raw));
}
