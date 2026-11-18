import type { Metadata } from "next";
import { CheckCheck, Clock, Inbox, MessageSquareText, Phone, PhoneCall, Tag } from "lucide-react";
import Link from "next/link";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { deleteEnquiryAction } from "@/lib/server/admin/actions/enquiries";
import { DetailModal } from "@/components/admin/detail-modal";
import { EnquiryStatusButton } from "@/components/admin/enquiry-status";
import { StatTile } from "@/components/admin/list-parts";
import { Alert, Badge, ButtonLink, DataTable, EmptyState, PageHeader } from "@/components/admin/ui";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { can } from "@/lib/admin/permissions";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { ENQUIRY_STATUSES, listEnquiries, type EnquiryRow, type EnquiryStatus } from "@/lib/server/enquiries";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Enquiries" };

const whenFull = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const whenShort = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

/** "5 min ago", "3 h ago", "2 days ago", or the date for anything older than a week. */
function ago(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days <= 7 ? `${days} ${days === 1 ? "day" : "days"} ago` : whenShort(iso);
}

const TONE = { new: "warning", contacted: "info", closed: "neutral" } as const;
const AVATAR: Record<EnquiryStatus, string> = {
  new: "bg-linear-to-br from-amber-300 to-orange-500 text-black shadow-[0_8px_20px_-8px_rgba(251,191,36,0.8)]",
  contacted: "bg-linear-to-br from-sky-400 to-brand text-white shadow-[0_8px_20px_-8px_rgba(56,189,248,0.8)]",
  closed: "bg-white/10 text-white/60",
};
const SOURCE: Record<string, string> = { contact_form: "Contact page form" };
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function AdminEnquiriesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdminPage("bookings.view");
  const canManage = can(admin.role, "bookings.manage");
  const raw = one((await searchParams).status);
  const status = ENQUIRY_STATUSES.includes(raw as EnquiryStatus) ? (raw as EnquiryStatus) : undefined;
  const all = await listEnquiries().catch((error) => {
    console.error("Enquiries list failed", error);
    return null;
  });
  const count = (s: EnquiryStatus) => all?.filter((r) => r.status === s).length ?? 0;
  const enquiries = all ? (status ? all.filter((r) => r.status === status) : all) : null;

  const whatsappFor = (r: EnquiryRow) =>
    `https://wa.me/91${r.phone}?text=${encodeURIComponent(`Hi ${r.name}, this is Veera Tours & Travels about your enquiry${r.topic ? ` (${r.topic})` : ""}.`)}`;

  /** The "View" popup with every detail of one enquiry. */
  const modal = (r: EnquiryRow) => (
    <DetailModal
      title={r.name}
      subtitle={`Enquiry received ${whenFull(r.created_at)}`}
      badge={<Badge tone={TONE[r.status]}>{r.status}</Badge>}
      rows={[
        ["Name", r.name],
        ["Phone", <a key="p" className="text-brand-bright hover:underline" href={`tel:+91${r.phone}`}>+91 {r.phone}</a>],
        ["Looking for", r.topic || "Not specified"],
        ["Received", whenFull(r.created_at)],
        ["Came from", SOURCE[r.source] ?? r.source],
        ["Status", r.status === "new" ? "New: nobody has replied yet" : r.status === "contacted" ? "Contacted: waiting for the customer" : "Closed"],
      ]}
      wide={{ label: "Message", body: r.message || <span className="text-muted">The visitor did not write a message.</span> }}
    >
      <ButtonLink variant="secondary" size="sm" href={`tel:+91${r.phone}`}>
        <Phone aria-hidden="true" /> Call
      </ButtonLink>
      <ButtonLink variant="secondary" size="sm" href={whatsappFor(r)} target="_blank" rel="noreferrer">
        <WhatsAppIcon aria-hidden="true" className="text-emerald-400" /> WhatsApp
      </ButtonLink>
      <EnquiryStatusButton id={r.id} status={r.status} canManage={canManage} />
      {canManage ? <ConfirmDelete id={r.id} action={deleteEnquiryAction} what="enquiry" summary={`The enquiry from ${r.name}`} /> : null}
    </DetailModal>
  );

  const tabs: { value: EnquiryStatus | undefined; label: string; n: number }[] = [
    { value: undefined, label: "All", n: all?.length ?? 0 },
    ...ENQUIRY_STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1), n: count(s) })),
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader
        icon={<Inbox />}
        title="Enquiries"
        description="People who used the Contact page form or an “ask about a route, tour or vehicle” button. Call or WhatsApp them back, then mark the enquiry."
      />

      {all ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatTile tone="blue" icon={<Inbox />} label="All enquiries" value={all.length} />
          <StatTile tone="amber" icon={<Clock />} label="New" value={count("new")} hint="Nobody has replied yet" />
          <StatTile tone="violet" icon={<PhoneCall />} label="Contacted" value={count("contacted")} hint="Waiting for the customer" />
          <StatTile tone="green" icon={<CheckCheck />} label="Closed" value={count("closed")} />
        </div>
      ) : null}

      <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" aria-label="Filter enquiries">
        {tabs.map((t) => {
          const on = status === t.value;
          return (
            <Link
              key={t.value ?? "all"}
              href={t.value ? `/admin/enquiries?status=${t.value}` : "/admin/enquiries"}
              aria-current={on ? "page" : undefined}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition",
                on ? "border-transparent bg-linear-to-r from-brand to-brand-bright text-white shadow-[0_10px_28px_-10px_rgba(0,150,219,0.85)]" : "border-white/10 bg-white/4 text-white/80 hover:border-white/25 hover:text-white",
              )}
            >
              {t.label}
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", on ? "bg-white/20" : "bg-white/10 text-white/70")}>{t.n}</span>
            </Link>
          );
        })}
      </nav>

      {!enquiries ? (
        <Alert tone="danger">Could not load enquiries. Check that migration 009_enquiries.sql has been run.</Alert>
      ) : enquiries.length === 0 ? (
        <EmptyState icon={<Inbox />} title={status ? `No ${status} enquiries` : "No enquiries yet"}>
          {status ? "Pick another tab to see the rest." : "They appear here as soon as someone sends the Contact page form."}
        </EmptyState>
      ) : (
        <DataTable
          rows={enquiries}
          rowKey={(r) => r.id}
          columns={[
            {
              header: "Who",
              primary: true,
              cell: (r) => (
                <span className="flex items-center gap-3">
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold", AVATAR[r.status])}>{r.name.charAt(0).toUpperCase()}</span>
                  <span className="min-w-0">
                    <b className="block">{r.name}</b>
                    <span className="block whitespace-nowrap text-xs font-normal text-muted" title={whenFull(r.created_at)}>
                      {ago(r.created_at)}
                    </span>
                  </span>
                </span>
              ),
            },
            {
              header: "Phone",
              cell: (r) => (
                <a className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-white/5 px-2.5 py-1.5 text-[13px] font-medium ring-1 ring-white/10 transition hover:bg-white/10 hover:text-brand-bright" href={`tel:+91${r.phone}`}>
                  <Phone className="size-3.5" aria-hidden="true" /> +91 {r.phone}
                </a>
              ),
            },
            { header: "Looking for", cell: (r) => (r.topic ? <span className="text-brand-bright">{r.topic}</span> : "—") },
            { header: "Message", cell: (r) => (r.message ? <span className="line-clamp-2 max-w-xs whitespace-pre-line">{r.message}</span> : <span className="text-muted">No message</span>) },
            { header: "Status", cell: (r) => <Badge tone={TONE[r.status]}>{r.status}</Badge> },
            {
              header: "",
              align: "right",
              cell: (r) => (
                <span className="flex flex-wrap items-start justify-end gap-2">
                  {modal(r)}
                  <EnquiryStatusButton id={r.id} status={r.status} canManage={canManage} />
                </span>
              ),
            },
          ]}
          card={(r) => {
            const whatsapp = whatsappFor(r);
            return (
              <div
                className={cn(
                  "h-full rounded-2xl border bg-panel p-4 sm:p-5",
                  r.status === "new" ? "border-amber-400/30 bg-linear-to-br from-amber-400/6 to-panel" : "border-line",
                )}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <span className={cn("grid size-11 shrink-0 place-items-center rounded-full text-base font-bold sm:size-12", AVATAR[r.status])}>{r.name.charAt(0).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h2 className="font-(family-name:--font-display) text-lg font-bold wrap-anywhere">{r.name}</h2>
                        <Badge tone={TONE[r.status]}>{r.status}</Badge>
                      </div>
                      <time dateTime={r.created_at} title={whenFull(r.created_at)} className="text-xs text-muted">
                        {ago(r.created_at)}
                      </time>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <a
                        href={`tel:+91${r.phone}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-[13px] font-medium ring-1 ring-white/10 transition hover:bg-white/10 hover:text-brand-bright"
                      >
                        <Phone className="size-3.5" aria-hidden="true" /> +91 {r.phone}
                      </a>
                      {r.topic ? (
                        <span className="inline-flex items-center gap-2 rounded-lg bg-brand/10 px-2.5 py-1.5 text-[13px] font-medium text-brand-bright ring-1 ring-brand-bright/20">
                          <Tag className="size-3.5" aria-hidden="true" /> {r.topic}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-line bg-black/20 p-3 text-sm">
                      <MessageSquareText className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
                      {r.message ? <span className="line-clamp-3 whitespace-pre-line wrap-anywhere">{r.message}</span> : <span className="text-muted">No message written.</span>}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4 sm:flex sm:flex-wrap sm:items-start sm:justify-end [&_a]:min-h-10 [&_button]:min-h-10">
                  <ButtonLink variant="secondary" size="sm" href={`tel:+91${r.phone}`}>
                    <Phone aria-hidden="true" /> Call
                  </ButtonLink>
                  <ButtonLink variant="secondary" size="sm" href={whatsapp} target="_blank" rel="noreferrer">
                    <WhatsAppIcon aria-hidden="true" className="text-emerald-400" /> WhatsApp
                  </ButtonLink>
                  <EnquiryStatusButton id={r.id} status={r.status} canManage={canManage} />
                  {modal(r)}
                  {canManage ? <ConfirmDelete id={r.id} action={deleteEnquiryAction} what="enquiry" summary={`The enquiry from ${r.name}`} /> : null}
                </div>
              </div>
            );
          }}
        />
      )}
    </div>
  );
}
