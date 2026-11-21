import type { Metadata } from "next";
import { FilePlus2 } from "lucide-react";
import { ManualInvoiceForm } from "@/components/admin/manual-invoice-form";
import { ButtonLink, PageHeader } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { getBookingSettings } from "@/lib/server/cms/content";

export const metadata: Metadata = { title: "New invoice" };

export default async function NewManualInvoicePage() {
  await requireAdminPage("bookings.manage");
  const settings = await getBookingSettings();

  return (
    <div className="grid max-w-6xl gap-6">
      <PageHeader
        icon={<FilePlus2 />}
        title="New invoice"
        description="Make an invoice by hand, for a trip paid outside the website, a company bill or a tour package. It uses the same design and number series as booking invoices."
        actions={
          <ButtonLink href="/admin/invoices" variant="secondary">
            Back to invoices
          </ButtonLink>
        }
      />
      <ManualInvoiceForm defaultGst={settings.gstPercent} />
    </div>
  );
}
