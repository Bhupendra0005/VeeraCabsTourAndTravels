"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/admin/action-state";
import { EXTERNAL_SOURCES, shortName, type ExternalSource } from "@/lib/booking/reviews";
import { audit } from "@/lib/server/admin/audit";
import { ActionError, idOrThrow, run } from "@/lib/server/admin/actions/run";
import { db } from "@/lib/server/core/db";
import { isoDate } from "@/lib/server/core/validate";

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
    revalidatePath("/");
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
    revalidatePath("/");
    return { ok: true, message: published ? "Review is visible on the website." : "Review is hidden from the website." };
  });
}

/** Hides a review added from another site (Google...) from the website, or shows it again. */
export async function setExternalReviewPublishedAction(id: string, published: boolean): Promise<ActionState> {
  return run("bookings.manage", async (admin) => {
    const reviewId = idOrThrow(id);
    const { data, error } = await db().from("external_reviews").update({ published: published === true }).eq("id", reviewId).select("id");
    if (error) throw error;
    if (!data?.length) throw new ActionError("Review not found.");
    await audit(admin, published ? "review.external_shown" : "review.external_hidden", { entity: "review", entityId: reviewId });
    revalidatePath("/admin/reviews", "layout");
    revalidatePath("/");
    return { ok: true, message: published ? "Review is visible on the website." : "Review is hidden from the website." };
  });
}

const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f]/g;

const line = (value: FormDataEntryValue | null, max: number) => String(value ?? "").replace(CONTROL, " ").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * Adds a review a real customer wrote on another site (Google, Justdial...). The source is always shown on the
 * website. The owner is responsible for adding only reviews that were really written.
 */
export async function addExternalReviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return run("bookings.manage", async (admin) => {
    const name = line(formData.get("name"), 60);
    if (name.length < 2) throw new ActionError("Enter the reviewer's name as it appears on the original review.");
    const source = line(formData.get("source"), 10) as ExternalSource;
    if (!Object.hasOwn(EXTERNAL_SOURCES, source)) throw new ActionError("Choose where the review was written.");
    const rating = Number(line(formData.get("rating"), 1));
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ActionError("Choose a rating from 1 to 5.");
    // keep the line breaks of a pasted review, drop other control characters
    const comment = String(formData.get("comment") ?? "").replace(/\r\n/g, "\n").replace(CONTROL, " ").trim();
    if (comment.length < 3) throw new ActionError("Paste the written review.");
    if (comment.length > 600) throw new ActionError("The review can be at most 600 characters. Shorten it without changing the meaning.");
    // optional photo: only a picture from the admin media library (ImageKit) is accepted
    const avatar = String(formData.get("avatar") ?? "").trim();
    if (avatar) {
      let allowed = false;
      try {
        const url = new URL(avatar);
        allowed = url.protocol === "https:" && (url.hostname === "ik.imagekit.io" || url.hostname.endsWith(".imagekit.io")) && avatar.length <= 500;
      } catch {
        allowed = false;
      }
      if (!allowed) throw new ActionError("Choose the photo from the media library.");
    }
    const date = isoDate(line(formData.get("date"), 10), "review date");
    if (date > new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10)) throw new ActionError("The review date cannot be in the future.");

    const { data, error } = await db()
      .from("external_reviews")
      .insert({ reviewer_name: shortName(name), source, rating, comment, review_date: date, created_by: admin.email, ...(avatar ? { avatar_url: avatar } : {}) })
      .select("id")
      .single();
    if (error) throw error;
    await audit(admin, "review.external_added", { entity: "review", entityId: data.id, meta: { source } });
    revalidatePath("/admin/reviews", "layout");
    revalidatePath("/");
    // back to a fresh page: the form is empty again and the new review is in the list below
    redirect(`/admin/reviews/other-sites?added=${data.id}`);
  });
}

/** Removes an owner-added review. */
export async function deleteExternalReviewAction(id: string): Promise<ActionState> {
  return run("bookings.manage", async (admin) => {
    const reviewId = idOrThrow(id);
    const { data, error } = await db().from("external_reviews").delete().eq("id", reviewId).select("id");
    if (error) throw error;
    if (!data?.length) throw new ActionError("Review not found.");
    await audit(admin, "review.external_deleted", { entity: "review", entityId: reviewId });
    revalidatePath("/admin/reviews", "layout");
    revalidatePath("/");
    return { ok: true, message: "Review deleted." };
  });
}
