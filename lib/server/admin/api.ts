import "server-only";
import type { Permission } from "@/lib/admin/permissions";
import { audit } from "@/lib/server/admin/audit";
import { AdminAccessError, requireAdminAction, type Admin } from "@/lib/server/admin/session";
import { ConfigError } from "@/lib/server/core/env";
import { assertSameOrigin, HttpError, json } from "@/lib/server/core/http";

/** Route-handler wrapper for admin APIs: auth, permission, same-origin for writes, safe errors. */
export async function adminApi(
  request: Request,
  permission: Permission,
  handler: (admin: Admin) => Promise<Response>,
): Promise<Response> {
  try {
    if (request.method !== "GET" && request.method !== "HEAD") assertSameOrigin(request);
    const admin = await requireAdminAction(permission);
    return await handler(admin);
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return json({ error: error.message }, error.kind === "unauthenticated" ? 401 : 403);
    }
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    if (error instanceof ConfigError) {
      console.error(error.message);
      return json({ error: "This feature is not set up yet. Add the missing keys to the server settings." }, 503);
    }
    console.error("Admin API error", error);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}

export { audit };
