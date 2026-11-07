import type { Metadata } from "next";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarX2,
  Clock3,
  ExternalLink,
  Inbox,
  IndianRupee,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { BookingRoute, StatusBadge, TripWhen, money } from "@/components/admin/booking-bits";
import { Alert, ButtonLink, Card, DataTable, EmptyState, StatCard } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { getDashboard } from "@/lib/server/admin/queries";

export const metadata: Metadata = { title: "Dashboard" };

const TZ = "Asia/Kolkata";

function greeting(now: Date) {
  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: TZ }).format(now));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-lg bg-brand/10 text-brand-bright ring-1 ring-brand-bright/20 [&>svg]:size-4">
        {icon}
      </span>
      {children}
    </span>
  );
}

const overviewColors = {
  confirmed: "#3cb8f2",
  completed: "#34d399",
  pending: "#fbbf24",
  cancelled: "#f87171",
} as const;

function BookingsOverview({ stats }: { stats: { total: number; confirmed: number; completed: number; pending: number; cancelled: number } }) {
  const rows = [
    { key: "confirmed", label: "Confirmed", value: stats.confirmed },
    { key: "completed", label: "Completed", value: stats.completed },
    { key: "pending", label: "Awaiting payment", value: stats.pending },
    { key: "cancelled", label: "Cancelled", value: stats.cancelled },
  ] as const;
  const sum = rows.reduce((n, r) => n + r.value, 0);

  // ring segments on a circle whose circumference is 100 (pathLength), with a small gap between slices
  const visible = rows.filter((r) => r.value > 0);
  const gap = visible.length > 1 ? 1.6 : 0;
  let start = 0;
  const arcs = visible.map((r) => {
    const share = (r.value / sum) * 100;
    const arc = { key: r.key, length: Math.max(share - gap, 0.5), offset: -start };
    start += share;
    return arc;
  });

  return (
    <Card
      className="h-full"
      title={<SectionTitle icon={<BarChart3 />}>Bookings overview</SectionTitle>}
      description="All time, by status."
    >
      <div className="grid justify-items-center gap-6">
        <div className="relative size-44" role="img" aria-label={`${stats.total} bookings in total`}>
          <svg viewBox="0 0 42 42" className="size-full -rotate-90">
            <circle cx="21" cy="21" r="15.9155" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4.5" strokeDasharray={sum === 0 ? "1.2 2.4" : undefined} />
            {arcs.map((a) => (
              <circle
                key={a.key}
                cx="21"
                cy="21"
                r="15.9155"
                fill="none"
                stroke={overviewColors[a.key]}
                strokeWidth="4.5"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray={`${a.length} ${100 - a.length}`}
                strokeDashoffset={a.offset}
                style={{ filter: `drop-shadow(0 0 3px ${overviewColors[a.key]}66)` }}
              />
            ))}
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="font-(family-name:--font-display) text-4xl leading-none font-extrabold">{stats.total}</p>
              <p className="mt-1.5 text-xs font-medium tracking-wide text-muted uppercase">Bookings</p>
            </div>
          </div>
        </div>

        <ul className="grid w-full gap-1">
          {rows.map((r) => {
            const pct = sum > 0 ? Math.round((r.value / sum) * 100) : 0;
            return (
              <li key={r.key} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-white/4">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: overviewColors[r.key], boxShadow: `0 0 10px ${overviewColors[r.key]}88` }} aria-hidden="true" />
                <span className="flex-1 text-white/80">{r.label}</span>
                <span className="w-9 text-right text-xs text-muted tabular-nums">{sum > 0 ? `${pct}%` : ""}</span>
                <span className="w-7 text-right font-bold tabular-nums">{r.value}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdminPage();
  const params = await searchParams;
  const stats = await getDashboard().catch((error) => {
    console.error("Dashboard failed", error);
    return null;
  });

  const now = new Date();
  const today = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(now);

  return (
    <div className="grid gap-6">
      {/* Welcome banner */}
      <section className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-panel">
        <img
          src="/admin-banner-1800.webp"
          srcSet="/admin-banner-1000.webp 1000w, /admin-banner-1800.webp 1800w"
          sizes="(min-width: 1024px) 1000px, 100vw"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 size-full object-cover object-[85%_62%]"
          decoding="async"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-r from-[#050b1a]/85 via-[#050b1a]/45 to-transparent md:via-[#050b1a]/25" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-black/40 to-transparent" />
        <div className="flex min-h-[220px] flex-col justify-center gap-5 p-6 sm:p-8 md:min-h-[250px]">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-semibold text-white/85 backdrop-blur">
              <CalendarDays className="size-3.5 text-brand-bright" aria-hidden="true" />
              {today}
            </p>
            <h1 className="mt-3 font-(family-name:--font-display) text-3xl font-extrabold tracking-tight [overflow-wrap:anywhere] sm:text-5xl">
              {greeting(now)}
              {admin.name ? `, ${admin.name}` : ""} <span aria-hidden="true">👋</span>
            </h1>
            <p className="mt-2 text-sm text-white/75 sm:text-base">Here is what is happening with your bookings.</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <ButtonLink href="/admin/bookings" className="shadow-[0_10px_30px_-10px_rgba(0,150,219,0.9)]">
              <CalendarCheck /> All bookings <ArrowRight />
            </ButtonLink>
            <ButtonLink href="/" target="_blank" variant="secondary" className="bg-black/30 backdrop-blur">
              <ExternalLink /> View site
            </ButtonLink>
          </div>
        </div>
      </section>

      {params.denied ? <Alert tone="warning">You do not have access to that section.</Alert> : null}
      {params.password === "changed" ? <Alert tone="success">Your password was updated.</Alert> : null}
      {!stats ? <Alert tone="danger">Could not load the dashboard numbers. Please refresh in a moment.</Alert> : null}

      {stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard tone="green" label="Revenue, last 30 days" value={money(stats.revenue30)} icon={<IndianRupee />} hint="Payments received" />
            <StatCard tone="violet" label="Balance still to collect" value={money(stats.balanceDue)} icon={<Wallet />} hint="Confirmed upcoming trips" />
            <StatCard tone="blue" label="Confirmed bookings" value={stats.confirmed} icon={<CalendarCheck />} hint={`${stats.total} in total`} />
            <StatCard tone="amber" label="Awaiting payment" value={stats.pending} icon={<Clock3 />} hint={`${stats.todaysNew} new today · ${stats.cancelled} cancelled`} />
          </div>

          <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card
            className="h-full"
            title={<SectionTitle icon={<CalendarClock />}>Trips in the next 7 days</SectionTitle>}
            description="Confirmed bookings, soonest first."
          >
            {stats.upcoming.length === 0 ? (
              <EmptyState icon={<CalendarX2 />} title="No trips scheduled this week">
                Confirmed trips for the next 7 days will show up here.
              </EmptyState>
            ) : (
              <DataTable
                rows={stats.upcoming}
                rowKey={(b) => b.id}
                columns={[
                  { header: "Booking", primary: true, cell: (b) => <BookingRoute booking={b} /> },
                  { header: "When", cell: (b) => <TripWhen booking={b} /> },
                  { header: "Traveller", cell: (b) => `${b.traveller_name} · +91 ${b.traveller_phone}` },
                  { header: "Pickup", cell: (b) => b.pickup_address },
                ]}
              />
            )}
          </Card>
          <BookingsOverview stats={stats} />
          </div>

          <Card
            title={<SectionTitle icon={<ReceiptText />}>Latest bookings</SectionTitle>}
            actions={
              stats.recent.length > 0 ? (
                <ButtonLink href="/admin/bookings" variant="ghost" size="sm">
                  View all <ArrowRight />
                </ButtonLink>
              ) : null
            }
          >
            {stats.recent.length === 0 ? (
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <div className="hidden grid-cols-[1.6fr_1fr_1fr_auto] gap-4 bg-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted md:grid">
                  <span>Booking</span>
                  <span>Status</span>
                  <span>Travel</span>
                  <span className="text-right">Total</span>
                </div>
                <EmptyState bare icon={<Inbox />} title="No bookings yet">
                  New bookings from the website will appear here.
                </EmptyState>
              </div>
            ) : (
              <DataTable
                rows={stats.recent}
                rowKey={(b) => b.id}
                columns={[
                  { header: "Booking", primary: true, cell: (b) => <BookingRoute booking={b} /> },
                  { header: "Status", cell: (b) => <StatusBadge status={b.status} /> },
                  { header: "Travel", cell: (b) => <TripWhen booking={b} /> },
                  { header: "Total", align: "right", cell: (b) => money(b.total) },
                ]}
              />
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
