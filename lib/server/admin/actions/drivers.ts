"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/admin/action-state";
import { audit } from "@/lib/server/admin/audit";
import { ActionError, idOrThrow, run } from "@/lib/server/admin/actions/run";
import { db } from "@/lib/server/core/db";
import { phone as validPhone } from "@/lib/server/core/validate";

const text = (formData: FormData, key: string, max: number) =>
  String(formData.get(key) ?? "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

function parse(formData: FormData) {
  const name = text(formData, "name", 80);
  if (name.length < 2) throw new ActionError("Enter the driver's name.");
  const phone = validPhone(text(formData, "phone", 20));
  const cab = text(formData, "cabNumber", 20).toUpperCase();
  if (cab && !/^[A-Z0-9][A-Z0-9 -]{3,18}$/.test(cab)) throw new ActionError("Enter a valid cab number, for example MH12 AB 1234.");
  return { name, phone, cab_number: cab, cab_model: text(formData, "cabModel", 60), note: String(formData.get("note") ?? "").replace(/\r\n/g, "\n").trim().slice(0, 500) };
}

/** Adds a driver (and the cab they usually drive) to the owner's list. */
export async function createDriverAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return run("bookings.manage", async (admin) => {
    const input = parse(formData);
    const { data, error } = await db().from("drivers").insert(input).select("id").single();
    if (error) {
      if (error.code === "23505") throw new ActionError("A driver with this mobile number is already in your list.");
      throw error;
    }
    await audit(admin, "driver.created", { entity: "driver", entityId: data.id });
    revalidatePath("/admin/drivers");
    redirect(`/admin/drivers/${data.id}?created=1`);
  });
}

export async function updateDriverAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return run("bookings.manage", async (admin) => {
    const driverId = idOrThrow(id);
    const input = parse(formData);
    const { data, error } = await db().from("drivers").update(input).eq("id", driverId).select("id");
    if (error) {
      if (error.code === "23505") throw new ActionError("Another driver already has this mobile number.");
      throw error;
    }
    if (!data?.length) throw new ActionError("Driver not found.");
    await audit(admin, "driver.updated", { entity: "driver", entityId: driverId });
    revalidatePath("/admin/drivers");
    revalidatePath(`/admin/drivers/${driverId}`);
    return { ok: true, message: "Driver saved. Trips already assigned keep the details they were given." };
  });
}

/** A driver who has left is switched off, not deleted, so past trips keep their history. */
export async function setDriverActiveAction(id: string, active: boolean): Promise<ActionState> {
  return run("bookings.manage", async (admin) => {
    const driverId = idOrThrow(id);
    const { data, error } = await db().from("drivers").update({ active: active === true }).eq("id", driverId).select("id");
    if (error) throw error;
    if (!data?.length) throw new ActionError("Driver not found.");
    await audit(admin, active ? "driver.activated" : "driver.deactivated", { entity: "driver", entityId: driverId });
    revalidatePath("/admin/drivers");
    revalidatePath(`/admin/drivers/${driverId}`);
    return { ok: true, message: active ? "Driver is active again." : "Driver switched off. They no longer appear when assigning." };
  });
}
