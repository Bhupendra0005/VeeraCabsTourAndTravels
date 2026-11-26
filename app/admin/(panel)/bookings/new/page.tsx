import type { Metadata } from "next";
import { PhoneCall } from "lucide-react";
import { PhoneBookingForm } from "@/components/admin/phone-booking-form";
import { Alert, ButtonLink, PageHeader } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { isUuid } from "@/lib/server/core/validate";
import { getQuotation } from "@/lib/server/quotations";
import { listSearchOptions } from "@/lib/server/bookings/service";
import { getBookingSettings, getFleet } from "@/lib/server/cms/content";

export const metadata: Metadata = { title: "New phone booking" };

export default async function NewPhoneBookingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage("bookings.manage");
  // "Convert to booking" on a quotation: the form starts with its trip, customer and agreed price
  const quoteId = (await searchParams).quote;
  const quote =
    typeof quoteId === "string" && isUuid(quoteId)
      ? await getQuotation(quoteId).catch((error) => {
          console.error("Phone booking: quotation failed", error);
          return null;
        })
      : null;
  const [options, fleet, settings] = await Promise.all([
    listSearchOptions().catch((error) => {
      console.error("Phone booking: options failed", error);
      return null;
    }),
    getFleet(),
    getBookingSettings(),
  ]);
  const cities = options ? [...new Set([...options.cities.from, ...Object.values(options.cities.to).flat()])].sort() : [];

  return (
    <div className="grid max-w-6xl gap-6">
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
      {quote?.booking_id ? (
        <Alert tone="warning">
          Quotation {quote.quote_no} is already a booking.{" "}
          <a href={`/admin/bookings/${quote.booking_id}`} className="font-bold underline">
            Open that booking
          </a>
        </Alert>
      ) : quote ? (
        <Alert tone="info">
          Converting quotation {quote.quote_no}. Check the details, add the pickup address and any money received, then create the booking.
        </Alert>
      ) : null}
      {!options ? <Alert tone="danger">Could not load the city list. You can still type the places by hand.</Alert> : null}
      {quote?.booking_id ? null : (
        <PhoneBookingForm
          cities={cities}
          vehicles={fleet.map((v) => ({ title: v.title, capacity: v.capacity }))}
          gstPercent={settings.gstPercent}
          initial={
            quote
              ? {
                  quoteId: quote.id,
                  tripType: quote.trip_type,
                  vehicle: fleet.some((v) => v.title === quote.vehicle_type) ? quote.vehicle_type : "",
                  from: quote.from_city,
                  to: quote.to_city,
                  date: quote.travel_date,
                  time: quote.travel_time,
                  returnDate: quote.return_date ?? "",
                  passengers: String(quote.passengers),
                  pickupAddress: quote.pickup_address,
                  name: quote.customer_name,
                  phone: quote.customer_phone,
                  email: quote.customer_email,
                  fare: String((quote.subtotal - quote.discount) / 100),
                  note: `From quotation ${quote.quote_no}.`,
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
