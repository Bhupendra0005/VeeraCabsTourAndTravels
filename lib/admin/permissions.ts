/** Admin roles and what each may do. Shared by the UI (to hide links) and the server (the real check). */

export type AdminRole = "owner" | "staff";

export type Permission =
  | "bookings.view"
  | "bookings.manage"
  | "payments.view"
  | "customers.view"
  | "routes.manage"
  | "content.manage"
  | "media.manage"
  | "settings.manage"
  | "team.manage"
  | "audit.view";

const STAFF: Permission[] = [
  "bookings.view",
  "bookings.manage",
  "payments.view",
  "customers.view",
  "routes.manage",
  "content.manage",
  "media.manage",
];

const OWNER: Permission[] = [...STAFF, "settings.manage", "team.manage", "audit.view"];

export const ROLE_LABEL: Record<AdminRole, string> = { owner: "Owner", staff: "Staff" };

export function can(role: AdminRole, permission: Permission): boolean {
  return (role === "owner" ? OWNER : STAFF).includes(permission);
}
