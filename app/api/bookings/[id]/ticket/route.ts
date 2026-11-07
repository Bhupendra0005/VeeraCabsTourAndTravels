import { pdfResponse } from "@/lib/server/bookings/pdf-response";

export const runtime = "nodejs";

export function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  return pdfResponse("ticket", ctx);
}
