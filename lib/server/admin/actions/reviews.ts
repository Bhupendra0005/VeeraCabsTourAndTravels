"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/admin/action-state";
import { audit } from "@/lib/server/admin/audit";
import { ActionError, idOrThrow, run } from "@/lib/server/admin/actions/run";
import { db } from "@/lib/server/core/db";

/** Permanently deletes a review (spam, abuse, a mistake). The booking it belongs to is not touched. */
export async function deleteReviewAction(id: string): Promise<ActionState> {
  return run("bookings.manage", async (admin) => {
    const reviewId = idOrThrow(id);
    const { data, error } = await db().from("reviews").delete().eq("id", reviewId).select("id, booking_id");
    if (error) throw error;
    if (!data?.length) throw new ActionError("Review not found.");
    await audit(admin, "review.deleted", { entity: "review", entityId: reviewId, meta: { booking_id: data[0].booking_id } });
    revalidatePath("/admin/reviews");
    revalidatePath("/book", "layout");
    return { ok: true, message: "Review deleted." };
  });
}

/** Hides a review from the website (or shows it again). */
export async function setReviewPublishedAction(id: string, published: boolean): Promise<ActionState> {
  return run("bookings.manage", async (admin) => {
    const reviewId = idOrThrow(id);
    const { data, error } = await db().from("reviews").update({ published: published === true }).eq("id", reviewId).select("id");
    if (error) throw error;
    if (!data?.length) throw new ActionError("Review not found.");
    await audit(admin, published ? "review.shown" : "review.hidden", { entity: "review", entityId: reviewId });
    revalidatePath("/admin/reviews");
    revalidatePath("/book", "layout");
    return { ok: true, message: published ? "Review is visible on the website." : "Review is hidden from the website." };
  });
}
