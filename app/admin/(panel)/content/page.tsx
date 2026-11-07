import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { DOCS } from "@/lib/cms/docs";
import { requireAdminPage } from "@/lib/server/admin/guard";

export const metadata: Metadata = { title: "Website content" };

export default async function ContentIndexPage() {
  await requireAdminPage("content.manage");
  return (
    <div className="grid gap-6">
      <PageHeader title="Website content" description="Everything visitors read on your website. Pick a section to edit it." />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {DOCS.map((doc) => (
          <li key={doc.key}>
            <Link
              href={`/admin/content/${doc.key}`}
              className="block h-full rounded-2xl border border-line bg-panel p-5 transition hover:-translate-y-0.5 hover:border-brand"
            >
              <h2 className="font-(family-name:--font-display) text-lg font-bold">{doc.label}</h2>
              <p className="mt-1.5 text-sm text-muted [overflow-wrap:anywhere]">{doc.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
