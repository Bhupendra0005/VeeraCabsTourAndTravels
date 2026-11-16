import "server-only";
import { getFleetAll } from "@/lib/server/cms/content";
import { db } from "@/lib/server/core/db";

type RouteRow = { from_city: string; to_city: string; route_fares: { vehicle_type: string }[] | null };

/**
 * Active routes a customer can actually book: at least one fare for a vehicle that is switched on in the Fleet.
 * A route with no fares (or only fares for hidden vehicles) would show up in the From/To lists and then lead to an
 * empty vehicle list, so it is left out until the owner prices it. Switching a route off in Admin > Routes hides it too.
 */
export async function listSellableRoutes(): Promise<{ from_city: string; to_city: string }[]> {
  const [{ data, error }, fleet] = await Promise.all([
    db().from("routes").select("from_city, to_city, route_fares(vehicle_type)").eq("active", true),
    getFleetAll(),
  ]);
  if (error) throw error;
  const live = new Set(fleet.filter((vehicle) => vehicle.active).map((vehicle) => vehicle.title));
  return (data as unknown as RouteRow[])
    .filter((row) => (row.route_fares ?? []).some((fare) => live.has(fare.vehicle_type)))
    .map(({ from_city, to_city }) => ({ from_city, to_city }));
}
