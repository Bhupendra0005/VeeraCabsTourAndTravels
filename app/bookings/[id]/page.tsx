import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookingActions } from "@/components/booking/booking-actions";
import { PageShell } from "@/components/site/page-shell";
import { PageHero } from "@/components/site/page-parts";
import {
  TRIP_TYPE_LABEL,
  describeMinutes,
  cancellationOutcome,
  msUntilDeparture,
  formatDate,
  formatINR,
  to12h,
} from "@/lib/booking/config";
import { STATUS_CLASS, STATUS_LABEL } from "@/lib/booking/status";
import { loadOwnedBooking, loadPayments } from "@/lib/server/bookings/service";
import { getBookingSettings } from "@/lib/server/cms/content";
import { HttpError } from "@/lib/server/core/http";
import { getSession } from "@/lib/server/auth/session";
import { amountPaid } from "@/lib/server/bookings/types";
import { isUuid } from "@/lib/server/core/validate";
import { ui } from "@/components/ui/styles";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = {
  title: "Booking details",
  robots: { index: false, follow: false },
};

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/bookings/${id}`)}`);

  let booking;
  let payments;
  try {
    booking = await loadOwnedBooking(id, session.customerId);
    payments = await loadPayments(booking.id);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }

  const justPaid = (await searchParams).paid === "1" && booking.status === "confirmed";
  const paid = amountPaid(payments);
  const due = Math.max(0, booking.total - paid);
  const msLeft = msUntilDeparture(booking.travel_date, booking.travel_time);
  const settings = await getBookingSettings();
  const cancel = cancellationOutcome(booking.travel_date, booking.travel_time, settings.freeCancelMinutes);

  let payLabel: string | null = null;
  let payNote = "";
  if ((booking.status === "pending_payment" || booking.status === "payment_failed") && msLeft > 0) {
    payLabel = `Complete payment · ${formatINR(booking.advance_due)}`;
  } else if (booking.status === "confirmed" && due > 0) {
    if (msLeft > settings.balanceCutoffHours * 3_600_000) payLabel = `Pay balance · ${formatINR(due)}`;
    else if (msLeft > 0) payNote = `Online balance payment has closed. Please pay ${formatINR(due)} to the driver at the end of the trip.`;
  }

  const rows: [string, string][] = [
    ["Route", `${booking.from_city} to ${booking.to_city}`],
    ["Trip type", TRIP_TYPE_LABEL[booking.trip_type]],
    ["Pickup", `${formatDate(booking.travel_date)}, ${to12h(booking.travel_time)}`],
    ...(booking.return_date ? ([["Return date", formatDate(booking.return_date)]] as [string, string][]) : []),
    ["Pickup address", booking.pickup_address],
    ...(booking.drop_address ? ([["Drop address", booking.drop_address]] as [string, string][]) : []),
    ["Vehicle", booking.vehicle_type],
    ["Passengers", String(booking.passengers)],
    ["Traveller", `${booking.traveller_name} · +91 ${booking.traveller_phone}`],
    ["Email", booking.traveller_email],
  ];

  return (
    <PageShell>
      <PageHero
        eyebrow={`Booking ${booking.ref}`}
        title={
          <>
            Your <em>ticket.</em>
          </>
        }
        crumbs={[{ label: "Home", href: "/" }, { label: "My bookings", href: "/bookings" }, { label: booking.ref }]}
      />

      <section className="section">
        <div className={cn("shell", ui.container)}>
          {justPaid ? (
            <div className={cn(ui.card, ui.success)} role="status">
              <CheckCircle2 aria-hidden="true" />
              <div>
                <b>Payment received. Your booking is confirmed.</b>
                <p className={ui.muted}>We have emailed your ticket and invoice to {booking.traveller_email}.</p>
              </div>
            </div>
          ) : null}

          <article className={cn(ui.card, ui.ticket)}>
            <header>
              <div>
                <span className={ui.muted}>Booking ID</span>
                <h2>{booking.ref}</h2>
              </div>
              <span className={cn(ui.status, STATUS_CLASS[booking.status])}>{STATUS_LABEL[booking.status]}</span>
            </header>

            <dl className={ui.details}>
              {rows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>

            <dl className={cn(ui.details, ui.detailsPay)}>
              <div>
                <dt>Total fare</dt>
                <dd>{formatINR(booking.total)}</dd>
              </div>
              <div>
                <dt>Paid online</dt>
                <dd>{formatINR(paid)}</dd>
              </div>
              {booking.status === "cancelled" ? (
                <div>
                  <dt>Refund</dt>
                  <dd>{booking.refund_amount > 0 ? formatINR(booking.refund_amount) : "No refund (late cancellation)"}</dd>
                </div>
              ) : (
                <div>
                  <dt>Balance</dt>
                  <dd>{formatINR(due)}</dd>
                </div>
              )}
            </dl>
            {payNote ? <p className={ui.muted}>{payNote}</p> : null}

            <BookingActions
              bookingId={booking.id}
              payLabel={payLabel}
              canCancel={(booking.status === "confirmed" || booking.status === "pending_payment") && cancel.allowed}
              refundable={cancel.allowed && cancel.refundable}
              paidAmount={paid}
              cutoffLabel={describeMinutes(settings.freeCancelMinutes)}
              canDownloadTicket={booking.status === "confirmed" || booking.status === "completed"}
              canDownloadInvoice={paid > 0}
              contact={{ name: booking.traveller_name, email: booking.traveller_email, phone: booking.traveller_phone }}
            />
          </article>

          <p className={ui.muted}>
            Need help? <Link href="/contact">Contact us</Link>. Read our{" "}
            <Link href="/cancellation-policy">cancellation policy</Link> and <Link href="/terms">terms</Link>.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
