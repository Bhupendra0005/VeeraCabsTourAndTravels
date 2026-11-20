"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/admin/action-state";
import { DOCUMENT_LAYOUT_FIELDS, DOCUMENT_LAYOUT_KEY, HEX_COLOR } from "@/lib/booking/document-layout";
import { BOOKING_EXTRAS_KEY } from "@/lib/booking/extras";
import { BOOKING_SETTINGS_FIELDS, BOOKING_SETTINGS_KEY } from "@/lib/booking/settings";
import { AIRPORT_KEY, HOURLY_KEY } from "@/lib/booking/transfers";
import { getDocDefinition } from "@/lib/cms/docs";
import { DocError, validateFields } from "@/lib/cms/validate";
import { audit } from "@/lib/server/admin/audit";
import { ActionError, run } from "@/lib/server/admin/actions/run";
import { getAirportFares, getFleetAll, getHourlyFares } from "@/lib/server/cms/content";
import { db } from "@/lib/server/core/db";
import { readExtrasForEdit } from "@/lib/server/cms/extras";
import { deleteDoc, writeDoc } from "@/lib/server/cms/store";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Rules a schema cannot express: unique slugs/names, at least one visible vehicle. */
async function crossChecks(key: string, doc: Record<string, unknown>) {
  const items = Array.isArray(doc.items) ? (doc.items as Record<string, unknown>[]) : [];

  if (key === BOOKING_SETTINGS_KEY) {
    const free = Number(doc.freeCancelMinutes);
    const seen = new Set<number>();
    for (const slab of (Array.isArray(doc.refundSlabs) ? doc.refundSlabs : []) as { hoursBefore: number; percent: number }[]) {
      if (slab.hoursBefore * 60 >= free) throw new ActionError("Each partial refund step must be shorter than the full-refund time (so it comes after it). Lower the hours or raise the full-refund time.");
      if (!Number.isInteger(slab.percent)) throw new ActionError("A refund percentage must be a whole number.");
      if (seen.has(slab.hoursBefore)) throw new ActionError("Two refund steps use the same hours. Each step needs a different time.");
      seen.add(slab.hoursBefore);
    }
    doc.refundSlabs = ((doc.refundSlabs as { hoursBefore: number; percent: number }[]) ?? []).slice().sort((a, b) => b.hoursBefore - a.hoursBefore);
  }

  if (["destinations", "areas", "services"].includes(key)) {
    const seen = new Set<string>();
    for (const item of items) {
      const slug = String(item.slug ?? "");
      if (!SLUG.test(slug)) {
        throw new ActionError(`"${String(item.name ?? item.title ?? slug)}": the page address may only use lowercase letters, numbers and dashes.`);
      }
      if (seen.has(slug)) throw new ActionError(`The page address "${slug}" is used twice. Each one must be unique.`);
      seen.add(slug);
    }
  }
  if (key === "fleet") {
    const names = new Set<string>();
    for (const item of items) {
      const title = String(item.title ?? "").toLowerCase();
      if (names.has(title)) throw new ActionError(`There are two vehicles called "${String(item.title)}". Names must be unique.`);
      names.add(title);
    }
    if (!items.some((item) => item.active === true)) throw new ActionError("Keep at least one vehicle visible on the website.");
  }
  if (key === AIRPORT_KEY || key === HOURLY_KEY) {
    // a fare whose vehicle name does not match a vehicle in the Fleet would silently never be shown, so refuse it
    const fleet = (await getFleetAll()).map((vehicle) => vehicle.title);
    const rows = Array.isArray(doc.fares) ? (doc.fares as Record<string, unknown>[]) : [];
    rows.forEach((row, index) => {
      const vehicle = String(row.vehicle ?? "");
      if (!fleet.includes(vehicle)) {
        throw new ActionError(`Fare #${index + 1}: the vehicle "${vehicle}" is not in your Fleet. Use exactly one of: ${fleet.join(", ")}.`);
      }
    });
  }
  if (key === "site_info") {
    const email = String(doc.email ?? "");
    if (!/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/.test(email)) throw new ActionError("Enter a valid email address.");
    const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
    if (digits((doc.primaryPhone as { raw?: string }).raw).length < 10) throw new ActionError("The primary phone needs at least 10 digits.");
    if (digits(doc.whatsapp).length < 10) throw new ActionError("The WhatsApp number needs country code and number, digits only.");
  }
}

/**
 * Which vehicles were renamed by this save. A name that disappeared from the list and a new name that appeared are one rename
 * (paired in the order they appear); anything else (a vehicle added, or removed) is not a rename and touches no fares.
 */
function detectRenames(before: string[], after: string[]): [string, string][] {
  const removed = before.filter((title) => !after.includes(title));
  const added = after.filter((title) => !before.includes(title));
  if (removed.length === 0 || removed.length !== added.length) return [];
  return removed.map((title, index) => [title, added[index]]);
}

/**
 * A vehicle's name is what ties it to its fares, so renaming it in the Fleet must rename it everywhere, or the vehicle
 * silently disappears from the booking page. This moves: route fares, airport and hourly fares, reviews, and the bookings that
 * still hold the vehicle (confirmed or waiting for payment, so availability keeps counting them). Finished bookings keep the
 * name they were made under.
 */
