import { after } from "next/server";
import { cancelBooking, loadOwnedBooking, notifyOwner } from "@/lib/server/bookings/service";
import { requireSession } from "@/lib/server/auth/guard";
import { assertSameOrigin, handle, json } from "@/lib/server/core/http";
import { uuid } from "@/lib/server/core/validate";

export const runtime = "nodejs";

export function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    assertSameOrigin(request);
    const session = await requireSession();
    const booking = await loadOwnedBooking(uuid((await ctx.params).id), session.customerId);
    const result = await cancelBooking(booking);
    // the owner hears about it only when a confirmed trip is called off (an unpaid checkout that is dropped is not news)
    if (booking.status === "confirmed") after(() => notifyOwner({ ...booking, status: "cancelled" }, "cancelled", result.refunded));
    return json(result);
  });
}
