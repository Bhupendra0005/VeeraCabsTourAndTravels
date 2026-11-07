import "server-only";
import { cache } from "react";
import { mergeDefaults } from "@/lib/cms/validate";
import { db } from "@/lib/server/core/db";

/**
 * Editable website content lives in `site_content` (one JSON document per key). A missing row, or a
 * database problem, falls back to the built-in defaults, so the public site never breaks because of the CMS.
 */
export async function readDoc<T>(key: string, defaults: T): Promise<T> {
  try {
    const { data, error } = await db().from("site_content").select("value").eq("key", key).maybeSingle();
    if (error) throw error;
    return data ? mergeDefaults(defaults, data.value) : defaults;
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
