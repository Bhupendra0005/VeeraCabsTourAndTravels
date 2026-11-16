import type { Metadata } from "next";
import {
  Briefcase,
  CalendarDays,
  Car,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  Headset,
  Mail,
  MapPin,
  MapPinned,
  Phone,
  Receipt,
  Star,
  Ticket,
  User,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookingActions } from "@/components/booking/booking-actions";
import { BookingSuccess } from "@/components/booking/booking-success";
import { cabHeading } from "@/lib/booking/fleet";
import { lastRefundMinutes } from "@/lib/booking/refund";
import { BookingBand } from "@/components/booking/booking-band";
import { RateTripForm } from "@/components/booking/rate-trip-form";
import { SectionCard } from "@/components/booking/section-card";
import { Stars } from "@/components/booking/stars";
import { PageShell } from "@/components/site/page-shell";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import {
  TRIP_TYPE_LABEL,
  cancellationOutcome,
  describeMinutes,
  formatDate,
  formatINR,
  msUntilDeparture,
  to12h,
} from "@/lib/booking/config";
import { STATUS_LABEL } from "@/lib/booking/status";
import { photoSrc } from "@/lib/cms/images";
import { whatsappLink } from "@/lib/site";
import { getSession } from "@/lib/server/auth/session";
import { canReview, loadReviewForBooking } from "@/lib/server/bookings/reviews";
import { loadOwnedBooking, loadPayments } from "@/lib/server/bookings/service";
import { amountPaid } from "@/lib/server/bookings/types";
import { getBookingPage, getBookingSettings, getFleet, getSite } from "@/lib/server/cms/content";
import { HttpError } from "@/lib/server/core/http";
import { isUuid } from "@/lib/server/core/validate";
import { ui } from "@/components/ui/styles";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = {
  title: "Your ticket",
  robots: { index: false, follow: false },
};

/** Status pill on the dark header strip. */
const BAND_STATUS: Record<string, string> = {
  confirmed: "bg-emerald-400/25 text-emerald-100 ring-emerald-300/40",
  completed: "bg-sky-400/25 text-sky-100 ring-sky-300/40",
  pending_payment: "bg-amber-300/25 text-amber-100 ring-amber-200/40",
  cancelled: "bg-red-400/25 text-red-100 ring-red-300/40",
  payment_failed: "bg-red-400/25 text-red-100 ring-red-300/40",
};

const PAYMENT_KIND = { advance: "Advance payment", full: "Full payment", balance: "Balance payment" } as const;
const PAYMENT_STATUS: Record<string, string> = {
  paid: "bg-ok/15 text-ok",
  refunded: "bg-sky-500/15 text-sky-700",
  failed: "bg-red-500/15 text-red-600",
  created: "bg-amber-400/20 text-amber-700",
};

