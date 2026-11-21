import type { Metadata } from "next";
import { Car, ExternalLink, MessageSquareQuote, Star, UserRound } from "lucide-react";
import Link from "next/link";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { deleteReviewAction } from "@/lib/server/admin/actions/reviews";
import { DetailModal } from "@/components/admin/detail-modal";
import { StatTile } from "@/components/admin/list-parts";
import { ReviewToggle } from "@/components/admin/review-toggle";
import { Alert, Badge, ButtonLink, DataTable, EmptyState, PageHeader } from "@/components/admin/ui";
import { Stars } from "@/components/booking/stars";
import { can } from "@/lib/admin/permissions";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { listReviewsForAdmin, type AdminReview } from "@/lib/server/bookings/reviews";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Reviews" };

const when = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const whenFull = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const average = (values: number[]) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0);

type Show = "visible" | "hidden";

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdminPage("bookings.view");
  const canManage = can(admin.role, "bookings.manage");
  const raw = one((await searchParams).show);
  const show: Show | undefined = raw === "visible" || raw === "hidden" ? raw : undefined;
  const all = await listReviewsForAdmin().catch((error) => {
    console.error("Reviews list failed", error);
    return null;
  });

  const visible = all?.filter((r) => r.published).length ?? 0;
  const hidden = (all?.length ?? 0) - visible;
  const reviews = all ? (show ? all.filter((r) => (show === "visible") === r.published) : all) : null;
  const avgCab = average(all?.map((r) => r.cabRating) ?? []);
  const avgDriver = average(all?.map((r) => r.driverRating) ?? []);

  const tabs: { value: Show | undefined; label: string; n: number }[] = [
    { value: undefined, label: "All", n: all?.length ?? 0 },
    { value: "visible", label: "Visible", n: visible },
    { value: "hidden", label: "Hidden", n: hidden },
  ];

  /** The "View" popup with the whole review, the customer and the trip. */
  const modal = (r: AdminReview) => (
    <DetailModal
      title={`Review by ${r.travellerName || r.reviewer}`}
      subtitle={`${r.vehicle} · booking ${r.ref}`}
      badge={<Badge tone={r.published ? "success" : "neutral"}>{r.published ? "Visible" : "Hidden"}</Badge>}
      rows={[
        ["Cab rating", <span key="c" className="inline-flex items-center gap-2"><Stars value={r.cabRating} /> {r.cabRating}/5</span>],
        ["Driver rating", <span key="d" className="inline-flex items-center gap-2"><Stars value={r.driverRating} /> {r.driverRating}/5</span>],
        ["Customer name", r.travellerName],
        ["Shown on website as", r.reviewer],
        ["Phone", r.travellerPhone ? <a key="p" className="text-brand-bright hover:underline" href={`tel:+91${r.travellerPhone}`}>+91 {r.travellerPhone}</a> : ""],
        ["Email", r.customerEmail],
        ["Trip", r.route],
        ["Travel date", r.travelDate ? when(r.travelDate) : ""],
        ["Vehicle", r.vehicle],
        ["Reviewed on", whenFull(r.date)],
        ["What went well", r.tags.length ? r.tags.join(", ") : "Nothing selected"],
        ["Booking", <Link key="b" className="text-brand-bright hover:underline" href={`/admin/bookings/${r.bookingId}`}>{r.ref} (open booking)</Link>],
      ]}
      wide={{ label: "Comment", body: r.comment || <span className="text-muted">The customer left no written comment.</span> }}
    >
      <ButtonLink variant="secondary" size="sm" href={`/admin/bookings/${r.bookingId}`}>
        <ExternalLink aria-hidden="true" /> Open booking
      </ButtonLink>
      <ReviewToggle id={r.id} published={r.published} canManage={canManage} />
      {canManage ? <ConfirmDelete id={r.id} action={deleteReviewAction} what="review" summary={`The review by ${r.travellerName || r.reviewer}`} /> : null}
    </DetailModal>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader
        icon={<Star />}
        title="Reviews"
        description="What customers say after their trip. A hidden review no longer shows on the website. Reviews cannot be edited."
        actions={
          canManage ? (
            <ButtonLink href="/admin/reviews/other-sites" variant="secondary">
              Add a review from Google or elsewhere
            </ButtonLink>
          ) : null
        }
      />

      {all ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatTile tone="blue" icon={<MessageSquareQuote />} label="Total reviews" value={all.length} hint={`${visible} visible, ${hidden} hidden`} />
          <StatTile tone="amber" icon={<Star />} label="Average, cab" value={all.length ? `${avgCab.toFixed(1)} / 5` : "-"} />
          <StatTile tone="violet" icon={<UserRound />} label="Average, driver" value={all.length ? `${avgDriver.toFixed(1)} / 5` : "-"} />
          <StatTile tone="green" icon={<Car />} label="Shown on website" value={visible} />
        </div>
      ) : null}

      <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" aria-label="Filter reviews">
        {tabs.map((t) => {
          const on = show === t.value;
          return (
            <Link
              key={t.value ?? "all"}
              href={t.value ? `/admin/reviews?show=${t.value}` : "/admin/reviews"}
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

      {!reviews ? (
        <Alert tone="danger">Could not load reviews. Check that migration 007_reviews.sql has been run.</Alert>
      ) : reviews.length === 0 ? (
        <EmptyState icon={<Star />} title={show ? `No ${show} reviews` : "No reviews yet"}>
          {show ? "Pick another tab to see the rest." : "Customers can review a trip from My Bookings once it has taken place."}
        </EmptyState>
      ) : (
        <DataTable
          rows={reviews}
          rowKey={(r) => r.id}
          columns={[
            {
              header: "Customer",
              primary: true,
              cell: (r) => (
                <span className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-linear-to-br from-amber-300 to-orange-500 text-sm font-bold text-black">
                    {(r.travellerName || r.reviewer).charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <b className="block">{r.travellerName || r.reviewer}</b>
                    <span className="block text-xs font-normal text-muted">
                      {r.vehicle} · {r.ref} · {when(r.date)}
                    </span>
                  </span>
                </span>
              ),
            },
            {
              header: "Ratings",
              cell: (r) => (
                <span className="grid gap-1 text-xs">
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <Stars value={r.cabRating} /> Cab
                  </span>
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <Stars value={r.driverRating} /> Driver
                  </span>
                </span>
              ),
            },
            {
              header: "Review",
              cell: (r) => (
                <span className="grid max-w-sm gap-1">
                  {r.comment ? <span className="line-clamp-2">{r.comment}</span> : <span className="text-muted">No comment</span>}
                  {r.tags.length ? <span className="text-xs text-muted">{r.tags.join(" · ")}</span> : null}
                </span>
              ),
            },
            { header: "On website", cell: (r) => <Badge tone={r.published ? "success" : "neutral"}>{r.published ? "Visible" : "Hidden"}</Badge> },
            {
              header: "",
              align: "right",
              cell: (r) => (
                <span className="flex flex-wrap items-start justify-end gap-2">
                  {modal(r)}
                  <ReviewToggle id={r.id} published={r.published} canManage={canManage} />
                </span>
              ),
            },
          ]}
          card={(r) => (
            <div className={cn("h-full rounded-2xl border bg-panel p-4 sm:p-5", r.published ? "border-line" : "border-dashed border-white/15 opacity-85")}>
              <div className="flex items-start gap-3 sm:gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-linear-to-br from-amber-300 to-orange-500 text-base font-bold text-black shadow-[0_8px_20px_-8px_rgba(251,191,36,0.8)] sm:size-12">
                  {(r.travellerName || r.reviewer).charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h2 className="font-(family-name:--font-display) text-lg font-bold wrap-anywhere">{r.travellerName || r.reviewer}</h2>
                      <Badge tone={r.published ? "success" : "neutral"}>{r.published ? "Visible" : "Hidden"}</Badge>
                    </div>
                    <time dateTime={r.date} className="text-xs text-muted">
                      {when(r.date)}
                    </time>
                  </div>
                  <div className="mt-1 text-xs text-muted wrap-anywhere">
                    {r.vehicle} · {r.ref} · {r.route}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="min-w-0 rounded-xl border border-line bg-white/3 px-3 py-2.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">Cab</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Stars value={r.cabRating} className="[&>svg]:size-3.5" />
                    <b className="text-sm">{r.cabRating}</b>
                  </div>
                </div>
                <div className="min-w-0 rounded-xl border border-line bg-white/3 px-3 py-2.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">Driver</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Stars value={r.driverRating} className="[&>svg]:size-3.5" />
                    <b className="text-sm">{r.driverRating}</b>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-line border-l-4 border-l-amber-400/70 bg-black/20 p-3 text-sm">
                {r.comment ? <span className="line-clamp-4 whitespace-pre-line wrap-anywhere">{r.comment}</span> : <span className="text-muted">The customer left no written comment.</span>}
              </div>

              {r.tags.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.tags.map((tag) => (
                    <span key={tag} className="rounded-md bg-white/5 px-2 py-1 text-xs text-muted ring-1 ring-white/10">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4 sm:flex sm:flex-wrap sm:items-start sm:justify-end max-sm:[&>button:last-child]:col-span-2 [&_a]:min-h-10 [&_button]:min-h-10">
                <ButtonLink variant="secondary" size="sm" href={`/admin/bookings/${r.bookingId}`}>
                  <ExternalLink aria-hidden="true" /> Open booking
                </ButtonLink>
                <ReviewToggle id={r.id} published={r.published} canManage={canManage} />
                {modal(r)}
                {canManage ? <ConfirmDelete id={r.id} action={deleteReviewAction} what="review" summary={`The review by ${r.travellerName || r.reviewer}`} /> : null}
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}
