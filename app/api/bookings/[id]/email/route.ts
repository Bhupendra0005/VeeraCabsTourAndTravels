import { loadOwnedBooking, sendConfirmation } from "@/lib/server/bookings/service";
import { requireSession } from "@/lib/server/auth/guard";
import { assertSameOrigin, handle, HttpError, json } from "@/lib/server/core/http";
import { uuid } from "@/lib/server/core/validate";

export const runtime = "nodejs";

/** One resend per booking per minute (per server instance), so the button cannot be used to spam an inbox. */
const COOLDOWN_MS = 60_000;
const lastSent = new Map<string, number>();

/** Emails the ticket and invoice again to the address on the booking. Owner only. */
export function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    assertSameOrigin(request);
    const session = await requireSession();
    const booking = await loadOwnedBooking(uuid((await ctx.params).id), session.customerId);
    if (booking.status !== "confirmed" && booking.status !== "completed") {
      throw new HttpError(409, "The ticket is emailed once the booking is confirmed.");
    }

    const now = Date.now();
    const previous = lastSent.get(booking.id) ?? 0;
    if (now - previous < COOLDOWN_MS) throw new HttpError(429, "We just sent it. Please wait a minute before asking again.");
    lastSent.set(booking.id, now);
    if (lastSent.size > 500) for (const [key, at] of lastSent) if (now - at > COOLDOWN_MS) lastSent.delete(key);

    if (!(await sendConfirmation(booking))) {
      lastSent.delete(booking.id);
      throw new HttpError(502, "We could not send the email right now. You can download the ticket instead.");
    }
    return json({ ok: true });
  });
}
