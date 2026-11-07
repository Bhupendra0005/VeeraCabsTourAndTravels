"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/admin/action-state";
import { DOCUMENT_LAYOUT_FIELDS, DOCUMENT_LAYOUT_KEY, HEX_COLOR } from "@/lib/booking/document-layout";
import { BOOKING_SETTINGS_FIELDS, BOOKING_SETTINGS_KEY } from "@/lib/booking/settings";
import { getDocDefinition } from "@/lib/cms/docs";
import { DocError, validateFields } from "@/lib/cms/validate";
import { audit } from "@/lib/server/admin/audit";
import { ActionError, run } from "@/lib/server/admin/actions/run";
import { deleteDoc, writeDoc } from "@/lib/server/cms/store";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Rules a schema cannot express: unique slugs/names, at least one visible vehicle. */
function crossChecks(key: string, doc: Record<string, unknown>) {
  const items = Array.isArray(doc.items) ? (doc.items as Record<string, unknown>[]) : [];

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
  if (key === "site_info") {
    const email = String(doc.email ?? "");
    if (!/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/.test(email)) throw new ActionError("Enter a valid email address.");
    const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
    if (digits((doc.primaryPhone as { raw?: string }).raw).length < 10) throw new ActionError("The primary phone needs at least 10 digits.");
    if (digits(doc.whatsapp).length < 10) throw new ActionError("The WhatsApp number needs country code and number, digits only.");
  }
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
    crossChecks(key, clean);
    if (isLayout) {
      const look = clean.look as { theme?: string; customColor?: string };
      if (look.theme === "custom" && !HEX_COLOR.test(look.customColor ?? "")) {
        throw new ActionError("Custom colour: enter it as #RRGGBB, for example #1473e0.");
      }
    }

    await writeDoc(key, clean, admin.email);
    await audit(admin, "content.saved", { entity: "content", entityId: key });
    // the public site is statically generated: refresh every page so the change shows up straight away
    revalidatePath("/", "layout");
    return { ok: true, message: isLayout ? "Saved. New invoices and tickets use this design." : "Saved. The website is updated." };
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
