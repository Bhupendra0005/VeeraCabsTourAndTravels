import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { ActionState } from "@/lib/admin/action-state";
import type { Permission } from "@/lib/admin/permissions";
import { AdminAccessError, requireAdminAction, type Admin } from "@/lib/server/admin/session";
import { HttpError } from "@/lib/server/core/http";

/** A problem to show to the admin as-is (validation, "not found", business rule). */
export class ActionError extends Error {}

/**
 * Wraps every admin server action: re-checks the session and permission on the server (never trust the
 * page that rendered the button), and turns failures into a message instead of a crash.
 */
export async function run(
  permission: Permission | undefined,
  task: (admin: Admin) => Promise<ActionState>,
): Promise<ActionState> {
  try {
    const admin = await requireAdminAction(permission);
    return await task(admin);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof AdminAccessError || error instanceof ActionError || error instanceof HttpError) {
      return { ok: false, error: error.message };
    }
    console.error("Admin action failed", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function idOrThrow(value: unknown): string {
  if (typeof value !== "string" || !UUID.test(value)) throw new ActionError("Invalid request.");
  return value.toLowerCase();
}
