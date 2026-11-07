import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/lib/server/core/db";
import { requireEnv } from "@/lib/server/core/env";

export async function requestIpHash(): Promise<string | undefined> {
  const forwarded = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!forwarded) return undefined;
  return createHmac("sha256", requireEnv("SESSION_SECRET")).update(`ip:${forwarded}`).digest("hex").slice(0, 32);
}

/** Records who did what. Failing to write the log must never break the action itself. */
export async function audit(
  actor: { id: string | null; email: string },
  action: string,
  details: { entity?: string; entityId?: string; meta?: Record<string, unknown> } = {},
) {
  try {
    await db().from("admin_audit_log").insert({
      admin_id: actor.id,
      admin_email: actor.email,
      action,
      entity: details.entity ?? null,
      entity_id: details.entityId ?? null,
      meta: details.meta ?? null,
      ip_hash: (await requestIpHash()) ?? null,
    });
  } catch (error) {
    console.error("Audit log write failed", action, error);
  }
}
