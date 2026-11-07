import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/server/admin/guard";

export default async function PagesIndex() {
  await requireAdminPage("content.manage");
  redirect("/admin/pages/home");
}
