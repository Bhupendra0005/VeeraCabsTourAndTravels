import type { Metadata } from "next";
import { CheckCircle2, Clock3, CreditCard, Layers, RotateCcw, SlidersHorizontal, Tag, Wallet } from "lucide-react";
import Link from "next/link";
import { money } from "@/components/admin/booking-bits";
import { DetailModal } from "@/components/admin/detail-modal";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { deletePaymentAction } from "@/lib/server/admin/actions/payments";
import { can } from "@/lib/admin/permissions";
import {
  ClearFiltersLink,
  EmptyPanel,
  FilterButtons,
  FilterLabel,
  FilterPanel,
  PaymentArt,
  StatTile,
} from "@/components/admin/list-parts";
import { SelectMenu } from "@/components/admin/pickers";
import { Alert, Badge, ButtonLink, DataTable, PageHeader, Pagination } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { PAGE_SIZE, getPaymentTotals, listPayments, pageParam } from "@/lib/server/admin/queries";

export const metadata: Metadata = { title: "Payments" };

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const stamp = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "-";

const statusOptions = [
  { value: "", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "created", label: "Started, not paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];
const kindOptions = [
  { value: "", label: "All" },
  { value: "advance", label: "Advance" },
  { value: "full", label: "Full payment" },
  { value: "balance", label: "Balance" },
];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const admin = await requireAdminPage("payments.view");
  const canDelete = can(admin.role, "bookings.delete");
  const raw = await searchParams;
  const filters = { status: one(raw.status), kind: one(raw.kind), page: pageParam(one(raw.page)) };
  const filtered = Boolean(filters.status || filters.kind);

  const [result, totals] = await Promise.all([
    listPayments(filters).catch((error) => {
      console.error("Payments list failed", error);
      return null;
    }),
    getPaymentTotals().catch((error) => {
      console.error("Payment totals failed", error);
      return null;
    }),
  ]);

  const hrefFor = (page: number) => {
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...filters, page })) if (value) q.set(key, String(value));
    return `/admin/payments?${q.toString()}`;
  };

  return (
    <div className="grid gap-6">
      <PageHeader icon={<CreditCard />} title="Payments" description="Every payment attempt made through Razorpay, with refunds." />

      {totals ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatTile tone="blue" icon={<Wallet />} label="Total payments" value={money(totals.sum.all)} hint={plural(totals.count.all, "payment")} />
          <StatTile tone="green" icon={<CheckCircle2 />} label="Successful" value={money(totals.sum.paid)} hint={plural(totals.count.paid, "payment")} />
          <StatTile tone="amber" icon={<Clock3 />} label="Pending" value={money(totals.sum.created)} hint={`${plural(totals.count.created, "payment")} not paid`} />
          <StatTile tone="red" icon={<RotateCcw />} label="Refunded" value={money(totals.sum.refunded)} hint={plural(totals.count.refunded, "refund")} />
        </div>
      ) : null}

      <FilterPanel label="Filter payments">
        <form action="/admin/payments" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <div>
            <FilterLabel htmlFor="p-status">Status</FilterLabel>
            <SelectMenu id="p-status" name="status" size="lg" icon={<Layers />} options={statusOptions} defaultValue={filters.status ?? ""} />
          </div>
          <div>
            <FilterLabel htmlFor="p-kind">Type</FilterLabel>
            <SelectMenu id="p-kind" name="kind" size="lg" icon={<Tag />} options={kindOptions} defaultValue={filters.kind ?? ""} />
          </div>
          <FilterButtons resetHref="/admin/payments" submitIcon={<SlidersHorizontal aria-hidden="true" />} className="sm:col-span-2 lg:col-span-1" />
        </form>
      </FilterPanel>

      {!result ? (
        <Alert tone="danger">Could not load payments. Please refresh in a moment.</Alert>
      ) : result.rows.length === 0 ? (
        <EmptyPanel
          art={<PaymentArt />}
          title={filtered ? "No payments found" : "No payments yet"}
          text={filtered ? "There are no payment records for the selected filters." : "Payments will appear here as customers pay for their bookings."}
          action={filtered ? <ClearFiltersLink href="/admin/payments" /> : null}
        />
      ) : (
        <>
          <DataTable
            rows={result.rows}
            rowKey={(p) => p.id}
            columns={[
              {
                header: "Booking",
                primary: true,
                cell: (p) =>
                  p.bookings ? (
                    <Link href={`/admin/bookings/${p.booking_id}`} className="font-semibold text-brand-bright hover:underline">
                      {p.bookings.ref} · {p.bookings.traveller_name}
                    </Link>
                  ) : (
                    "-"
                  ),
              },
              { header: "Type", cell: (p) => <span className="capitalize">{p.kind}</span> },
              { header: "Amount", cell: (p) => <b>{money(p.amount)}</b> },
              {
                header: "Status",
                cell: (p) => (
                  <Badge tone={p.status === "paid" ? "success" : p.status === "refunded" ? "info" : p.status === "failed" ? "danger" : "warning"}>
                    {p.status === "created" ? "not paid" : p.status}
                  </Badge>
                ),
              },
              { header: "Razorpay", cell: (p) => <span className="font-mono text-xs">{p.razorpay_payment_id ?? p.razorpay_order_id}</span> },
              { header: "When", cell: (p) => stamp(p.paid_at ?? p.created_at) },
              {
                header: "",
                align: "right",
                cell: (p) => (
                  <DetailModal
                    title={`${money(p.amount)} · ${p.kind}`}
                    subtitle={p.bookings ? `Booking ${p.bookings.ref}` : "No booking attached"}
                    badge={
                      <Badge tone={p.status === "paid" ? "success" : p.status === "refunded" ? "info" : p.status === "failed" ? "danger" : "warning"}>
                        {p.status === "created" ? "not paid" : p.status}
                      </Badge>
                    }
                    rows={[
                      ["Amount", money(p.amount)],
                      ["Type", <span key="k" className="capitalize">{p.kind === "full" ? "Full payment" : p.kind}</span>],
                      ["Status", p.status === "created" ? "Started, not paid" : p.status],
                      ["Customer", p.bookings?.traveller_name ?? ""],
                      ["Phone", p.bookings?.traveller_phone ? `+91 ${p.bookings.traveller_phone}` : ""],
                      ["Trip", p.bookings ? `${p.bookings.from_city} to ${p.bookings.to_city}` : ""],
                      ["Travel date", p.bookings?.travel_date ?? ""],
                      ["Started", stamp(p.created_at)],
                      ["Paid at", stamp(p.paid_at)],
                      ["Razorpay order id", <span key="o" className="font-mono text-xs">{p.razorpay_order_id}</span>],
                      ["Razorpay payment id", <span key="r" className="font-mono text-xs">{p.razorpay_payment_id ?? "-"}</span>],
                      ["Refund id", <span key="f" className="font-mono text-xs">{p.refund_id ?? "-"}</span>],
                    ]}
                  >
                    {p.booking_id ? (
                      <ButtonLink variant="secondary" size="sm" href={`/admin/bookings/${p.booking_id}`}>
                        Open booking
                      </ButtonLink>
                    ) : null}
                    {canDelete && (p.status === "created" || p.status === "failed") ? (
                      <ConfirmDelete id={p.id} action={deletePaymentAction} what="payment" summary={`${money(p.amount)} ${p.kind} payment${p.bookings ? ` (${p.bookings.ref})` : ""}`} />
                    ) : null}
                  </DetailModal>
                ),
              },
            ]}
          />
          <Pagination page={filters.page} pageSize={PAGE_SIZE} total={result.total} hrefFor={hrefFor} />
        </>
      )}
    </div>
  );
}
