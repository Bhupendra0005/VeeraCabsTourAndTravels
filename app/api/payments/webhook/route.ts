import { confirmPayment, markPaymentFailed, markRefundFailed } from "@/lib/server/bookings/service";
import { handle, HttpError, json } from "@/lib/server/core/http";
import { verifyWebhookSignature } from "@/lib/server/payments/razorpay";

export const runtime = "nodejs";
// the confirmation email (two PDFs + Brevo) runs after the response, within this limit
export const maxDuration = 60;

type WebhookBody = {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; amount?: number; status?: string } };
    refund?: { entity?: { id?: string; payment_id?: string } };
  };
};

/**
 * Razorpay server-to-server notifications. This is what confirms a booking when the customer
 * pays but closes the browser before the redirect. Authenticated only by the HMAC signature
 * over the raw body: no session, no cookies.
 */
export function POST(request: Request) {
  return handle(async () => {
    const raw = await request.text();
    if (raw.length > 100_000) throw new HttpError(413, "Too large.");
    const signature = request.headers.get("x-razorpay-signature") ?? "";
    if (!signature || !verifyWebhookSignature(raw, signature)) throw new HttpError(401, "Invalid signature.");

    let event: WebhookBody;
    try {
      event = JSON.parse(raw) as WebhookBody;
    } catch {
      throw new HttpError(400, "Invalid payload.");
    }

    const payment = event.payload?.payment?.entity;
    if (payment?.id && payment.order_id && typeof payment.amount === "number") {
      if (event.event === "payment.captured") {
        await confirmPayment(payment.order_id, payment.id, payment.amount);
      } else if (event.event === "payment.failed") {
        await markPaymentFailed(payment.order_id);
      }
    }
    const refund = event.payload?.refund?.entity;
    if (event.event === "refund.failed" && refund?.id && refund.payment_id) {
      await markRefundFailed(refund.id, refund.payment_id);
    }
    return json({ ok: true });
  });
}
