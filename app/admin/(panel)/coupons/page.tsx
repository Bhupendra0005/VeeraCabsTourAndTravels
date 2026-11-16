import type { Metadata } from "next";
import { IndianRupee, Percent, TicketPercent, Users } from "lucide-react";
import { money } from "@/components/admin/booking-bits";
import { CouponDialogButton, CouponQuickActions } from "@/components/admin/coupon-editor";
import { StatTile } from "@/components/admin/list-parts";
import { Alert, Badge, EmptyState, PageHeader } from "@/components/admin/ui";
import { can } from "@/lib/admin/permissions";
import { formatINR } from "@/lib/booking/config";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { getCouponStats } from "@/lib/server/admin/queries";
import { getBookingExtras } from "@/lib/server/cms/content";

export const metadata: Metadata = { title: "Coupons" };

const when = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export default async function AdminCouponsPage() {
  const admin = await requireAdminPage("bookings.view");
  const [extras, stats] = await Promise.all([
    getBookingExtras(),
    getCouponStats().catch((error) => {
      console.error("Coupon stats failed", error);
      return null;
    }),
  ]);
  const known = new Set(extras.coupons.map((c) => c.code.toUpperCase()));
  const removed = stats ? Object.keys(stats).filter((code) => !known.has(code.toUpperCase())) : [];
  const totalUses = stats ? Object.values(stats).reduce((s, v) => s + v.uses, 0) : 0;
  const totalOff = stats ? Object.values(stats).reduce((s, v) => s + v.discount, 0) : 0;
  const running = extras.coupons.filter((c) => c.active).length;
  const statFor = (code: string) => stats?.[code.toUpperCase()] ?? stats?.[code];
  const canEdit = can(admin.role, "content.manage");

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader
        icon={<TicketPercent />}
        title="Coupons"
        description="How often each coupon was used and how much discount it gave. Cancelled bookings are not counted."
        actions={canEdit ? <div className="max-sm:w-full max-sm:[&>button]:w-full"><CouponDialogButton /></div> : null}
      />
      {!stats ? <Alert tone="danger">Could not load coupon usage. Please refresh in a moment.</Alert> : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile tone="blue" icon={<TicketPercent />} label="Total coupons" value={extras.coupons.length} hint={`${extras.coupons.length - running} switched off`} />
        <StatTile tone="green" icon={<Percent />} label="Running now" value={running} />
        {stats ? (
          <>
            <StatTile tone="amber" icon={<Users />} label="Bookings with a coupon" value={totalUses} />
            <StatTile tone="violet" icon={<IndianRupee />} label="Discount given" value={money(totalOff)} hint="In total" />
          </>
        ) : null}
      </div>

      {extras.coupons.length === 0 ? (
        <EmptyState icon={<TicketPercent />} title="You have no coupons">
          {canEdit ? 'Tap "Add coupon" to create your first one.' : "Ask the owner to add one."}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {extras.coupons.map((c) => {
            const s = statFor(c.code);
            const used = s?.uses ?? 0;
            const exhausted = !!c.maxUsesTotal && used >= c.maxUsesTotal;
            const pct = c.maxUsesTotal ? Math.min(100, Math.round((used / c.maxUsesTotal) * 100)) : 0;
            const off = c.kind === "percent" ? `${c.value}% OFF` : `${formatINR(Math.round(c.value * 100))} OFF`;
            const rules = [
              c.kind === "percent" && c.maxDiscount > 0 ? `up to ${formatINR(Math.round(c.maxDiscount * 100))}` : "",
              c.minFare > 0 ? `fare from ${formatINR(Math.round(c.minFare * 100))}` : "",
              c.firstBookingOnly ? "first booking only" : "",
              c.maxUsesPerCustomer ? `${c.maxUsesPerCustomer} per customer` : "",
            ].filter(Boolean);
            return (
              <li
                key={c.code}
                className={`relative min-w-0 overflow-hidden rounded-2xl border bg-linear-to-br from-[#0c1a24] via-panel to-panel p-5 ${
                  c.active && !exhausted ? "border-brand-bright/25 shadow-[0_0_40px_-22px_rgba(0,150,219,0.6)]" : "border-line opacity-80"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex max-w-full items-center gap-2 rounded-lg border border-dashed border-brand-bright/50 bg-brand/10 px-3 py-1.5 font-mono text-sm font-bold tracking-wider text-brand-bright wrap-anywhere">
                    <TicketPercent className="size-4 shrink-0" aria-hidden="true" /> {c.code}
                  </span>
                  {c.active ? exhausted ? <Badge tone="warning">limit reached</Badge> : <Badge tone="success">running</Badge> : <Badge tone="neutral">off</Badge>}
                </div>

                <div className="mt-6 font-(family-name:--font-display) text-3xl font-bold tracking-tight">{off}</div>
                {c.description ? <div className="mt-1.5 text-sm text-muted wrap-anywhere">{c.description}</div> : null}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {rules.length ? (
                    rules.map((r) => (
                      <span key={r} className="rounded-md bg-white/5 px-2 py-1 text-xs text-muted ring-1 ring-white/10">
                        {r}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-muted ring-1 ring-white/10">no limits</span>
                  )}
                  {c.maxUsesTotal ? (
                    <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-muted ring-1 ring-white/10">{c.maxUsesTotal} uses in total</span>
                  ) : null}
                </div>

                {c.maxUsesTotal ? (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>Used</span>
                      <span>
                        <b className="text-(--text)">{used}</b> / {c.maxUsesTotal}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={c.maxUsesTotal} aria-label={`${c.code} uses`}>
                      <div className={`h-full rounded-full ${exhausted ? "bg-amber-400" : "bg-linear-to-r from-brand to-brand-bright"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ) : null}

                <dl className="mt-5 grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-white/3 py-3 text-center">
                  <div className="min-w-0 px-2">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Used</dt>
                    <dd className="mt-1 font-(family-name:--font-display) text-lg leading-tight font-bold">{used}</dd>
                    <dd className="mt-0.5 text-[11px] text-muted">
                      {s?.customers ?? 0} {s?.customers === 1 ? "customer" : "customers"}
                    </dd>
                  </div>
                  <div className="min-w-0 px-2">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Discount</dt>
                    <dd className="mt-1 font-(family-name:--font-display) text-lg leading-tight font-bold wrap-anywhere">{money(s?.discount ?? 0)}</dd>
                    <dd className="mt-0.5 text-[11px] text-muted">given</dd>
                  </div>
                  <div className="min-w-0 px-2">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Last used</dt>
                    <dd className="mt-1 text-[13px] leading-tight font-semibold wrap-anywhere">{s?.lastUsed ? when(s.lastUsed) : <span className="text-muted">Not yet</span>}</dd>
                    <dd className="mt-0.5 text-[11px] text-muted">&nbsp;</dd>
                  </div>
                </dl>

                {canEdit ? (
                  <div className="mt-4 grid grid-cols-[auto_1fr_auto] items-stretch gap-2 border-t border-line pt-4 [&>button]:min-h-10">
                    <CouponDialogButton key={JSON.stringify(c)} coupon={c} />
                    <CouponQuickActions code={c.code} active={c.active} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {removed.length > 0 ? (
        <Alert tone="info">
          Bookings also used codes that are no longer in your list: {removed.map((code) => `${code} (${stats?.[code].uses} uses)`).join(", ")}.
        </Alert>
      ) : null}
    </div>
  );
}
