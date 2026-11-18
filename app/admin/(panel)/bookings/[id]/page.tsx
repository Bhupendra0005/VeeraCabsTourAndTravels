import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Download, FileText, Mail, MapPin, Phone, Receipt, Ticket, Wallet } from "lucide-react";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { notFound } from "next/navigation";
import { BookingAdminActions } from "@/components/admin/booking-admin-actions";
import { StatusBadge, money } from "@/components/admin/booking-bits";
import { Alert, Badge, ButtonLink, Card, DefinitionList, PageHeader } from "@/components/admin/ui";
import { TRIP_TYPE_LABEL, cancellationOutcome, formatDate, to12h } from "@/lib/booking/config";
import { getBookingSettings } from "@/lib/server/cms/content";
import { can } from "@/lib/admin/permissions";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { getBookingWithPayments, listActiveDrivers } from "@/lib/server/admin/queries";
import { amountPaid } from "@/lib/server/bookings/types";
import { isUuid } from "@/lib/server/core/validate";

export const metadata: Metadata = { title: "Booking" };

const stamp = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "-";

export default async function AdminBookingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdminPage("bookings.view");
  const { id } = await params;
  const flags = await searchParams;
  if (!isUuid(id)) notFound();
  const found = await getBookingWithPayments(id);
  if (!found) notFound();
  const { booking: b, payments } = found;
  const paid = amountPaid(payments);
  const drivers = await listActiveDrivers().catch(() => []);
  const settings = await getBookingSettings();

  const balance = b.status === "cancelled" ? 0 : Math.max(0, b.total - paid);
  const phoneDigits = b.traveller_phone.replace(/\D/g, "");
  const summary: { label: string; value: string; icon: ReactNode; tone?: string }[] = [
    { label: "Pickup", value: `${formatDate(b.travel_date)}, ${to12h(b.travel_time)}`, icon: <CalendarDays /> },
    { label: "Total fare", value: money(b.total), icon: <Receipt /> },
    { label: "Paid", value: money(paid), icon: <Wallet />, tone: paid > 0 ? "text-emerald-300" : undefined },
    { label: "Balance due", value: b.status === "cancelled" ? "-" : money(balance), icon: <Wallet />, tone: balance > 0 ? "text-amber-300" : undefined },
  ];
  const moneyRows: [string, string, string?][] = [
    ["Base fare", money(b.base_fare)],
    ...(b.addons_total > 0 ? ([["Special requests", `${money(b.addons_total)}${b.addons ? ` (${b.addons})` : ""}`]] as [string, string][]) : []),
    ...(b.discount > 0 ? ([["Coupon discount", `-${money(b.discount)}${b.coupon_code ? ` (${b.coupon_code})` : ""}`, "text-emerald-300"]] as [string, string, string][]) : []),
    ["GST", money(b.gst)],
    ...(b.service_fee > 0 ? ([["Service fee", money(b.service_fee)]] as [string, string][]) : []),
    ["Trip protection", money(b.insurance)],
  ];

  return (
    <div className="grid gap-6">
      <Link
        href="/admin/bookings"
        className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3.5 py-2 text-sm font-semibold text-muted transition hover:border-brand-bright/40 hover:text-white"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Back to bookings
      </Link>

      <PageHeader
        icon={<Ticket />}
        title={`Booking ${b.ref}`}
        description={`${b.from_city} to ${b.to_city} · created ${stamp(b.created_at)}`}
        actions={
          <>
            <span className="flex items-center gap-2 pr-1">
              {b.source === "phone" ? <Badge tone="info">phone booking</Badge> : null}
              <StatusBadge status={b.status} />
            </span>
            {b.status === "confirmed" || b.status === "completed" ? (
              <ButtonLink href={`/admin/bookings/${b.id}/ticket`} variant="secondary" prefetch={false}>
                <Download aria-hidden="true" /> Ticket PDF
              </ButtonLink>
            ) : null}
            {paid > 0 ? (
              <ButtonLink href={`/admin/bookings/${b.id}/invoice`} variant="secondary" prefetch={false}>
                <FileText aria-hidden="true" /> Invoice PDF
              </ButtonLink>
            ) : null}
          </>
        }
      />

      {flags.created ? (
        <Alert tone="success">
          Phone booking created{flags.emailed ? " and the ticket was emailed to the customer" : ""}. Assign the driver and cab below.
        </Alert>
      ) : null}

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((s) => (
          <li key={s.label} className="flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-panel p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand-bright ring-1 ring-brand-bright/20 [&>svg]:size-5">{s.icon}</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{s.label}</p>
              <p className={`wrap-break-word text-base font-bold sm:text-lg ${s.tone ?? ""}`}>{s.value}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="grid gap-6">
          <Card title="Trip" description={TRIP_TYPE_LABEL[b.trip_type]}>
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-line bg-white/[0.03] p-4">
              <MapPin className="size-5 shrink-0 text-brand-bright" aria-hidden="true" />
              <span className="min-w-0 flex-1 wrap-break-word font-bold">{b.from_city}</span>
              <ArrowRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
              <span className="min-w-0 flex-1 wrap-break-word text-right font-bold">{b.to_city}</span>
            </div>
            <DefinitionList
              items={[
                ["Pickup", `${formatDate(b.travel_date)}, ${to12h(b.travel_time)}`],
                ["Return date", b.return_date ? formatDate(b.return_date) : "-"],
                ["Pickup address", b.pickup_address],
                ["Drop address", b.drop_address || "-"],
                ["Vehicle", b.vehicle_type],
                ["Passengers", String(b.passengers)],
                ["Bags", String(b.bags)],
                ...(b.stops ? ([["Stops", b.stops]] as [string, string][]) : []),
              ]}
            />
          </Card>

          <Card
            title="Traveller"
            actions={
              <>
                <ButtonLink href={`tel:+91${phoneDigits}`} variant="secondary" size="sm">
                  <Phone aria-hidden="true" /> Call
                </ButtonLink>
                <ButtonLink href={`https://wa.me/91${phoneDigits}`} variant="secondary" size="sm" target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon aria-hidden="true" className="text-emerald-400" /> WhatsApp
                </ButtonLink>
                <ButtonLink href={`mailto:${b.traveller_email}`} variant="secondary" size="sm">
                  <Mail aria-hidden="true" /> Email
                </ButtonLink>
              </>
            }
          >
            <DefinitionList
              items={[
                ["Name", b.traveller_name],
                ["Mobile", `+91 ${b.traveller_phone}`],
                ["Email", b.traveller_email],
                ...(b.gstin ? ([["GST invoice", `${b.gst_company} (${b.gstin})`]] as [string, string][]) : []),
                ["Invoice no.", b.invoice_no],
              ]}
            />
          </Card>

          <Card title="Money" description={`${b.pay_mode === "full" ? "Full pay" : "Part pay"}${b.refund_amount > 0 ? ` · refunded ${money(b.refund_amount)}` : ""}`}>
            <dl className="grid gap-2.5 text-sm">
              {moneyRows.map(([label, value, tone]) => (
                <div key={label} className="flex items-baseline justify-between gap-4">
                  <dt className="text-muted">{label}</dt>
                  <dd className={`text-right font-semibold wrap-break-word ${tone ?? ""}`}>{value}</dd>
                </div>
              ))}
              <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-line pt-3 text-base">
                <dt className="font-bold">Total</dt>
                <dd className="font-bold">{money(b.total)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted">Paid</dt>
                <dd className="font-semibold text-emerald-300">{money(paid)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted">Balance</dt>
                <dd className={`font-semibold ${balance > 0 ? "text-amber-300" : ""}`}>{b.status === "cancelled" ? "-" : money(balance)}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Payments">
            {payments.length === 0 ? (
              <p className="text-sm text-muted">No payment attempts yet.</p>
            ) : (
              <ul className="grid gap-3">
                {payments.map((p) => (
                  <li key={p.id} className="grid gap-2 rounded-xl border border-line bg-white/3 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-2.5">
                        <span className="font-semibold capitalize">{p.kind}</span>
                        <Badge tone={p.status === "paid" ? "success" : p.status === "refunded" ? "info" : p.status === "failed" ? "danger" : "warning"}>{p.status}</Badge>
                      </span>
                      <span className="text-lg font-bold">{money(p.amount)}</span>
                    </div>
                    <dl className="grid gap-1 text-[13px]">
                      <div className="flex flex-wrap gap-x-3">
                        <dt className="w-16 shrink-0 text-muted">Reference</dt>
                        <dd className="min-w-0 flex-1 break-all font-mono text-xs leading-5">
                          {p.razorpay_order_id.startsWith("offline_") ? `Collected by hand (${p.razorpay_order_id.split("_")[1]})` : (p.razorpay_payment_id ?? p.razorpay_order_id)}
                        </dd>
                      </div>
                      <div className="flex flex-wrap gap-x-3">
                        <dt className="w-16 shrink-0 text-muted">When</dt>
                        <dd className="min-w-0 flex-1">{stamp(p.paid_at ?? p.created_at)}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {can(admin.role, "bookings.manage") ? (
          <BookingAdminActions bookingId={b.id} bookingRef={b.ref} canDelete={can(admin.role, "bookings.delete")} hasPaidMoney={payments.some((p) => p.status === "paid")} status={b.status} note={b.admin_note ?? ""} hasPayments={paid > 0} driver={{ id: b.driver_id ?? "", name: b.driver_name, phone: b.driver_phone, cab: b.cab_number, model: b.cab_model }} drivers={drivers.map((d) => ({ id: d.id, name: d.name, phone: d.phone, cab: d.cab_number, model: d.cab_model }))} due={Math.max(0, b.total - paid)} policyPercent={(() => { const o = cancellationOutcome(b.travel_date, b.travel_time, settings); return o.allowed ? o.refundPercent : 0; })()} />
        ) : null}
      </div>
    </div>
  );
}
