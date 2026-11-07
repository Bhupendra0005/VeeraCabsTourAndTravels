import { db } from "@/lib/server/core/db";
import { verifyAndConfirm } from "@/lib/server/bookings/service";
import { requireSession } from "@/lib/server/auth/guard";
import { assertSameOrigin, handle, HttpError, json, readJson } from "@/lib/server/core/http";
import { verifyCheckoutSignature } from "@/lib/server/payments/razorpay";

export const runtime = "nodejs";

const ID = /^[A-Za-z0-9_]{6,40}$/;

export function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const session = await requireSession();
    const body = await readJson(request);

    const orderId = body.razorpay_order_id;
    const paymentId = body.razorpay_payment_id;
    const signature = body.razorpay_signature;
    if (
      typeof orderId !== "string" || !ID.test(orderId) ||
      typeof paymentId !== "string" || !ID.test(paymentId) ||
      typeof signature !== "string" || !/^[a-f0-9]{64}$/.test(signature)
    ) {
      throw new HttpError(400, "Invalid payment response.");
    }

    // the order must belong to one of this customer's bookings
    const { data: owned, error } = await db()
      .from("payments")
      .select("id, bookings!inner(customer_id)")
      .eq("razorpay_order_id", orderId)
      .eq("bookings.customer_id", session.customerId)
      .maybeSingle();
    if (error) throw error;
    if (!owned) throw new HttpError(404, "Payment not found.");

    if (!verifyCheckoutSignature(orderId, paymentId, signature)) {
      throw new HttpError(400, "Payment verification failed.");
    }
    await verifyAndConfirm(orderId, paymentId);
    return json({ ok: true });
  });
}
