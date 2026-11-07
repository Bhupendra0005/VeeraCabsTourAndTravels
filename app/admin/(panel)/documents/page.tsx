import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { DocumentDesigner } from "@/components/admin/document-designer";
import { PageHeader } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { getDocumentLayout } from "@/lib/server/cms/content";
import { readRaw } from "@/lib/server/cms/store";
import { DOCUMENT_LAYOUT_KEY } from "@/lib/booking/document-layout";

export const metadata: Metadata = { title: "Invoice & ticket" };

export default async function DocumentsPage() {
  await requireAdminPage("settings.manage");
  const [layout, stored] = await Promise.all([getDocumentLayout(), readRaw(DOCUMENT_LAYOUT_KEY).catch(() => null)]);

  return (
    <div className="grid gap-6">
      <PageHeader
        icon={<FileText />}
        title="Invoice & Ticket"
        description="Design the PDF invoice and e-ticket your customers receive: colours, logo, wording and what is shown."
      />
      <DocumentDesigner initial={layout} customised={stored !== null} />
    </div>
  );
}
