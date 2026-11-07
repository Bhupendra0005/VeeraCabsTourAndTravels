import { loadOwnedBooking, startPayment } from "@/lib/server/bookings/service";
import { requireSession } from "@/lib/server/auth/guard";
import { assertSameOrigin, handle, json } from "@/lib/server/core/http";
import { uuid } from "@/lib/server/core/validate";

export const runtime = "nodejs";

export function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    assertSameOrigin(request);
    const session = await requireSession();
    const booking = await loadOwnedBooking(uuid((await ctx.params).id), session.customerId);
    return json(await startPayment(booking));
  });
}
