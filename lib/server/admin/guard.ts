import "server-only";
import { redirect } from "next/navigation";
import { can, type Permission } from "@/lib/admin/permissions";
import { getAdmin, type Admin } from "@/lib/server/admin/session";

/** For admin pages: sends anonymous visitors to the login page, and forces a password change when required. */
export async function requireAdminPage(permission?: Permission): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.mustChangePassword) redirect("/admin/account?force=1");
  if (permission && !can(admin.role, permission)) redirect("/admin?denied=1");
  return admin;
}
