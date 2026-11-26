import type { Metadata } from "next";
import { ArrowRightLeft, Download, Eye, FilePlus2, FileText } from "lucide-react";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { InvoiceTabs } from "@/components/admin/invoice-tabs";
import { Alert, Badge, ButtonLink, DataTable, EmptyState, PageHeader, buttonClass } from "@/components/admin/ui";
import { can } from "@/lib/admin/permissions";
import { formatDate } from "@/lib/booking/config";
import { deleteQuotationAction } from "@/lib/server/admin/actions/quotations";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { todayIst } from "@/lib/server/admin/queries";
import { listQuotations, type QuotationRow } from "@/lib/server/quotations";

export const metadata: Metadata = { title: "Quotations" };

const inr = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default async function AdminQuotationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdminPage("bookings.view");
  const canCreate = can(admin.role, "bookings.manage");
  const canDelete = can(admin.role, "bookings.delete");
  const created = (await searchParams).created;
  const today = todayIst();
  const quotations = await listQuotations().catch((error) => {
    console.error("Quotations list failed", error);
    return null;
  });
  const fresh = typeof created === "string" ? quotations?.find((r) => r.id === created) : undefined;

  const status = (r: QuotationRow) => {
    if (r.booking_id) return <Badge tone="success">Booked</Badge>;
    if (r.valid_until && r.valid_until < today) return <Badge tone="danger">Expired</Badge>;
    return <Badge tone="warning">Open</Badge>;
  };

  const actions = (r: QuotationRow) => (
    <span className="flex flex-wrap items-start justify-end gap-2">
      <a href={`/admin/invoices/quotations/${r.id}/pdf`} className={buttonClass({ variant: "secondary", size: "sm" })}>
        <Download aria-hidden="true" /> PDF
      </a>
      {r.booking_id ? (
        <ButtonLink href={`/admin/bookings/${r.booking_id}`} variant="secondary" size="sm">
          <Eye aria-hidden="true" /> Booking
        </ButtonLink>
      ) : canCreate ? (
        <ButtonLink href={`/admin/bookings/new?quote=${r.id}`} size="sm">
          <ArrowRightLeft aria-hidden="true" /> Convert to booking
        </ButtonLink>
      ) : null}
      {canDelete ? <ConfirmDelete id={r.id} action={deleteQuotationAction} what="quotation" summary={`Quotation ${r.quote_no} for ${r.customer_name}`} /> : null}
    </span>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader
        icon={<FileText />}
        title="Quotations"
        description="Send a price first. When the customer says yes, convert it into a booking."
        actions={
          canCreate ? (
            <ButtonLink href="/admin/invoices/quotations/new">
              <FilePlus2 aria-hidden="true" /> New quotation
            </ButtonLink>
          ) : null
        }
      />

      <InvoiceTabs active="quotations" />

      {fresh ? (
        <Alert tone="success">
          Quotation {fresh.quote_no} created.{" "}
          <a href={`/admin/invoices/quotations/${fresh.id}/pdf`} className="font-bold underline">
            Download the PDF
          </a>
        </Alert>
      ) : null}

      {!quotations ? (
        <Alert tone="danger">Could not load quotations. Check that migration 016_quotations.sql has been run.</Alert>
      ) : quotations.length === 0 ? (
        <EmptyState icon={<FileText />} title="No quotations yet">
          {canCreate ? "Use “New quotation” to make one. When the customer agrees, press “Convert to booking” on it." : "Quotations made by the owner or staff appear here."}
        </EmptyState>
      ) : (
        <DataTable
          rows={quotations}
          rowKey={(r) => r.id}
          columns={[
            {
              header: "Quotation",
              primary: true,
              cell: (r) => (
                <span className="grid">
                  <b>{r.quote_no}</b>
                  <span className="text-xs font-normal text-muted">{formatDate(r.quote_date)}</span>
                </span>
              ),
            },
            {
              header: "Customer",
              cell: (r) => (
                <span className="grid">
                  <span>{r.customer_name}</span>
                  <span className="text-xs text-muted">+91 {r.customer_phone}</span>
                </span>
              ),
            },
            {
              header: "Trip",
              cell: (r) => (
                <span className="grid">
                  <span>
                    {r.from_city} to {r.to_city}
                  </span>
                  <span className="text-xs text-muted">
                    {formatDate(r.travel_date)} · {r.vehicle_type}
                  </span>
                </span>
              ),
            },
            { header: "Total", cell: (r) => <b className="tabular-nums">{inr(r.total)}</b> },
            { header: "Status", cell: status },
            { header: "", align: "right", cell: actions },
          ]}
        />
      )}
    </div>
  );
}
