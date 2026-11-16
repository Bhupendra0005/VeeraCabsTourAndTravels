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
    if (!same) return item;
    const filled: Record<string, unknown> = { ...item };
    for (const field of ["category", "fuel", "models", "bags", "extraKmRate", "listDiscountPercent"]) {
      if (filled[field] === undefined || filled[field] === null) filled[field] = same[field];
    }
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
