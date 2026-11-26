import type { Metadata } from "next";
import { FilePlus2 } from "lucide-react";
import { QuotationForm } from "@/components/admin/quotation-form";
import { ButtonLink, PageHeader } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { listSearchOptions } from "@/lib/server/bookings/service";
import { getBookingSettings, getFleet } from "@/lib/server/cms/content";

export const metadata: Metadata = { title: "New quotation" };

export default async function NewQuotationPage() {
  await requireAdminPage("bookings.manage");
  const [options, fleet, settings] = await Promise.all([
    listSearchOptions().catch((error) => {
      console.error("Quotation: options failed", error);
      return null;
    }),
    getFleet(),
    getBookingSettings(),
  ]);
  const cities = options ? [...new Set([...options.cities.from, ...Object.values(options.cities.to).flat()])].sort() : [];

  return (
    <div className="grid max-w-6xl gap-6">
      <PageHeader
        icon={<FilePlus2 />}
        title="New quotation"
        description="A price for a trip that is not final yet. Download it as a PDF and send it to the customer."
        actions={
          <ButtonLink href="/admin/invoices/quotations" variant="secondary">
            Back to quotations
          </ButtonLink>
        }
      />
      <QuotationForm cities={cities} vehicles={fleet.map((v) => ({ title: v.title, capacity: v.capacity }))} gstPercent={settings.gstPercent} />
    </div>
  );
}
