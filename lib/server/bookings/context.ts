import "server-only";
import type { PdfContext } from "@/lib/server/bookings/pdf";
import { getBookingSettings, getDocumentLayout, getSite } from "@/lib/server/cms/content";

/** Current business rules, contact details and document look, for PDFs and emails generated from a booking. */
export async function documentContext(): Promise<PdfContext> {
  const [rules, site, layout] = await Promise.all([getBookingSettings(), getSite(), getDocumentLayout()]);
  return { rules, site, layout };
}
