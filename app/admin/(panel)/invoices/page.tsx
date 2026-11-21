import type { Metadata } from "next";
import { Download, FilePlus2, Receipt } from "lucide-react";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { Alert, Badge, ButtonLink, DataTable, EmptyState, PageHeader, buttonClass } from "@/components/admin/ui";
import { can } from "@/lib/admin/permissions";
import { deleteManualInvoiceAction } from "@/lib/server/admin/actions/invoices";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { listManualInvoices, type ManualInvoiceRow } from "@/lib/server/invoices";

export const metadata: Metadata = { title: "Invoices" };

const inr = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

function paidBadge(r: ManualInvoiceRow) {
  if (r.amount_paid >= r.total) return <Badge tone="success">Paid</Badge>;
  if (r.amount_paid > 0) return <Badge tone="warning">Part paid</Badge>;
  return <Badge tone="danger">Unpaid</Badge>;
}

export default async function AdminInvoicesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdminPage("bookings.view");
  const canCreate = can(admin.role, "bookings.manage");
  const canDelete = can(admin.role, "bookings.delete");
  const created = (await searchParams).created;
  const invoices = await listManualInvoices().catch((error) => {
    console.error("Manual invoices list failed", error);
    return null;
  });
  const fresh = typeof created === "string" ? invoices?.find((r) => r.id === created) : undefined;

  const actions = (r: ManualInvoiceRow) => (
    <span className="flex flex-wrap items-start justify-end gap-2">
      <a href={`/admin/invoices/${r.id}/pdf`} className={buttonClass({ variant: "secondary", size: "sm" })}>
        <Download aria-hidden="true" /> PDF
      </a>
      {canDelete ? <ConfirmDelete id={r.id} action={deleteManualInvoiceAction} what="invoice" summary={`Invoice ${r.invoice_no} for ${r.customer_name}`} /> : null}
    </span>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader
        icon={<Receipt />}
        title="Invoices"
        description="Invoices made by hand. Invoices for website and phone bookings are on each booking's page."
        actions={
          canCreate ? (
            <ButtonLink href="/admin/invoices/new">
              <FilePlus2 aria-hidden="true" /> New invoice
            </ButtonLink>
          ) : null
        }
      />

      {fresh ? (
        <Alert tone="success">
          Invoice {fresh.invoice_no} created.{" "}
          <a href={`/admin/invoices/${fresh.id}/pdf`} className="font-bold underline">
            Download the PDF
          </a>
        </Alert>
      ) : null}

      {!invoices ? (
        <Alert tone="danger">Could not load invoices. Check that migration 013_manual_invoices.sql has been run.</Alert>
      ) : invoices.length === 0 ? (
        <EmptyState icon={<Receipt />} title="No invoices yet">
          {canCreate ? "Use “New invoice” to make one." : "Invoices made by the owner or staff appear here."}
        </EmptyState>
      ) : (
        <DataTable
          rows={invoices}
          rowKey={(r) => r.id}
          columns={[
            {
              header: "Invoice",
              primary: true,
              cell: (r) => (
                <span className="grid">
                  <b>{r.invoice_no}</b>
                  <span className="text-xs font-normal text-muted">{day(r.invoice_date)}</span>
                </span>
              ),
            },
            {
              header: "Customer",
              cell: (r) => (
                <span className="grid">
                  <span>{r.gst_company || r.customer_name}</span>
                  {r.gstin ? <span className="text-xs text-muted">GSTIN {r.gstin}</span> : r.customer_phone ? <span className="text-xs text-muted">+91 {r.customer_phone}</span> : null}
                </span>
              ),
            },
            { header: "Total", cell: (r) => <b className="tabular-nums">{inr(r.total)}</b> },
            {
              header: "Paid",
              cell: (r) => (
                <span className="flex flex-wrap items-center gap-2">
                  {paidBadge(r)}
                  {r.amount_paid > 0 && r.amount_paid < r.total ? <span className="text-xs text-muted tabular-nums">{inr(r.amount_paid)}</span> : null}
                </span>
              ),
            },
            { header: "", align: "right", cell: actions },
          ]}
        />
      )}
    </div>
  );
}
