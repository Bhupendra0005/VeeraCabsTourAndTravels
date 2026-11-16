import { adminApi } from "@/lib/server/admin/api";
import { DOCUMENT_LAYOUT_FIELDS, type DocumentLayout } from "@/lib/booking/document-layout";
import { DocError, validateFields } from "@/lib/cms/validate";
import { documentContext } from "@/lib/server/bookings/context";
import { buildInvoicePdf, buildTicketPdf } from "@/lib/server/bookings/pdf";
import type { BookingRow, PaymentRow } from "@/lib/server/bookings/types";
import { HttpError } from "@/lib/server/core/http";

export const runtime = "nodejs";

const MAX_BODY = 30_000;

function sample(): { booking: BookingRow; payments: PaymentRow[] } {
  const now = new Date();
  const travel = new Date(now.getTime() + 6 * 86_400_000).toISOString().slice(0, 10);
  const zero = "00000000-0000-0000-0000-000000000000";
  const booking: BookingRow = {
    id: zero,
    ref: "VT7K2M9QXA",
    invoice_no: "VT/26/00042",
    customer_id: zero,
    route_id: zero,
    trip_type: "one_way",
    from_city: "Pune",
    to_city: "Goa",
    pickup_address: "Shop No 12, Koregaon Park, Pune, Maharashtra 411001",
    drop_address: "Calangute Beach Road, Calangute, Goa 403516",
    travel_date: travel,
    travel_time: "07:30",
    return_date: null,
    passengers: 4,
    bags: 2,
    vehicle_type: "SUV",
    traveller_name: "Rahul Sharma",
    traveller_gender: "male",
    traveller_phone: "9876543210",
    traveller_email: "rahul.sharma@example.com",
    base_fare: 1_890_000,
    addons_total: 0,
    addons: "",
    coupon_code: "",
    discount: 0,
    service_fee: 0,
    stops: "",
    gst_company: "",
    gstin: "",
    gst: 94_500,
    insurance: 9_900,
    total: 1_994_400,
    pay_mode: "part",
    advance_due: 498_600,
    status: "confirmed",
    confirmed_at: now.toISOString(),
    cancelled_at: null,
    refund_amount: 0,
    created_at: now.toISOString(),
    driver_name: "",
    driver_phone: "",
    cab_number: "",
    cab_model: "",
    driver_assigned_at: null,
    driver_id: null,
    source: "online",
  };
  const payments: PaymentRow[] = [
    {
      id: zero,
      booking_id: zero,
      kind: "advance",
      amount: 498_600,
      razorpay_order_id: "order_SAMPLE123",
      razorpay_payment_id: "pay_SAMPLE456789",
      status: "paid",
      refund_id: null,
      created_at: now.toISOString(),
      paid_at: now.toISOString(),
    },
  ];
  return { booking, payments };
}

/**
 * Builds a sample invoice or ticket from the layout the admin is editing (not yet saved), so the
 * design can be judged before it goes live. Uses made-up booking data; nothing is stored.
 */
export function POST(request: Request) {
  return adminApi(request, "settings.manage", async () => {
    const text = await request.text();
    if (text.length > MAX_BODY) throw new HttpError(413, "That is too much text for a preview.");

    let body: { type?: unknown; layout?: unknown };
    try {
      body = JSON.parse(text) as typeof body;
    } catch {
      throw new HttpError(400, "Invalid request.");
    }
    const type = body.type === "ticket" ? "ticket" : "invoice";

    let layout: DocumentLayout;
    try {
      layout = validateFields(DOCUMENT_LAYOUT_FIELDS, body.layout) as unknown as DocumentLayout;
    } catch (error) {
      if (error instanceof DocError) throw new HttpError(400, error.message);
      throw error;
    }

    const ctx = { ...(await documentContext()), layout };
    const { booking, payments } = sample();
    const bytes = type === "ticket" ? await buildTicketPdf(booking, payments, ctx) : await buildInvoicePdf(booking, payments, ctx);

    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="preview-${type}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
