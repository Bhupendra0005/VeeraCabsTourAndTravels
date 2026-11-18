"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/admin/action-state";
import { audit } from "@/lib/server/admin/audit";
import { ActionError, idOrThrow, run } from "@/lib/server/admin/actions/run";
import { db } from "@/lib/server/core/db";

/**
 * Deletes one payment record. Owner only. Only attempts that never took money (started or failed) can go:
 * a paid or refunded record is the proof of money moving, so it is kept.
 */
export async function deletePaymentAction(id: string): Promise<ActionState> {
  return run("bookings.delete", async (admin) => {
    const paymentId = idOrThrow(id);
    const { data: payment, error: readError } = await db().from("payments").select("id, booking_id, kind, amount, status").eq("id", paymentId).maybeSingle();
    if (readError) throw readError;
    if (!payment) throw new ActionError("Payment not found.");
    if (payment.status !== "created" && payment.status !== "failed") {
      throw new ActionError("Only a failed or not-paid attempt can be deleted. A paid or refunded payment is kept as a record.");
    }
    const { error } = await db().from("payments").delete().eq("id", paymentId).in("status", ["created", "failed"]);
    if (error) throw error;
    await audit(admin, "payment.deleted", {
      entity: "payment",
      entityId: paymentId,
      meta: { booking_id: payment.booking_id, kind: payment.kind, amount: payment.amount, status: payment.status },
    });
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Payment record deleted." };
  });
}