async function renameVehicleEverywhere(renames: [string, string][], adminEmail: string): Promise<{ routeFares: number; transferFares: number }> {
  const done: [string, string][] = [];
  let routeFares = 0;
  let transferFares = 0;
  try {
    for (const [oldName, newName] of renames) {
      const { data, error } = await db().from("route_fares").update({ vehicle_type: newName }).eq("vehicle_type", oldName).select("id");
      if (error) {
        if (error.code === "23505") throw new ActionError(`Some routes already have a fare named "${newName}". Pick a name that is not used in Routes & fares.`);
        throw error;
      }
      done.push([oldName, newName]);
      routeFares += data?.length ?? 0;
      const reviews = await db().from("reviews").update({ vehicle_type: newName }).eq("vehicle_type", oldName);
      if (reviews.error) throw reviews.error;
      const bookings = await db().from("bookings").update({ vehicle_type: newName }).eq("vehicle_type", oldName).in("status", ["confirmed", "pending_payment"]);
      if (bookings.error) throw bookings.error;
    }

    // airport and hourly fares are one document each; rows are matched by vehicle name
    const rename = (name: string) => renames.find(([oldName]) => oldName === name)?.[1] ?? name;
    for (const [key, read] of [[AIRPORT_KEY, getAirportFares], [HOURLY_KEY, getHourlyFares]] as const) {
      const current = await read();
      const rows = current.fares as { vehicle: string }[];
      const changed = rows.filter((row) => rename(row.vehicle) !== row.vehicle).length;
      if (changed === 0) continue;
      await writeDoc(key, { ...current, fares: rows.map((row) => ({ ...row, vehicle: rename(row.vehicle) })) }, adminEmail);
      transferFares += changed;
    }
  } catch (error) {
    // best effort: put the route fares back, so a half-finished rename does not leave a vehicle with no fares
    for (const [oldName, newName] of done) await db().from("route_fares").update({ vehicle_type: oldName }).eq("vehicle_type", newName);
    throw error;
  }
  return { routeFares, transferFares };
}

/** Saves one website content document after validating it against its schema. */
export async function saveDocAction(key: string, value: unknown): Promise<ActionState> {
  const isLayout = key === DOCUMENT_LAYOUT_KEY;
  const isSettings = key === BOOKING_SETTINGS_KEY || isLayout;
  return run(isSettings ? "settings.manage" : "content.manage", async (admin) => {
    const fields = key === BOOKING_SETTINGS_KEY ? BOOKING_SETTINGS_FIELDS : isLayout ? DOCUMENT_LAYOUT_FIELDS : getDocDefinition(key)?.fields;
    if (!fields) throw new ActionError("Unknown content section.");

    let clean: Record<string, unknown>;
    try {
      clean = validateFields(fields, value);
    } catch (error) {
      if (error instanceof DocError) throw new ActionError(error.message);
      throw error;
    }
    await crossChecks(key, clean);
    // coupons are managed on Admin > Coupons only: whatever this editor sends, keep the coupons as they are saved now
    if (key === BOOKING_EXTRAS_KEY) clean.coupons = (await readExtrasForEdit()).coupons;
    if (isLayout) {
      const look = clean.look as { theme?: string; customColor?: string };
      if (look.theme === "custom" && !HEX_COLOR.test(look.customColor ?? "")) {
        throw new ActionError("Custom colour: enter it as #RRGGBB, for example #1473e0.");
      }
    }

    // renaming a vehicle: carry the new name into every fare first, then save the fleet (so the two never disagree)
    let renamed = "";
    let renames: [string, string][] = [];
    if (key === "fleet") {
      const before = (await getFleetAll()).map((vehicle) => vehicle.title);
      const after = ((clean.items as { title?: unknown }[]) ?? []).map((item) => String(item.title ?? ""));
      renames = detectRenames(before, after);
      if (renames.length > 0) {
        const moved = await renameVehicleEverywhere(renames, admin.email);
        await audit(admin, "fleet.renamed", { entity: "content", entityId: "fleet", meta: { renames, ...moved } });
        renamed = ` ${renames.map(([from, to]) => `"${from}" is now "${to}"`).join(", ")} in ${moved.routeFares} route fares and ${moved.transferFares} airport/hourly fares.`;
      }
    }

    try {
      await writeDoc(key, clean, admin.email);
    } catch (error) {
      // the fleet did not save: move the names back so fares and fleet still agree
      if (renames.length > 0) await renameVehicleEverywhere(renames.map(([from, to]) => [to, from] as [string, string]), admin.email).catch(() => undefined);
      throw error;
    }
    await audit(admin, "content.saved", { entity: "content", entityId: key });
    // the public site is statically generated: refresh every page so the change shows up straight away
    revalidatePath("/", "layout");
    return { ok: true, message: isLayout ? "Saved. New invoices and tickets use this design." : `Saved. The website is updated.${renamed}` };
  });
}

/** Removes the owner's edits so the built-in original content is used again. */
export async function resetDocAction(key: string): Promise<ActionState> {
  const isLayout = key === DOCUMENT_LAYOUT_KEY;
  return run(isLayout ? "settings.manage" : "content.manage", async (admin) => {
    if (!isLayout && !getDocDefinition(key)) throw new ActionError("Unknown content section.");
    await deleteDoc(key);
    await audit(admin, "content.reset", { entity: "content", entityId: key });
    revalidatePath("/", "layout");
    return { ok: true, message: isLayout ? "Restored the original design." : "Restored the original content." };
  });
}
