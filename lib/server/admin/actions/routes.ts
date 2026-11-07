"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/admin/action-state";
import { audit } from "@/lib/server/admin/audit";
import { ActionError, idOrThrow, run } from "@/lib/server/admin/actions/run";
import { getFleetAll } from "@/lib/server/cms/content";
import { db } from "@/lib/server/core/db";

const MAX_FARE_RUPEES = 1_000_000;

function text(formData: FormData, key: string, label: string): string {
  const value = String(formData.get(key) ?? "").replace(/\s+/g, " ").trim();
  if (value.length < 2 || value.length > 60) throw new ActionError(`${label} must be 2 to 60 characters.`);
  return value;
}

function rupeesToPaise(raw: FormDataEntryValue | null, label: string, required: boolean): number | null {
  const value = String(raw ?? "").trim();
  if (!value) {
    if (required) throw new ActionError(`${label} is required.`);
    return null;
  }
  const rupees = Number(value);
  if (!Number.isFinite(rupees) || rupees <= 0 || rupees > MAX_FARE_RUPEES) {
    throw new ActionError(`${label} must be between 1 and ${MAX_FARE_RUPEES.toLocaleString("en-IN")} rupees.`);
  }
  return Math.round(rupees * 100);
}

type FareInput = { vehicle: string; oneWay: number | null; roundTrip: number | null };

async function writeFares(routeId: string, fares: FareInput[]) {
  for (const fare of fares) {
    if (fare.oneWay === null) {
      const { error } = await db().from("route_fares").delete().eq("route_id", routeId).eq("vehicle_type", fare.vehicle);
      if (error) throw error;
    } else {
      const { error } = await db()
        .from("route_fares")
        .upsert(
          { route_id: routeId, vehicle_type: fare.vehicle, fare_one_way: fare.oneWay, fare_round_trip: fare.roundTrip },
          { onConflict: "route_id,vehicle_type" },
        );
      if (error) throw error;
    }
  }
}

/** Creates or updates a route and its per-vehicle fares. */
export async function saveRouteAction(routeId: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  let savedId = "";
  const result = await run("routes.manage", async (admin) => {
    const fromCity = text(formData, "fromCity", "From city");
    const toCity = text(formData, "toCity", "To city");
    if (fromCity.toLowerCase() === toCity.toLowerCase()) throw new ActionError("From and To must be different.");

    const distance = Number(formData.get("distanceKm"));
    const hours = Number(formData.get("durationHours"));
    if (!Number.isInteger(distance) || distance < 1 || distance > 5000) throw new ActionError("Distance must be a whole number of km (1 to 5000).");
    if (!Number.isFinite(hours) || hours <= 0 || hours > 99) throw new ActionError("Duration must be between 0.1 and 99 hours.");
    const active = formData.get("active") === "on";

    const titles = new Set((await getFleetAll()).map((vehicle) => vehicle.title));
    const fares: FareInput[] = [];
    for (let i = 0; i < 30; i += 1) {
      const vehicle = formData.get(`vehicle_${i}`);
      if (typeof vehicle !== "string") break;
      if (!titles.has(vehicle)) throw new ActionError("Unknown vehicle in the fare table.");
      const oneWay = rupeesToPaise(formData.get(`oneWay_${i}`), `${vehicle} one-way fare`, false);
      const roundTrip = rupeesToPaise(formData.get(`roundTrip_${i}`), `${vehicle} round-trip fare`, false);
      if (oneWay === null && roundTrip !== null) throw new ActionError(`${vehicle}: enter the one-way fare too.`);
      fares.push({ vehicle, oneWay, roundTrip });
    }

    const fields = { from_city: fromCity, to_city: toCity, distance_km: distance, duration_hours: hours, active };
    let id: string;
    if (routeId) {
      id = idOrThrow(routeId);
      const { error } = await db().from("routes").update(fields).eq("id", id);
      if (error) {
        if (error.code === "23505") throw new ActionError("A route with this From and To already exists.");
        throw error;
      }
    } else {
      const { data, error } = await db().from("routes").insert(fields).select("id").single();
      if (error) {
        if (error.code === "23505") throw new ActionError("A route with this From and To already exists.");
        throw error;
      }
      id = data.id;
    }
    await writeFares(id, fares);

    // optional: the same trip in the other direction, with the same fares
    if (formData.get("alsoReverse") === "on") {
      const reverse = { ...fields, from_city: toCity, to_city: fromCity };
      const { data: existing } = await db().from("routes").select("id").eq("from_city", toCity).eq("to_city", fromCity).maybeSingle();
      let reverseId = existing?.id as string | undefined;
      if (reverseId) {
        await db().from("routes").update(reverse).eq("id", reverseId);
      } else {
        const { data, error } = await db().from("routes").insert(reverse).select("id").single();
        if (error) throw error;
        reverseId = data.id;
      }
      await writeFares(reverseId as string, fares);
    }

    savedId = id;
    await audit(admin, routeId ? "route.updated" : "route.created", { entity: "route", entityId: id, meta: { fromCity, toCity, active } });
    revalidatePath("/admin/routes");
    revalidatePath("/book");
    return { ok: true, message: "Route and fares saved." };
  });

  if (result.ok && !routeId && savedId) redirect(`/admin/routes/${savedId}?created=1`);
  return result;
}

export async function deleteRouteAction(id: string): Promise<ActionState> {
  const result = await run("routes.manage", async (admin) => {
    const routeId = idOrThrow(id);
    const { error } = await db().from("routes").delete().eq("id", routeId);
    if (error) {
      if (error.code === "23503") {
        throw new ActionError("This route already has bookings, so it cannot be deleted. Switch it off instead.");
      }
      throw error;
    }
    await audit(admin, "route.deleted", { entity: "route", entityId: routeId });
    revalidatePath("/admin/routes");
    revalidatePath("/book");
    return { ok: true };
  });
  if (result.ok) redirect("/admin/routes?deleted=1");
  return result;
}

export async function toggleRouteAction(id: string, active: boolean): Promise<ActionState> {
  return run("routes.manage", async (admin) => {
    const routeId = idOrThrow(id);
    const { error } = await db().from("routes").update({ active }).eq("id", routeId);
    if (error) throw error;
    await audit(admin, active ? "route.enabled" : "route.disabled", { entity: "route", entityId: routeId });
    revalidatePath("/admin/routes");
    revalidatePath("/book");
    return { ok: true, message: active ? "Route is now bookable." : "Route is switched off." };
  });
}
