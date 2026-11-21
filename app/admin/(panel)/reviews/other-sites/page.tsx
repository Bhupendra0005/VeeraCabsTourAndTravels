import type { Metadata } from "next";
import { MessageSquareQuote } from "lucide-react";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { ExternalReviewForm } from "@/components/admin/external-review-form";
import { Alert, Badge, ButtonLink, DataTable, EmptyState, PageHeader } from "@/components/admin/ui";
import { Stars } from "@/components/booking/stars";
import { ReviewAvatar } from "@/components/site/review-avatar";
import { can } from "@/lib/admin/permissions";
import { EXTERNAL_SOURCES } from "@/lib/booking/reviews";
import { deleteExternalReviewAction } from "@/lib/server/admin/actions/reviews";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { listExternalReviewsForAdmin } from "@/lib/server/bookings/reviews";

export const metadata: Metadata = { title: "Reviews from other sites" };

const when = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export default async function ExternalReviewsPage() {
  const admin = await requireAdminPage("bookings.manage");
  const canManage = can(admin.role, "bookings.manage");
  const reviews = await listExternalReviewsForAdmin().catch((error) => {
    console.error("External reviews list failed", error);
    return null;
  });

  return (
    <div className="grid max-w-5xl grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader
        icon={<MessageSquareQuote />}
        title="Reviews from other sites"
        description="Real reviews customers wrote on Google, Justdial and similar. They show on the home page with their source, next to reviews written on this website."
        actions={
          <ButtonLink href="/admin/reviews" variant="secondary">
            Back to reviews
          </ButtonLink>
        }
      />

      {canManage ? <ExternalReviewForm /> : null}

      {!reviews ? (
        <Alert tone="danger">Could not load these reviews. Check that migration 014_external_reviews.sql has been run.</Alert>
      ) : reviews.length === 0 ? (
        <EmptyState icon={<MessageSquareQuote />} title="Nothing added yet">
          Reviews you add above appear here and on the home page.
        </EmptyState>
      ) : (
        <DataTable
          rows={reviews}
          rowKey={(r) => r.id}
          columns={[
            {
              header: "Reviewer",
              primary: true,
              cell: (r) => (
                <span className="flex items-center gap-3">
                  <ReviewAvatar
                    name={r.reviewer_name}
                    url={r.avatar_url}
                    className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-sky-500/15 text-xs font-extrabold text-sky-300 [&>img]:size-full [&>img]:object-cover"
                  />
                  <span className="grid">
                    <b>{r.reviewer_name}</b>
                    <span className="text-xs font-normal text-muted">{when(r.review_date)}</span>
                  </span>
                </span>
              ),
            },
            { header: "Source", cell: (r) => <Badge tone="info">{EXTERNAL_SOURCES[r.source] ?? "Other"}</Badge> },
            { header: "Rating", cell: (r) => <Stars value={r.rating} /> },
            { header: "Review", cell: (r) => <span className="line-clamp-3 max-w-md whitespace-pre-line">{r.comment}</span> },
            {
              header: "",
              align: "right",
              cell: (r) => (canManage ? <ConfirmDelete id={r.id} action={deleteExternalReviewAction} what="review" summary={`The review by ${r.reviewer_name}`} /> : null),
            },
          ]}
        />
      )}
    </div>
  );
}
