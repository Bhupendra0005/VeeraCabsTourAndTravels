import "server-only";
import { listSellableRoutes } from "@/lib/server/bookings/sellable-routes";
import { getAreas, getDestinations } from "@/lib/server/cms/content";

/**
 * Our own places, used for address suggestions when the free online lookup (Photon) has nothing or is down:
 * Pune areas and their landmarks, destinations, and every city that has a route. All come from the database / admin
 * content, so whatever the owner edits there is what gets suggested.
 */
export async function getLocalPlaces(): Promise<string[]> {
  const out = new Set<string>();
  try {
    const [areas, destinations, routes] = await Promise.all([
      getAreas(),
      getDestinations(),
      listSellableRoutes().then((data) => ({ data })),
    ]);
    for (const area of areas) {
      out.add(`${area.name}, Pune`);
      for (const landmark of area.landmarks ?? []) out.add(`${landmark}, ${area.name}, Pune`);
    }
    for (const destination of destinations) out.add(destination.name);
    for (const row of routes.data ?? []) {
      out.add(row.from_city);
      out.add(row.to_city);
    }
  } catch (error) {
    console.error("Local places could not be loaded", error);
  }
  return [...out].filter((place) => place && place.length <= 120).sort().slice(0, 400);
}
