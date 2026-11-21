import "server-only";
import { cache } from "react";
import { mergeDefaults } from "@/lib/cms/validate";
import { db } from "@/lib/server/core/db";

/**
 * A saved list replaces the default list as a whole, so fields added to the schema later are missing from the
 * saved items. For the fleet, fill them in from the built-in vehicle of the same name, so the admin form and
 * the website show real values instead of blanks.
 */
function backfillNewFields<T>(key: string, defaults: T, merged: T): T {
  if (key !== "fleet") return merged;
  const base = (defaults as { items?: Record<string, unknown>[] }).items;
  const saved = (merged as { items?: Record<string, unknown>[] }).items;
  if (!Array.isArray(base) || !Array.isArray(saved)) return merged;
  const items = saved.map((item) => {
    const same = base.find((candidate) => candidate.title === item.title);
    const filled: Record<string, unknown> = { ...item };
    if (same) {
      for (const field of ["category", "fuel", "models", "bags", "extraKmRate", "minKmPerDay", "driverAllowance", "minFare", "listDiscountPercent"]) {
        if (filled[field] === undefined || filled[field] === null) filled[field] = same[field];
      }
    }
    // outstation rate per km: a vehicle saved before it existed keeps charging what its own extra-km rate says (any vehicle name,
    // not only the built-in ones), so it does not silently drop out of the cab list
    if (filled.ratePerKm === undefined || filled.ratePerKm === null) {
      filled.ratePerKm = typeof filled.extraKmRate === "number" ? filled.extraKmRate : same?.ratePerKm;
    }
    // the same values the website already uses when these were never saved, so the admin form shows them instead of blank boxes
    if (filled.minKmPerDay === undefined || filled.minKmPerDay === null) filled.minKmPerDay = 300;
    if (filled.minFare === undefined || filled.minFare === null) filled.minFare = 0;
    if (filled.driverAllowance === undefined || filled.driverAllowance === null) filled.driverAllowance = 0;
    return filled;
  });
  return { ...(merged as object), items } as T;
}

/**
 * Editable website content lives in `site_content` (one JSON document per key). A missing row, or a
 * database problem, falls back to the built-in defaults, so the public site never breaks because of the CMS.
 */
export async function readDoc<T>(key: string, defaults: T): Promise<T> {
  try {
    const { data, error } = await db().from("site_content").select("value").eq("key", key).maybeSingle();
    if (error) throw error;
    return data ? backfillNewFields(key, defaults, mergeDefaults(defaults, data.value)) : defaults;
  } catch (error) {
    console.error(`Content "${key}" could not be read, using defaults`, error);
    return defaults;
  }
}

/** Per-request memo so a page and its layout share one read. */
export function doc<T>(key: string, defaults: T): () => Promise<T> {
  return cache(() => readDoc(key, defaults));
}

export async function readRaw(key: string): Promise<unknown | null> {
  const { data, error } = await db().from("site_content").select("value").eq("key", key).maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
}

export async function writeDoc(key: string, value: unknown, updatedBy: string) {
  const { error } = await db()
    .from("site_content")
    .upsert({ key, value, updated_by: updatedBy, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}

export async function deleteDoc(key: string) {
  const { error } = await db().from("site_content").delete().eq("key", key);
  if (error) throw error;
}
