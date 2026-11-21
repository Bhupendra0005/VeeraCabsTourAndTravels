import { can } from "@/lib/admin/permissions";
import { getAdmin } from "@/lib/server/admin/session";
import { documentContext } from "@/lib/server/bookings/context";
import { buildManualInvoicePdf } from "@/lib/server/bookings/pdf";
import { isUuid } from "@/lib/server/core/validate";
import { getManualInvoice } from "@/lib/server/invoices";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** Staff download of a hand-made invoice. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin || admin.mustChangePassword) return Response.json({ error: "Please sign in." }, { status: 401, headers: NO_STORE });
  if (!can(admin.role, "bookings.view")) return Response.json({ error: "Not allowed." }, { status: 403, headers: NO_STORE });

  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Not found." }, { status: 404, headers: NO_STORE });
  try {
    const invoice = await getManualInvoice(id);
    if (!invoice) return Response.json({ error: "Not found." }, { status: 404, headers: NO_STORE });
    const bytes = await buildManualInvoicePdf(invoice, await documentContext());
    const name = `Invoice-${invoice.invoice_no.replace(/[^A-Z0-9]/gi, "")}.pdf`;
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${name}"`,
        "X-Content-Type-Options": "nosniff",
        ...NO_STORE,
      },
    });
  } catch (error) {
    console.error("Manual invoice PDF failed", error);
    return Response.json({ error: "Could not create the PDF." }, { status: 500, headers: NO_STORE });
  }
}
