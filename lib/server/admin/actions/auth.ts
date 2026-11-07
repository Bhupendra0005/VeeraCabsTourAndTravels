"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/admin/action-state";
import { audit, requestIpHash } from "@/lib/server/admin/audit";
import {
  hashPassword,
  passwordProblem,
  verifyAgainstDummy,
  verifyPassword,
} from "@/lib/server/admin/password";
import {
  createAdminSession,
  destroyAdminSession,
  getAdmin,
} from "@/lib/server/admin/session";
import { verifyCaptcha } from "@/lib/server/auth/turnstile";
import { db } from "@/lib/server/core/db";
import { HttpError } from "@/lib/server/core/http";

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
const MAX_IP_FAILS = 10;
const GENERIC_ERROR = "Invalid email or password.";

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  const password = String(formData.get("password") ?? "").slice(0, 256);
  if (!email || !password) return { ok: false, error: GENERIC_ERROR };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  const ipHash = await requestIpHash();

  try {
    await verifyCaptcha(formData.get("captcha"), ip);
  } catch (error) {
    return { ok: false, error: error instanceof HttpError ? error.message : "Captcha check failed." };
  }

  // per-IP throttle across all accounts
  if (ipHash) {
    const since = new Date(Date.now() - LOCK_MINUTES * 60_000).toISOString();
    const { count } = await db()
      .from("admin_login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("success", false)
      .gte("created_at", since);
    if ((count ?? 0) >= MAX_IP_FAILS) {
      return { ok: false, error: "Too many failed attempts. Please try again in 15 minutes." };
    }
  }

  const { data: admin } = await db()
    .from("admin_users")
    .select("id, email, password_hash, active, session_version, failed_attempts, locked_until")
    .eq("email", email)
    .maybeSingle();

  const locked = !!admin?.locked_until && new Date(admin.locked_until).getTime() > Date.now();
  let valid = false;
  if (admin && admin.active && !locked) {
    valid = await verifyPassword(password, admin.password_hash);
  } else {
    await verifyAgainstDummy(password);
  }

  if (!admin || !valid) {
    await db().from("admin_login_attempts").insert({ email, ip_hash: ipHash ?? null, success: false });
    if (admin && admin.active && !locked) {
      const fails = admin.failed_attempts + 1;
      await db()
        .from("admin_users")
        .update(
          fails >= MAX_FAILS
            ? { failed_attempts: 0, locked_until: new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() }
            : { failed_attempts: fails },
        )
        .eq("id", admin.id);
    }
    await audit({ id: admin?.id ?? null, email }, "admin.login_failed");
    return { ok: false, error: locked ? "This account is temporarily locked. Try again in 15 minutes." : GENERIC_ERROR };
  }

  await db()
    .from("admin_users")
    .update({ failed_attempts: 0, locked_until: null, last_login_at: new Date().toISOString() })
    .eq("id", admin.id);
  await db().from("admin_login_attempts").insert({ email, ip_hash: ipHash ?? null, success: true });
  await createAdminSession(admin.id, admin.session_version);
  await audit({ id: admin.id, email }, "admin.login");
  redirect("/admin");
}

export async function logoutAction() {
  const admin = await getAdmin();
  if (admin) await audit(admin, "admin.logout");
  await destroyAdminSession();
  redirect("/admin/login");
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next !== confirm) return { ok: false, error: "The new passwords do not match." };
  const problem = passwordProblem(next, admin.email);
  if (problem) return { ok: false, error: problem };

  const { data: row } = await db()
    .from("admin_users")
    .select("password_hash, session_version")
    .eq("id", admin.id)
    .single();
  if (!row || !(await verifyPassword(current, row.password_hash))) {
    return { ok: false, error: "Your current password is incorrect." };
  }
  if (await verifyPassword(next, row.password_hash)) {
    return { ok: false, error: "Choose a password different from the current one." };
  }

  const version = row.session_version + 1;
  const { error } = await db()
    .from("admin_users")
    .update({ password_hash: await hashPassword(next), must_change_password: false, session_version: version })
    .eq("id", admin.id);
  if (error) return { ok: false, error: "Could not update the password. Please try again." };

  // every other signed-in device is logged out; this one continues
  await createAdminSession(admin.id, version);
  await audit(admin, "admin.password_changed");
  redirect("/admin?password=changed");
}
