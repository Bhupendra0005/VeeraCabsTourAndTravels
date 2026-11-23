"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/admin/action-state";
import { audit } from "@/lib/server/admin/audit";
import { ActionError, run } from "@/lib/server/admin/actions/run";
import { setRidesExtra } from "@/lib/server/admin/rides";
import { db } from "@/lib/server/core/db";

/**
 * The owner types how many rides were completed in all. The rides already marked Completed in Bookings are counted by the
 * server (never taken from the browser); the rest is stored as "added by you", so new completed trips add on top of it.
 */
export async function saveRidesCompletedAction(raw: string): Promise<ActionState> {
  return run("bookings.manage", async (admin) => {
    const value = String(raw ?? "").replace(/[,\s]/g, "");
    if (!/^\d{1,7}$/.test(value)) throw new ActionError("Enter the number of rides as a whole number, for example 1250.");
    const total = Number(value);

    const { count, error } = await db().from("bookings").select("id", { count: "exact", head: true }).eq("status", "completed");
    if (error) throw error;
    const inSystem = count ?? 0;
    if (total < inSystem) throw new ActionError(`It cannot be less than the ${inSystem} rides already marked Completed in Bookings.`);

    await setRidesExtra(total - inSystem, admin.email);
    await audit(admin, "dashboard.rides_set", { meta: { total, added: total - inSystem } });
    revalidatePath("/admin");
    return { ok: true };
  });
}
