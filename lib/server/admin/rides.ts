import "server-only";
import { readRaw, writeDoc } from "@/lib/server/cms/store";

/**
 * "Rides completed" on the admin dashboard = the trips marked Completed in Bookings + a number the owner adds
 * (rides done before the website, or outside it). Only the added part is stored, so the total keeps growing by itself.
 */
const KEY = "dashboard_rides";

/** The rides the owner added by hand. 0 when nothing was set, or when it cannot be read. */
export async function getRidesExtra(): Promise<number> {
  try {
    const stored = (await readRaw(KEY)) as { extra?: unknown } | null;
    const n = Number(stored?.extra);
    return Number.isInteger(n) && n >= 0 ? n : 0;
  } catch (error) {
    console.error("Rides completed could not be read", error);
    return 0;
  }
}

export async function setRidesExtra(extra: number, updatedBy: string) {
  await writeDoc(KEY, { extra }, updatedBy);
}
