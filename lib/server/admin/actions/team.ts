"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/admin/action-state";
import { audit } from "@/lib/server/admin/audit";
import { ActionError, idOrThrow, run } from "@/lib/server/admin/actions/run";
import { hashPassword, passwordProblem } from "@/lib/server/admin/password";
import { db } from "@/lib/server/core/db";

const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/;

async function activeOwnerCount(excludingId?: string): Promise<number> {
  let query = db().from("admin_users").select("id", { count: "exact", head: true }).eq("role", "owner").eq("active", true);
  if (excludingId) query = query.neq("id", excludingId);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function createAdminAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return run("team.manage", async (admin) => {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const name = String(formData.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
    const role = String(formData.get("role") ?? "");
    const password = String(formData.get("password") ?? "");

    if (!EMAIL.test(email) || email.length > 254) throw new ActionError("Enter a valid email address.");
    if (role !== "owner" && role !== "staff") throw new ActionError("Choose a role.");
    const problem = passwordProblem(password, email);
    if (problem) throw new ActionError(`Temporary password: ${problem}`);

    const { data, error } = await db()
      .from("admin_users")
      .insert({ email, name, role, password_hash: await hashPassword(password), must_change_password: true })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") throw new ActionError("An admin with this email already exists.");
      throw error;
    }
    await audit(admin, "team.created", { entity: "admin", entityId: data.id, meta: { email, role } });
    revalidatePath("/admin/team");
    return { ok: true, message: `${email} can now sign in with the temporary password and will be asked to choose their own.` };
  });
}

export async function setAdminActiveAction(id: string, active: boolean): Promise<ActionState> {
  return run("team.manage", async (admin) => {
    const targetId = idOrThrow(id);
    if (targetId === admin.id && !active) throw new ActionError("You cannot switch off your own account.");

    const { data: target } = await db().from("admin_users").select("role, session_version").eq("id", targetId).maybeSingle();
    if (!target) throw new ActionError("Admin not found.");
    if (!active && target.role === "owner" && (await activeOwnerCount(targetId)) === 0) {
      throw new ActionError("There must always be at least one active owner.");
    }

    const { error } = await db()
      .from("admin_users")
      .update({ active, session_version: target.session_version + 1, failed_attempts: 0, locked_until: null })
      .eq("id", targetId);
    if (error) throw error;
    await audit(admin, active ? "team.enabled" : "team.disabled", { entity: "admin", entityId: targetId });
    revalidatePath("/admin/team");
    return { ok: true, message: active ? "Account switched on." : "Account switched off and signed out everywhere." };
  });
}

/**
 * Permanently removes a team member. Not yourself, and never the last active owner. Their past entries in the audit log
 * stay (the log keeps the email), so "who did what" is not lost.
 */
export async function deleteAdminAction(id: string): Promise<ActionState> {
  return run("team.manage", async (admin) => {
    const targetId = idOrThrow(id);
    if (targetId === admin.id) throw new ActionError("You cannot delete your own account.");
    const { data: target } = await db().from("admin_users").select("email, role, active").eq("id", targetId).maybeSingle();
    if (!target) throw new ActionError("Admin not found.");
    if (target.role === "owner" && target.active && (await activeOwnerCount(targetId)) === 0) {
      throw new ActionError("There must always be at least one active owner.");
    }
    const { error } = await db().from("admin_users").delete().eq("id", targetId);
    if (error) throw error;
    await audit(admin, "team.deleted", { entity: "admin", entityId: targetId, meta: { email: target.email, role: target.role } });
    revalidatePath("/admin/team");
    return { ok: true, message: `${target.email} was removed.` };
  });
}

export async function setAdminRoleAction(id: string, role: string): Promise<ActionState> {
  return run("team.manage", async (admin) => {
    const targetId = idOrThrow(id);
    if (role !== "owner" && role !== "staff") throw new ActionError("Choose a role.");
    const { data: target } = await db().from("admin_users").select("role").eq("id", targetId).maybeSingle();
    if (!target) throw new ActionError("Admin not found.");
    if (target.role === "owner" && role === "staff" && (await activeOwnerCount(targetId)) === 0) {
      throw new ActionError("There must always be at least one active owner.");
    }
    const { error } = await db().from("admin_users").update({ role }).eq("id", targetId);
    if (error) throw error;
    await audit(admin, "team.role_changed", { entity: "admin", entityId: targetId, meta: { role } });
    revalidatePath("/admin/team");
    return { ok: true, message: "Role updated." };
  });
}

export async function resetAdminPasswordAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return run("team.manage", async (admin) => {
    const targetId = idOrThrow(id);
    const password = String(formData.get("password") ?? "");
    const { data: target } = await db().from("admin_users").select("email, session_version").eq("id", targetId).maybeSingle();
    if (!target) throw new ActionError("Admin not found.");
    const problem = passwordProblem(password, target.email);
    if (problem) throw new ActionError(`Temporary password: ${problem}`);

    const { error } = await db()
      .from("admin_users")
      .update({
        password_hash: await hashPassword(password),
        must_change_password: true,
        session_version: target.session_version + 1,
        failed_attempts: 0,
        locked_until: null,
      })
      .eq("id", targetId);
    if (error) throw error;
    await audit(admin, "team.password_reset", { entity: "admin", entityId: targetId });
    revalidatePath("/admin/team");
    return { ok: true, message: "Temporary password set. They are signed out and must choose a new one at next sign-in." };
  });
}