const when = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

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
  const [settings, bookingPage, fleet, site, ownReview] = await Promise.all([
    getBookingSettings(),
    getBookingPage(),
    getFleet(),
    getSite(),
    loadReviewForBooking(booking.id).catch(() => null),
  ]);
  const reviewable = bookingPage.enableReviews && !ownReview && canReview(booking);
  const cancel = cancellationOutcome(booking.travel_date, booking.travel_time, settings);
  const vehicle = fleet.find((item) => item.title === booking.vehicle_type);
  const cabName = vehicle ? cabHeading(vehicle.title, vehicle.models ?? "") : { name: booking.vehicle_type, similar: false };

  let payLabel: string | null = null;
  let payNote = "";
  if ((booking.status === "pending_payment" || booking.status === "payment_failed") && msLeft > 0) {
    payLabel = `Complete payment · ${formatINR(booking.advance_due)}`;
  } else if (booking.status === "confirmed" && due > 0) {
    if (msLeft > settings.balanceCutoffHours * 3_600_000) payLabel = `Pay balance · ${formatINR(due)}`;
    else if (msLeft > 0) payNote = `Online balance payment has closed. Please pay ${formatINR(due)} to the driver at the end of the trip.`;
  }

  const canCancelNow = (booking.status === "confirmed" || booking.status === "pending_payment") && cancel.allowed;
  const canDownloadTicket = booking.status === "confirmed" || booking.status === "completed";
  const hasActions = !!payLabel || canCancelNow || canDownloadTicket || paid > 0;
  const hourly = booking.trip_type === "hourly";
  const cancelled = booking.status === "cancelled";
  const hasDriver = !!(booking.driver_name || booking.driver_phone || booking.cab_number);
  // booked -> confirmed -> trip day -> completed
  const stage = booking.status === "completed" ? 3 : booking.status === "confirmed" ? (msLeft <= 0 ? 2 : 1) : 0;
  const steps = ["Booked", "Confirmed", "Trip day", "Completed"];
  const pct = booking.total > 0 ? Math.min(100, Math.round((paid / booking.total) * 100)) : 0;

  const fareRows: { label: string; value: string; tone?: "ok" }[] = [
    { label: "Base fare", value: formatINR(booking.base_fare) },
    ...(booking.addons_total > 0 ? [{ label: booking.addons ? `Special requests (${booking.addons})` : "Special requests", value: formatINR(booking.addons_total) }] : []),
    ...(booking.discount > 0 ? [{ label: `Coupon ${booking.coupon_code}`, value: `-${formatINR(booking.discount)}`, tone: "ok" as const }] : []),
    { label: "GST", value: formatINR(booking.gst) },
    ...(booking.service_fee > 0 ? [{ label: "Service fee", value: formatINR(booking.service_fee) }] : []),
    ...(booking.insurance > 0 ? [{ label: "Trip protection", value: formatINR(booking.insurance) }] : []),
  ];

  const details: { icon: typeof MapPin; label: string; value: string }[] = [
    { icon: MapPin, label: hourly ? "Pickup address" : "Pickup address", value: booking.pickup_address },
    ...(booking.drop_address ? [{ icon: MapPinned, label: "Drop address", value: booking.drop_address }] : []),
    ...(booking.stops ? [{ icon: MapPinned, label: "Stops", value: booking.stops }] : []),
    ...(booking.addons ? [{ icon: Briefcase, label: "Special requests", value: booking.addons }] : []),
    ...(booking.gstin ? [{ icon: Receipt, label: "GST invoice", value: `${booking.gst_company} (${booking.gstin})` }] : []),
  ];

  return (
    <PageShell footer={false}>
      <div className="mmt">
        <BookingBand title="Your ticket">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 text-white">
            <div className="grid gap-3">
              <p className="flex flex-wrap items-center gap-2 text-sm text-white/70">
                <Link href="/bookings" className="text-white/80 no-underline hover:text-white">
                  My trips
                </Link>
                <span aria-hidden="true">/</span> Booking ID
              </p>
              <p className="font-mono text-3xl font-extrabold leading-none tracking-wider sm:text-4xl">{booking.ref}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ring-1", BAND_STATUS[booking.status])}>
                  {STATUS_LABEL[booking.status]}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white/80 ring-1 ring-white/20">
                  {TRIP_TYPE_LABEL[booking.trip_type]}
                </span>
              </div>
            </div>
            <div className="mmt-glass grid min-w-[230px] gap-1 px-5 py-3.5">
              <div className="flex items-baseline justify-between gap-6">
                <span className="text-xs font-semibold uppercase tracking-widest text-white/70">Total fare</span>
                <b className="font-(family-name:--font-display) text-2xl font-extrabold leading-none">{formatINR(booking.total)}</b>
              </div>
              <div className="flex items-baseline justify-between gap-6 text-sm text-white/80">
                <span>Paid</span>
                <b>{formatINR(paid)}</b>
              </div>
              {!cancelled ? (
                <div className="flex items-baseline justify-between gap-6 text-sm text-white/80">
                  <span>Balance</span>
                  <b>{formatINR(due)}</b>
                </div>
              ) : null}
            </div>
          </div>
        </BookingBand>

        <section className="mmt-body">
          <div className="mmt-wrap grid gap-5">
            {justPaid ? (
              <BookingSuccess
                bookingId={booking.id}
                bookingRef={booking.ref}
                email={booking.traveller_email}
                from={booking.from_city}
                to={booking.to_city}
                date={formatDate(booking.travel_date)}
                time={to12h(booking.travel_time)}
                cab={cabName.name}
                cabNote={cabName.similar ? `or similar · ${booking.vehicle_type}` : ""}
                paid={formatINR(paid)}
                total={formatINR(booking.total)}
                balance={due > 0 ? formatINR(due) : null}
                percent={pct}
              />
            ) : null}

            {justPaid ? (
              <div className="mmt-rise relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0f8a4b] to-[#14b86a] p-5 text-white shadow-[0_16px_40px_rgba(15,138,75,0.35)]" role="status">
                <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 size-44 rounded-full bg-white/15 blur-2xl" />
                <div className="relative flex items-start gap-4">
                  <span className="grid size-12 flex-none place-items-center rounded-full bg-white/20 ring-2 ring-white/40">
                    <CheckCircle2 className="size-7" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-(family-name:--font-display) text-xl font-extrabold leading-tight">Payment received. Your booking is confirmed!</p>
                    <p className="mt-1 text-sm text-white/90">
                      We have emailed your ticket and invoice to {booking.traveller_email}. Your driver and cab details will be shared with you before pickup.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {cancelled ? (
              <div className="mmt-rise flex items-start gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-red-900 sm:gap-4 sm:p-5" role="status">
                <span className="grid size-11 flex-none place-items-center rounded-full bg-red-100 text-red-600">
                  <XCircle className="size-6" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-(family-name:--font-display) text-lg font-extrabold leading-tight">This booking was cancelled</p>
                  <p className="mt-1 text-sm sm:whitespace-nowrap">
                    {booking.refund_amount > 0
                      ? `Refund of ${formatINR(booking.refund_amount)} initiated (5-7 days).`
                      : "No refund was issued (late cancellation)."}
                  </p>
                </div>
              </div>
            ) : (
              <ol className="mmt-rise m-0 grid list-none grid-cols-4 gap-1 rounded-2xl border border-line bg-panel p-4 shadow-[0_1px_2px_rgba(0,0,0,0.1)] sm:p-5" aria-label="Booking progress">
                {steps.map((step, index) => {
                  const done = index < stage;
                  const active = index === stage;
                  return (
                    <li key={step} className="relative grid justify-items-center gap-1.5 text-center">
                      {index > 0 ? (
                        <span aria-hidden="true" className={cn("absolute right-1/2 top-[15px] h-0.5 w-full", index <= stage ? "bg-ok" : "bg-line")} />
                      ) : null}
                      <span
                        className={cn(
                          "relative z-10 grid size-[30px] place-items-center rounded-full text-xs font-bold ring-4 ring-white",
                          done && "bg-ok text-white",
                          active && "bg-brand text-white shadow-[0_0_0_5px_rgba(0,150,219,0.2)]",
                          !done && !active && "bg-line text-muted",
                        )}
                      >
                        {done ? <Check className="size-4" aria-hidden="true" /> : index + 1}
                      </span>
                      <span className={cn("text-[12px] font-semibold sm:text-[13px]", active ? "text-(--text)" : done ? "text-ok" : "text-muted")}>{step}</span>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="grid items-start gap-5 min-[900px]:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
              {/* left: the ticket and trip details */}
              <div className="grid gap-5">
                <SectionCard icon={<Ticket aria-hidden="true" />} title="E-ticket">
                  <div className="grid gap-5">
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(86px,1.1fr)_minmax(0,1fr)] items-center gap-2 sm:gap-5">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted">{hourly ? "City" : "From"}</p>
                        <p className="font-(family-name:--font-display) text-[1.45rem] font-extrabold leading-tight [overflow-wrap:anywhere] sm:text-[1.9rem]">{booking.from_city}</p>
                      </div>
                      <div className="flex w-full items-center gap-1.5 text-brand" aria-hidden="true">
                        <span className="size-2.5 flex-none rounded-full border-2 border-brand bg-white" />
                        <span className="h-0 flex-1 border-t-2 border-dashed border-brand/50" />
                        <span className="grid size-8 flex-none place-items-center rounded-full bg-brand text-white shadow-md">
                          <Car className="size-4" />
                        </span>
                        <span className="h-0 flex-1 border-t-2 border-dashed border-brand/50" />
                        <span className="size-2.5 flex-none rounded-full bg-brand" />
                      </div>
                      <div className="min-w-0 text-right">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted">{hourly ? "Package" : "To"}</p>
                        <p className="font-(family-name:--font-display) text-[1.45rem] font-extrabold leading-tight [overflow-wrap:anywhere] sm:text-[1.9rem]">{booking.to_city}</p>
                      </div>
                    </div>

                    <div className="relative -mx-4 sm:-mx-5" aria-hidden="true">
                      <div className="border-t-2 border-dashed border-line" />
                      <span className="absolute -left-3 -top-3 size-6 rounded-full border border-line bg-(--page)" />
                      <span className="absolute -right-3 -top-3 size-6 rounded-full border border-line bg-(--page)" />
                    </div>

                    <ul className={cn("m-0 grid list-none grid-cols-2 gap-3 p-0", booking.return_date ? "sm:grid-cols-4" : "sm:grid-cols-3")}>
                      {[
                        { icon: CalendarDays, label: "Pickup date", value: formatDate(booking.travel_date) },
                        { icon: Clock3, label: "Pickup time", value: to12h(booking.travel_time) },
                        ...(booking.return_date ? [{ icon: CalendarDays, label: "Return date", value: formatDate(booking.return_date) }] : []),
                        {
                          icon: Users,
                          label: "Travellers",
                          value: `${booking.passengers}${booking.bags ? ` · ${booking.bags} ${booking.bags === 1 ? "bag" : "bags"}` : ""}`,
                        },
                      ].map(({ icon: Icon, label, value }) => (
                        <li key={label} className="flex items-center gap-3 rounded-xl bg-(--panel-soft) p-3 last:col-span-2 sm:last:col-span-1">
                          <span className="grid size-9 flex-none place-items-center rounded-full bg-white text-brand shadow-sm">
                            <Icon className="size-[18px]" aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <small className="block text-[11px] font-bold uppercase tracking-wider text-muted">{label}</small>
                            <b className="block text-[15px] leading-tight">{value}</b>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </SectionCard>

                <SectionCard icon={<Car aria-hidden="true" />} title="Cab & traveller" bodyClassName="p-0 sm:p-0">
                  <div className="grid sm:grid-cols-[190px_minmax(0,1fr)]">
                    <div className="relative grid place-items-center bg-[radial-gradient(circle_at_50%_40%,#ffffff_0%,#e6eef8_100%)] p-4">
                      {vehicle ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photoSrc(vehicle, 480)} alt={`${booking.vehicle_type} by Veera Tours & Travels`} width={240} height={126} loading="lazy" decoding="async" style={{ maxWidth: 190 }} className="h-auto w-full object-contain" />
                      ) : null}
                    </div>
                    <div className="grid content-center gap-3 p-4 sm:p-5">
                      <div>
                        <p className="font-(family-name:--font-display) text-xl font-extrabold leading-tight">
                          {cabName.name}
                          {cabName.similar ? <span className="ml-2 text-sm font-medium text-muted">or similar</span> : null}
                        </p>
                        {cabName.similar ? <p className="text-sm font-semibold text-muted">{booking.vehicle_type}</p> : null}
                        {cancelled || booking.status === "completed" || hasDriver ? null : <p className="text-sm text-muted">Your driver and cab number are shared before pickup.</p>}
                      </div>
                      {hasDriver && !cancelled ? (
                        <div className="rounded-xl border border-emerald-300/70 bg-emerald-50 p-3.5 text-emerald-950" aria-label="Driver and cab details">
                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-800">Your driver &amp; cab</p>
                          <ul className="m-0 grid list-none gap-2 p-0 text-sm">
                            {booking.driver_name ? (
                              <li className="flex items-center gap-2.5">
                                <User className="size-4 flex-none text-emerald-700" aria-hidden="true" />
                                <b>{booking.driver_name}</b>
                              </li>
                            ) : null}
                            {booking.driver_phone ? (
                              <li className="flex items-center gap-2.5">
                                <Phone className="size-4 flex-none text-emerald-700" aria-hidden="true" />
                                <a className="font-semibold underline underline-offset-2" href={`tel:+91${booking.driver_phone}`}>+91 {booking.driver_phone}</a>
                              </li>
                            ) : null}
                            {booking.cab_number ? (
                              <li className="flex items-center gap-2.5">
                                <Car className="size-4 flex-none text-emerald-700" aria-hidden="true" />
                                <b className="font-mono tracking-wide">{booking.cab_number}</b>
                                {booking.cab_model ? <span className="text-emerald-900/80">· {booking.cab_model}</span> : null}
                              </li>
                            ) : null}
                          </ul>
                        </div>
                      ) : null}
                      <ul className="m-0 grid list-none gap-2 p-0 text-sm">
                        <li className="flex items-center gap-2.5">
                          <User className="size-4 flex-none text-brand" aria-hidden="true" />
                          <b>{booking.traveller_name}</b>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Phone className="size-4 flex-none text-brand" aria-hidden="true" />
                          +91 {booking.traveller_phone}
                        </li>
                        <li className="flex items-center gap-2.5 [overflow-wrap:anywhere]">
                          <Mail className="size-4 flex-none text-brand" aria-hidden="true" />
                          {booking.traveller_email}
                        </li>
                      </ul>
                    </div>
                  </div>
                </SectionCard>

                {details.length > 0 ? (
                  <SectionCard icon={<MapPinned aria-hidden="true" />} title="Trip details">
                    <ul className="m-0 grid list-none gap-3 p-0">
                      {details.map(({ icon: Icon, label, value }) => (
                        <li key={label} className="flex items-start gap-3 rounded-xl bg-(--panel-soft) p-3.5">
                          <span className="grid size-9 flex-none place-items-center rounded-full bg-white text-brand shadow-sm">
                            <Icon className="size-[18px]" aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <small className="block text-[11px] font-bold uppercase tracking-wider text-muted">{label}</small>
                            <b className="block text-[15px] leading-snug [overflow-wrap:anywhere]">{value}</b>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                ) : null}

                {ownReview ? (
                  <SectionCard icon={<Star aria-hidden="true" />} title="Your review">
                    <p className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                      <span className="inline-flex items-center gap-2">
                        Cab <Stars value={ownReview.cabRating} />
                      </span>
                      <span className="inline-flex items-center gap-2">
                        Driver <Stars value={ownReview.driverRating} />
                      </span>
                    </p>
                    {ownReview.comment ? <div className="mt-3 rounded-xl bg-(--panel-soft) p-3.5 text-sm">{ownReview.comment}</div> : null}
                    {ownReview.tags.length ? (
                      <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
                        {ownReview.tags.map((tag) => (
                          <li key={tag} className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                            {tag}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="mt-3 text-sm text-muted">Thank you for sharing your experience.</div>
                  </SectionCard>
                ) : null}
                {reviewable ? <RateTripForm bookingId={booking.id} vehicle={booking.vehicle_type} tagOptions={bookingPage.reviewTags} /> : null}
              </div>

              {/* right: money, actions, help */}
              <aside className="grid content-start gap-5">
                <SectionCard icon={<Receipt aria-hidden="true" />} title="Payment summary">
                  <dl className="m-0 grid gap-2.5 text-[15px]">
                    {fareRows.map((row) => (
                      <div key={row.label} className="flex items-start justify-between gap-4">
                        <dt className="text-muted [overflow-wrap:anywhere]">{row.label}</dt>
                        <dd className={cn("m-0 font-semibold", row.tone === "ok" && "text-ok")}>{row.value}</dd>
                      </div>
                    ))}
                    <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
                      <dt className="font-bold">Total fare</dt>
                      <dd className="m-0 font-(family-name:--font-display) text-2xl font-extrabold leading-none">{formatINR(booking.total)}</dd>
                    </div>
                  </dl>

                  {!cancelled ? (
                    <div className="mt-4 rounded-xl bg-(--panel-soft) p-4">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-semibold">Paid {formatINR(paid)}</span>
                        <span className={due > 0 ? "font-semibold text-amber-700" : "font-semibold text-ok"}>{due > 0 ? `Balance ${formatINR(due)}` : "Fully paid"}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Amount paid">
                        <span className="block h-full rounded-full bg-gradient-to-r from-[#1ab0ff] to-ok" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-muted">{booking.pay_mode === "full" ? "Full pay selected" : due > 0 ? "Part pay: the rest goes to the driver at the end of the trip or online" : "Part pay selected, balance paid online"}</p>
                    </div>
                  ) : null}
                  {payNote ? <div className="mt-3 rounded-xl bg-amber-50 p-3.5 text-sm text-amber-900">{payNote}</div> : null}

                  {payments.length > 0 ? (
                    <ul className="m-0 mt-4 grid list-none gap-2 p-0 text-sm">
                      {payments.map((payment) => (
                        <li key={payment.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
                          <span className="flex min-w-0 items-center gap-2.5">
                            <CreditCard className="size-4 flex-none text-brand" aria-hidden="true" />
                            <span className="min-w-0">
                              <b className="block leading-tight">{PAYMENT_KIND[payment.kind]}</b>
                              <small className="text-muted">{when.format(new Date(payment.paid_at ?? payment.created_at))}</small>
                            </span>
                          </span>
                          <span className="grid justify-items-end gap-1">
                            <b>{formatINR(payment.amount)}</b>
                            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", PAYMENT_STATUS[payment.status] ?? PAYMENT_STATUS.created)}>{payment.status}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </SectionCard>

                {hasActions ? (
                  <SectionCard icon={<Ticket aria-hidden="true" />} title="Manage booking">
                    <BookingActions
                      bookingId={booking.id}
                      payLabel={payLabel}
                      canCancel={canCancelNow}
                      refundPercent={cancel.allowed ? cancel.refundPercent : 0}
                      paidAmount={paid}
                      cutoffLabel={describeMinutes(lastRefundMinutes(settings.freeCancelMinutes, settings.refundSlabs))}
                      canDownloadTicket={canDownloadTicket}
                      canDownloadInvoice={paid > 0}
                      contact={{ name: booking.traveller_name, email: booking.traveller_email, phone: booking.traveller_phone }}
                    />
                  </SectionCard>
                ) : null}

                <SectionCard icon={<Headset aria-hidden="true" />} title="Need help?">
                  <div className="grid gap-2.5">
                    <a href={site.primaryPhone.href} className="flex items-center gap-3 rounded-xl border border-line bg-(--panel-soft) px-4 py-3 text-sm font-semibold text-(--text)! no-underline transition hover:border-brand">
                      <Phone className="size-4 text-brand" aria-hidden="true" />
                      {site.primaryPhone.display}
                    </a>
                    <a
                      href={whatsappLink(`Hi Veera Tours & Travels, I need help with booking ${booking.ref}.`, site)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-line bg-(--panel-soft) px-4 py-3 text-sm font-semibold text-(--text)! no-underline transition hover:border-emerald-500"
                    >
                      <WhatsAppIcon className="size-5 shrink-0 text-emerald-600" aria-hidden="true" />
                      Chat on WhatsApp
                    </a>
                  </div>
                  <div className={cn(ui.muted, "mt-3.5 text-xs")}>
                    Read our <Link href="/cancellation-policy">cancellation policy</Link> and <Link href="/terms">terms</Link>.
                  </div>
                </SectionCard>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
