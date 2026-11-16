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
