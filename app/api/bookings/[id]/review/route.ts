import { revalidatePath } from "next/cache";
import { loadOwnedBooking } from "@/lib/server/bookings/service";
import { createReview } from "@/lib/server/bookings/reviews";
import { requireSession } from "@/lib/server/auth/guard";
import { assertSameOrigin, handle, HttpError, json, readJson } from "@/lib/server/core/http";
import { optStr, uuid } from "@/lib/server/core/validate";

export const runtime = "nodejs";

export function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    assertSameOrigin(request);
    const session = await requireSession();
    // 404 unless the booking belongs to this customer
    const booking = await loadOwnedBooking(uuid((await ctx.params).id), session.customerId);
    const body = await readJson(request);

    const tags = body.tags ?? [];
    if (!Array.isArray(tags) || tags.length > 10 || tags.some((tag) => typeof tag !== "string" || tag.length > 40)) {
      throw new HttpError(400, "Invalid tags.");
    }
    await createReview(booking, {
      cabRating: Number(body.cabRating),
      driverRating: Number(body.driverRating),
      tags: tags as string[],
      comment: optStr(body, "comment", 600),
    });
    // the home page shows the newest reviews
    revalidatePath("/");
    return json({ ok: true }, 201);
  });
}
