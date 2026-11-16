import { getSession } from "@/lib/server/auth/session";
import { assertCouponAllowed } from "@/lib/server/bookings/service";
import { getBookingExtras } from "@/lib/server/cms/content";
import { assertSameOrigin, handle, HttpError, json, readJson } from "@/lib/server/core/http";
import { normaliseCode } from "@/lib/booking/config";

export const runtime = "nodejs";

/**
 * Early answer for the "Apply" button on the review page: does this coupon's own rules (first booking only,
 * limits per customer / in total) let this customer use it? The real check runs again when the booking is made,
 * so this only saves the customer a failed payment attempt. A visitor who is not logged in yet is told "ok"
 * and checked when they log in to pay.
 */
export function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const body = await readJson(request);
    const code = normaliseCode(typeof body.code === "string" ? body.code.slice(0, 40) : "");
    if (!code) throw new HttpError(400, "Enter a coupon code.");
    const coupon = (await getBookingExtras()).coupons.find((item) => item.active && normaliseCode(item.code) === code);
    if (!coupon) throw new HttpError(400, "This coupon code is not valid.");
    const session = await getSession();
    if (session) await assertCouponAllowed(coupon, session.customerId);
    return json({ ok: true });
  });
}
