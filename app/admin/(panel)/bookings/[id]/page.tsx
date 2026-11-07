import type { Metadata } from "next";
import { Download, FileText } from "lucide-react";
import { notFound } from "next/navigation";
import { BookingAdminActions } from "@/components/admin/booking-admin-actions";
import { StatusBadge, money } from "@/components/admin/booking-bits";
import { Badge, ButtonLink, Card, DataTable, DefinitionList, PageHeader } from "@/components/admin/ui";
import { TRIP_TYPE_LABEL, formatDate, to12h } from "@/lib/booking/config";
import { can } from "@/lib/admin/permissions";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { getBookingWithPayments } from "@/lib/server/admin/queries";
import { amountPaid } from "@/lib/server/bookings/types";
import { isUuid } from "@/lib/server/core/validate";

export const metadata: Metadata = { title: "Booking" };

const stamp = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "-";

export default async function AdminBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPage("bookings.view");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const found = await getBookingWithPayments(id);
  if (!found) notFound();
  const { booking: b, payments } = found;
  const paid = amountPaid(payments);

  return (
    <div className="grid gap-6">
      <PageHeader
        title={`Booking ${b.ref}`}
        description={`${b.from_city} to ${b.to_city} · created ${stamp(b.created_at)}`}
        actions={
          <>
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

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="grid gap-6">
          <Card title="Trip" actions={<StatusBadge status={b.status} />}>
            <DefinitionList
              items={[
                ["Route", `${b.from_city} to ${b.to_city}`],
                ["Trip type", TRIP_TYPE_LABEL[b.trip_type]],
                ["Pickup", `${formatDate(b.travel_date)}, ${to12h(b.travel_time)}`],
                ["Return date", b.return_date ? formatDate(b.return_date) : "-"],
                ["Pickup address", b.pickup_address],
                ["Drop address", b.drop_address || "-"],
                ["Vehicle", b.vehicle_type],
                ["Passengers", String(b.passengers)],
              ]}
            />
          </Card>

          <Card title="Traveller">
            <DefinitionList
              items={[
                ["Name", b.traveller_name],
                ["Mobile", `+91 ${b.traveller_phone}`],
                ["Email", b.traveller_email],
                ["Invoice no.", b.invoice_no],
              ]}
            />
          </Card>

          <Card title="Money">
            <DefinitionList
              items={[
                ["Base fare", money(b.base_fare)],
                ["GST", money(b.gst)],
                ["Trip protection", money(b.insurance)],
                ["Total", money(b.total)],
                ["Paid", money(paid)],
                ["Balance", b.status === "cancelled" ? "-" : money(Math.max(0, b.total - paid))],
                ["Payment option", b.pay_mode === "full" ? "Full pay" : "Part pay"],
                ["Refunded", b.refund_amount > 0 ? money(b.refund_amount) : "-"],
              ]}
            />
          </Card>

          <Card title="Payments">
            {payments.length === 0 ? (
              <p className="text-sm text-muted">No payment attempts yet.</p>
            ) : (
              <DataTable
                rows={payments}
                rowKey={(p) => p.id}
                columns={[
                  { header: "Type", primary: true, cell: (p) => <span className="capitalize">{p.kind}</span> },
                  { header: "Amount", cell: (p) => money(p.amount) },
                  { header: "Status", cell: (p) => <Badge tone={p.status === "paid" ? "success" : p.status === "refunded" ? "info" : p.status === "failed" ? "danger" : "warning"}>{p.status}</Badge> },
                  { header: "Razorpay payment", cell: (p) => p.razorpay_payment_id ?? p.razorpay_order_id },
                  { header: "When", cell: (p) => stamp(p.paid_at ?? p.created_at) },
                ]}
              />
            )}
          </Card>
        </div>

        {can(admin.role, "bookings.manage") ? (
          <BookingAdminActions bookingId={b.id} status={b.status} note={b.admin_note ?? ""} hasPayments={paid > 0} />
        ) : null}
      </div>
    </div>
  );
}
