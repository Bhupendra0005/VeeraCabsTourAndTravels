import "server-only";
import { loadOwnedBooking, loadPayments } from "@/lib/server/bookings/service";
import { requireSession } from "@/lib/server/auth/guard";
import { handle, HttpError } from "@/lib/server/core/http";
import { documentContext } from "@/lib/server/bookings/context";
import { buildInvoicePdf, buildTicketPdf } from "@/lib/server/bookings/pdf";
import { amountPaid } from "@/lib/server/bookings/types";
import { uuid } from "@/lib/server/core/validate";

/** Shared by the ticket and invoice routes: owner-only, never cached, safe filename. */
export function pdfResponse(kind: "ticket" | "invoice", ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireSession();
    const booking = await loadOwnedBooking(uuid((await ctx.params).id), session.customerId);
    const payments = await loadPayments(booking.id);

    if (kind === "ticket" && booking.status !== "confirmed" && booking.status !== "completed") {
      throw new HttpError(409, "The ticket is available once the booking is confirmed.");
    }
    if (kind === "invoice" && payments.every((p) => p.status !== "paid" && p.status !== "refunded")) {
      throw new HttpError(409, "The invoice is available after payment.");
    }

    const docs = await documentContext();
    const bytes = kind === "ticket" ? await buildTicketPdf(booking, payments, docs) : await buildInvoicePdf(booking, payments, docs);
    const name = `${kind === "ticket" ? "Ticket" : "Invoice"}-${booking.ref.replace(/[^A-Z0-9]/gi, "")}.pdf`;
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
