import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { can, type AdminRole, type Permission } from "@/lib/admin/permissions";
import { db } from "@/lib/server/core/db";
import { isProd, requireEnv } from "@/lib/server/core/env";

// Separate cookie and signing key from the customer session: a customer cookie can never be an admin cookie.
const COOKIE = isProd ? "__Host-vt_admin" : "vt_admin";
const TTL_SECONDS = 60 * 60 * 8;

export type Admin = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  mustChangePassword: boolean;
};

function key(): string {
  const secret = requireEnv("SESSION_SECRET");
  if (secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
  return createHmac("sha256", secret).update("admin-session-v1").digest("hex");
}

function sign(data: string): string {
  return createHmac("sha256", key()).update(data).digest("base64url");
}

export async function createAdminSession(adminId: string, sessionVersion: number) {
  const payload = Buffer.from(
    JSON.stringify({ sub: adminId, sv: sessionVersion, exp: Math.floor(Date.now() / 1000) + TTL_SECONDS }),
  ).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function destroyAdminSession() {
  (await cookies()).delete(COOKIE);
}

/** The signed-in admin, re-checked against the database on every request (so disabling an account takes effect at once). */
export const getAdmin = cache(async (): Promise<Admin | null> => {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  let data: { sub?: string; sv?: number; exp?: number };
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!data.sub || typeof data.sv !== "number" || !data.exp || data.exp < Date.now() / 1000) return null;

  const { data: row, error } = await db()
    .from("admin_users")
    .select("id, email, name, role, active, must_change_password, session_version")
    .eq("id", data.sub)
    .maybeSingle();
  if (error || !row || !row.active || row.session_version !== data.sv) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as AdminRole,
    mustChangePassword: row.must_change_password,
  };
});

export class AdminAccessError extends Error {
  constructor(
    public readonly kind: "unauthenticated" | "forbidden",
  ) {
    super(kind === "unauthenticated" ? "Please sign in again." : "You do not have permission to do this.");
  }
}

/** For server actions and route handlers: throws instead of redirecting. */
export async function requireAdminAction(permission?: Permission): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) throw new AdminAccessError("unauthenticated");
  if (admin.mustChangePassword) throw new AdminAccessError("forbidden");
  if (permission && !can(admin.role, permission)) throw new AdminAccessError("forbidden");
  return admin;
}
