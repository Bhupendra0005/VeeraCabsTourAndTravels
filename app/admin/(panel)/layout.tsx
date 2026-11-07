import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { ADMIN_NAV } from "@/lib/admin/nav";
import { can } from "@/lib/admin/permissions";
import { logoutAction } from "@/lib/server/admin/actions/auth";
import { getAdmin } from "@/lib/server/admin/session";

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  // Only show what this role may open. While a password change is forced, nothing else is reachable.
  const nav = ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      admin.mustChangePassword ? item.href === "/admin/account" : !item.permission || can(admin.role, item.permission),
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <AdminShell nav={nav} user={{ name: admin.name, email: admin.email, role: admin.role }} logoutAction={logoutAction}>
      {children}
    </AdminShell>
  );
}
