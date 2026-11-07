import "server-only";
import { can } from "@/lib/admin/permissions";
import { getBookingWithPayments } from "@/lib/server/admin/queries";
import { getAdmin } from "@/lib/server/admin/session";
import { documentContext } from "@/lib/server/bookings/context";
import { buildInvoicePdf, buildTicketPdf } from "@/lib/server/bookings/pdf";
import { amountPaid } from "@/lib/server/bookings/types";
import { isUuid } from "@/lib/server/core/validate";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** Staff download of any booking's ticket or invoice. */
export async function adminPdf(kind: "ticket" | "invoice", params: Promise<{ id: string }>): Promise<Response> {
  const admin = await getAdmin();
  if (!admin || admin.mustChangePassword) return Response.json({ error: "Please sign in." }, { status: 401, headers: NO_STORE });
  if (!can(admin.role, "bookings.view")) return Response.json({ error: "Not allowed." }, { status: 403, headers: NO_STORE });

  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: "Not found." }, { status: 404, headers: NO_STORE });
  try {
    const found = await getBookingWithPayments(id);
    if (!found) return Response.json({ error: "Not found." }, { status: 404, headers: NO_STORE });
    const { booking, payments } = found;
    if (kind === "invoice" && payments.every((p) => p.status !== "paid" && p.status !== "refunded")) {
      return Response.json({ error: "No payment received yet." }, { status: 409, headers: NO_STORE });
    }
    const ctx = await documentContext();
    const bytes = kind === "ticket" ? await buildTicketPdf(booking, payments, ctx) : await buildInvoicePdf(booking, payments, ctx);
    const name = `${kind === "ticket" ? "Ticket" : "Invoice"}-${booking.ref.replace(/[^A-Z0-9]/gi, "")}.pdf`;
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${name}"`,
        "X-Content-Type-Options": "nosniff",
        ...NO_STORE,
      },
    });
  } catch (error) {
    console.error("Admin PDF failed", error);
    return Response.json({ error: "Could not create the PDF." }, { status: 500, headers: NO_STORE });
  }
}
