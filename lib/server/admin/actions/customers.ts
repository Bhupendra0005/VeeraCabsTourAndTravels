"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/admin/action-state";
import { audit } from "@/lib/server/admin/audit";
import { ActionError, idOrThrow, run } from "@/lib/server/admin/actions/run";
import { db } from "@/lib/server/core/db";

/** A private note about a customer. Only staff see it; the customer never does. */
export async function saveCustomerNoteAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return run("bookings.manage", async (admin) => {
    const customerId = idOrThrow(id);
    const note = String(formData.get("note") ?? "").replace(/\r\n/g, "\n").trim().slice(0, 1000);
    const { data, error } = await db().from("customers").update({ admin_note: note }).eq("id", customerId).select("id");
    if (error) throw error;
    if (!data?.length) throw new ActionError("Customer not found.");
    await audit(admin, "customer.note_saved", { entity: "customer", entityId: customerId });
    revalidatePath(`/admin/customers/${customerId}`);
    return { ok: true, message: "Note saved." };
  });
}

/**
 * Permanently deletes a customer (test or fake accounts). Owner only. A customer who has any booking or review is kept:
 * block them instead, so booking history is never orphaned.
 */
export async function deleteCustomerAction(id: string): Promise<ActionState> {
  return run("bookings.delete", async (admin) => {
    const customerId = idOrThrow(id);
    const [bookings, reviews] = await Promise.all([
      db().from("bookings").select("id", { count: "exact", head: true }).eq("customer_id", customerId),
      db().from("reviews").select("id", { count: "exact", head: true }).eq("customer_id", customerId),
    ]);
    if (bookings.error) throw bookings.error;
    if (reviews.error) throw reviews.error;
    if (bookings.count || reviews.count) {
      throw new ActionError("This customer has bookings or reviews, so they cannot be deleted. Block them instead if you do not want new bookings.");
    }
    const { data, error } = await db().from("customers").delete().eq("id", customerId).select("id, email");
    if (error) throw error;
    if (!data?.length) throw new ActionError("Customer not found.");
    await audit(admin, "customer.deleted", { entity: "customer", entityId: customerId, meta: { email: data[0].email } });
    revalidatePath("/admin/customers");
    return { ok: true, message: "Customer deleted." };
  });
}

/**
 * Blocks or unblocks a customer. A blocked customer can still log in and see their old trips, but cannot make new online
 * bookings (the owner can still enter one for them by phone after unblocking). Owner only.
 */
export async function setCustomerBlockedAction(id: string, blocked: boolean, reason: string): Promise<ActionState> {
  return run("settings.manage", async (admin) => {
    const customerId = idOrThrow(id);
    const why = String(reason ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 300);
    if (blocked && why.length < 3) throw new ActionError("Write a short reason for blocking, so you remember why later.");
    const { data, error } = await db()
      .from("customers")
      .update({ blocked: blocked === true, blocked_reason: blocked ? why : "", blocked_at: blocked ? new Date().toISOString() : null })
      .eq("id", customerId)
      .select("id");
    if (error) throw error;
    if (!data?.length) throw new ActionError("Customer not found.");
    await audit(admin, blocked ? "customer.blocked" : "customer.unblocked", { entity: "customer", entityId: customerId, meta: blocked ? { reason: why } : undefined });
    revalidatePath(`/admin/customers/${customerId}`);
    revalidatePath("/admin/customers");
    return { ok: true, message: blocked ? "Customer blocked from new online bookings." : "Customer unblocked." };
  });
}
