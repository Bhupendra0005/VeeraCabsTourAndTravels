import type { Metadata } from "next";
import { CalendarCog } from "lucide-react";
import { BookingSettingsForm } from "@/components/admin/booking-settings-form";
import { PageHeader } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { getBookingSettings } from "@/lib/server/cms/content";

export const metadata: Metadata = { title: "Booking settings" };

export default async function SettingsPage() {
  await requireAdminPage("settings.manage");
  const settings = await getBookingSettings();
  return (
    <div className="grid gap-6">
      <PageHeader
        icon={<CalendarCog />}
        title="Booking settings"
        description="Taxes, advance payment and cancellation rules used by online booking, invoices, emails and the Terms page."
      />
      <BookingSettingsForm initial={settings} />
    </div>
  );
}
