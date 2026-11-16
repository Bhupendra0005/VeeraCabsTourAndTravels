import type { Metadata } from "next";
import { PhoneCall } from "lucide-react";
import { PhoneBookingForm } from "@/components/admin/phone-booking-form";
import { Alert, ButtonLink, PageHeader } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { listSearchOptions } from "@/lib/server/bookings/service";
import { getFleet } from "@/lib/server/cms/content";

export const metadata: Metadata = { title: "New phone booking" };

export default async function NewPhoneBookingPage() {
  await requireAdminPage("bookings.manage");
  const [options, fleet] = await Promise.all([
    listSearchOptions().catch((error) => {
      console.error("Phone booking: options failed", error);
      return null;
    }),
    getFleet(),
  ]);
  const cities = options ? [...new Set([...options.cities.from, ...Object.values(options.cities.to).flat()])].sort() : [];

  return (
    <div className="grid max-w-4xl gap-6">
      <PageHeader
        icon={<PhoneCall />}
        title="New phone booking"
        description="Enter a booking taken over a call or WhatsApp. It is confirmed right away, and any cash, UPI or bank money you already collected is recorded."
        actions={
          <ButtonLink href="/admin/bookings" variant="secondary">
            Back to bookings
          </ButtonLink>
        }
      />
      {!options ? <Alert tone="danger">Could not load the city list. You can still type the places by hand.</Alert> : null}
      <PhoneBookingForm cities={cities} vehicles={fleet.map((v) => ({ title: v.title, capacity: v.capacity }))} />
    </div>
  );
}
