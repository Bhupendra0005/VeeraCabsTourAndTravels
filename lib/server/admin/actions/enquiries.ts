"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/admin/action-state";
import { audit } from "@/lib/server/admin/audit";
import { ActionError, idOrThrow, run } from "@/lib/server/admin/actions/run";
import { db } from "@/lib/server/core/db";
import { ENQUIRY_STATUSES, type EnquiryStatus } from "@/lib/server/enquiries";

/** Marks an enquiry as new / contacted / closed. Enquiries are never deleted from the panel. */
export async function setEnquiryStatusAction(id: string, status: EnquiryStatus): Promise<ActionState> {
  return run("bookings.manage", async (admin) => {
    const enquiryId = idOrThrow(id);
    if (!ENQUIRY_STATUSES.includes(status)) throw new ActionError("Invalid status.");
    const { data, error } = await db().from("enquiries").update({ status }).eq("id", enquiryId).select("id");
    if (error) throw error;
    if (!data?.length) throw new ActionError("Enquiry not found.");
    await audit(admin, `enquiry.${status}`, { entity: "enquiry", entityId: enquiryId });
    revalidatePath("/admin/enquiries");
    revalidatePath("/admin");
    return { ok: true, message: "Enquiry updated." };
  });
}
