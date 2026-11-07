import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { DocumentEditor } from "@/components/admin/document-editor";
import { ButtonLink, PageHeader } from "@/components/admin/ui";
import { getDocDefinition } from "@/lib/cms/docs";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { resetDocAction, saveDocAction } from "@/lib/server/admin/actions/content";
import { DEFAULTS } from "@/lib/server/cms/defaults";
import { readDoc, readRaw } from "@/lib/server/cms/store";

export const metadata: Metadata = { title: "Edit content" };

export default async function EditContentPage({ params }: { params: Promise<{ doc: string }> }) {
  await requireAdminPage("content.manage");
  const { doc: key } = await params;
  const definition = getDocDefinition(key);
  if (!definition) notFound();

  const defaults = DEFAULTS[key] as Record<string, unknown>;
  const [value, stored] = await Promise.all([readDoc(key, defaults), readRaw(key).catch(() => null)]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title={definition.label}
        description={definition.description}
        actions={
          definition.viewPath ? (
            <ButtonLink href={definition.viewPath} target="_blank" variant="secondary">
              <ExternalLink aria-hidden="true" /> View on website
            </ButtonLink>
          ) : null
        }
      />
      <DocumentEditor
        docKey={key}
        fields={definition.fields}
        initial={value}
        customised={stored !== null}
        save={saveDocAction}
        reset={resetDocAction}
      />
    </div>
  );
}
