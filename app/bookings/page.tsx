import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  CarFront,
  CheckCircle2,
  Clock3,
  Headset,
  MapPin,
  Phone,
  Plus,
  Route,
  Ticket,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AccountShell } from "@/components/account/account-shell";
import { AccountBanner } from "@/components/account/account-banner";
import { accountGroups } from "@/components/account/nav";
import { TRIP_TYPE_LABEL, formatDate, formatINR, to12h } from "@/lib/booking/config";
import { STATUS_CLASS, STATUS_LABEL } from "@/lib/booking/status";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { whatsappLink } from "@/lib/site";
import { getProfile } from "@/lib/server/auth/profile";
import { getSession } from "@/lib/server/auth/session";
import { listCustomerBookings } from "@/lib/server/bookings/service";
import type { BookingRow } from "@/lib/server/bookings/types";
import { getFleet, getSite } from "@/lib/server/cms/content";
import { cabHeading } from "@/lib/booking/fleet";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = {
  title: "My trips",
  robots: { index: false, follow: false },
};

type Tab = "upcoming" | "completed" | "cancelled" | "all";

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "upcoming", label: "Upcoming", icon: <CalendarCheck /> },
  { id: "completed", label: "Completed", icon: <CheckCircle2 /> },
  { id: "cancelled", label: "Cancelled", icon: <XCircle /> },
  { id: "all", label: "All trips", icon: <Ticket /> },
];

const todayIst = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

function dayDiff(iso: string, today: string) {
  const a = Date.parse(`${iso}T00:00:00Z`);
  const b = Date.parse(`${today}T00:00:00Z`);
  return Math.round((a - b) / 86_400_000);
}

function bucket(b: BookingRow, today: string): Exclude<Tab, "all"> {
  if (b.status === "cancelled") return "cancelled";
  if (b.status === "completed") return "completed";
  const lastDay = b.return_date && b.return_date > b.travel_date ? b.return_date : b.travel_date;
  return lastDay < today ? "completed" : "upcoming";
}

function whenChip(b: BookingRow, today: string) {
  // a cancelled or failed booking is not going to happen, so it gets no "pickup in N days" countdown
  if (b.status === "cancelled" || b.status === "payment_failed" || b.status === "completed") return null;
  if (b.status === "pending_payment") return { text: "Complete payment to confirm", tone: "amber" as const };
  const days = dayDiff(b.travel_date, today);
  if (days === 0) return { text: "Pickup today", tone: "green" as const };
  if (days === 1) return { text: "Pickup tomorrow", tone: "green" as const };
  if (days > 1) return { text: `Pickup in ${days} days`, tone: "blue" as const };
  return null;
}

const chipTone = {
  amber: "bg-amber-400/15 text-amber-300 ring-amber-400/25",
  green: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/25",
  blue: "bg-sky-400/15 text-sky-300 ring-sky-400/25",
} as const;

const accent: Record<BookingRow["status"], string> = {
  confirmed: "from-emerald-400 to-emerald-600",
  completed: "from-sky-400 to-blue-600",
  pending_payment: "from-amber-300 to-amber-500",
  cancelled: "from-red-400 to-red-600",
  payment_failed: "from-red-400 to-red-600",
};

function TripCard({ b, today, cab }: { b: BookingRow; today: string; cab: string }) {
  const chip = whenChip(b, today);
  const round = b.trip_type === "round_trip";
  return (
    <li>
      <article className="group relative overflow-hidden rounded-3xl border border-white/10 bg-panel shadow-[0_20px_50px_-24px_rgba(0,0,0,0.8)] transition hover:-translate-y-0.5 hover:border-brand-bright/30">
        <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1.5 bg-linear-to-b", accent[b.status])} />

        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-3.5 pl-6 sm:px-6 sm:pl-7">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-brand/12 text-brand-bright ring-1 ring-brand-bright/20">
              <CarFront className="size-[18px]" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold [overflow-wrap:anywhere]">{cab}</p>
              <p className="text-xs text-muted">
                {TRIP_TYPE_LABEL[b.trip_type]} · Ref <span className="font-mono tracking-wide">{b.ref}</span>
              </p>
            </div>
          </div>
          <span className={cn("rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide", STATUS_CLASS[b.status])}>
            {STATUS_LABEL[b.status]}
          </span>
        </div>

        {/* route */}
        <div className="grid gap-5 px-5 py-5 pl-6 sm:px-6 sm:pl-7 md:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">From</p>
                <p className="font-(family-name:--font-display) text-xl leading-tight font-extrabold [overflow-wrap:anywhere] sm:text-2xl">
                  {b.from_city}
                </p>
              </div>
              <div className="flex w-16 items-center sm:w-28" aria-hidden="true">
                <span className="size-2.5 shrink-0 rounded-full border-2 border-brand-bright" />
                <span className="relative h-px flex-1 border-t border-dashed border-white/30">
                  <CarFront className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 bg-panel px-0.5 text-brand-bright" />
                </span>
                <MapPin className="size-4 shrink-0 text-brand-bright" />
              </div>
              <div className="min-w-0 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">To</p>
                <p className="font-(family-name:--font-display) text-xl leading-tight font-extrabold [overflow-wrap:anywhere] sm:text-2xl">
                  {b.to_city}
                </p>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 text-sm sm:grid-cols-3">
              <div className="flex items-start gap-2">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-brand-bright" aria-hidden="true" />
                <div>
                  <dt className="text-[11px] text-muted">Pickup</dt>
                  <dd className="font-semibold">{formatDate(b.travel_date)}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock3 className="mt-0.5 size-4 shrink-0 text-brand-bright" aria-hidden="true" />
                <div>
                  <dt className="text-[11px] text-muted">Time</dt>
                  <dd className="font-semibold">{to12h(b.travel_time)}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Users className="mt-0.5 size-4 shrink-0 text-brand-bright" aria-hidden="true" />
                <div>
                  <dt className="text-[11px] text-muted">Passengers</dt>
                  <dd className="font-semibold">{b.passengers}</dd>
                </div>
              </div>
              {round && b.return_date ? (
                <div className="col-span-2 flex items-start gap-2 sm:col-span-3">
                  <Route className="mt-0.5 size-4 shrink-0 text-brand-bright" aria-hidden="true" />
                  <div>
                    <dt className="text-[11px] text-muted">Return</dt>
                    <dd className="font-semibold">{formatDate(b.return_date)}</dd>
                  </div>
                </div>
              ) : null}
            </dl>

            {b.pickup_address ? (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-[13px] text-white/70">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-brand-bright" aria-hidden="true" />
                <span className="[overflow-wrap:anywhere]">{b.pickup_address}</span>
              </p>
            ) : null}
          </div>

          {/* price + action */}
          <div className="flex flex-row items-center justify-between gap-4 border-t border-dashed border-white/15 pt-4 md:min-w-[170px] md:flex-col md:items-end md:justify-center md:border-t-0 md:border-l md:pl-6 md:pt-0">
            <div className="md:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Total fare</p>
              <p className="font-(family-name:--font-display) text-2xl font-extrabold">{formatINR(b.total)}</p>
            </div>
            <Link
              href={`/bookings/${b.id}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-linear-to-r from-[#22d3ee] to-brand-bright px-5 py-2.5 text-sm font-bold text-[#04202c] shadow-[0_10px_28px_-10px_rgba(34,211,238,0.7)] transition hover:brightness-110"
            >
              {b.status === "pending_payment" ? "Pay now" : "View details"}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {chip || (b.status === "confirmed" && b.driver_name) ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-white/5 bg-white/[0.02] px-5 py-2.5 pl-6 sm:px-6 sm:pl-7">
            {chip ? (
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1", chipTone[chip.tone])}>
                <Clock3 className="size-3.5" aria-hidden="true" /> {chip.text}
              </span>
            ) : null}
            {b.status === "confirmed" && b.driver_name ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/25">
                Driver: {b.driver_name}{b.cab_number ? ` · ${b.cab_number}` : ""}
              </span>
            ) : null}
          </div>
        ) : null}
      </article>
    </li>
  );
}

function Empty({ tab }: { tab: Tab }) {
  const copy: Record<Tab, string> = {
    upcoming: "No upcoming trips",
    completed: "No completed trips yet",
    cancelled: "No cancelled trips",
    all: "No bookings yet",
  };
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center">
      <span className="mb-3">
        <EmptyCarArt />
      </span>
      <h2 className="font-(family-name:--font-display) text-xl font-extrabold">{copy[tab]}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted">
        Search a route, pick a cab at a fixed fare and book your next outstation ride in a few minutes.
      </p>
      <Link
        href="/book"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-linear-to-r from-[#22d3ee] to-brand-bright px-6 py-3 text-sm font-bold text-[#04202c] shadow-[0_12px_32px_-10px_rgba(34,211,238,0.7)] transition hover:brightness-110"
      >
        <Plus className="size-4" aria-hidden="true" /> Book a Ride
      </Link>
    </div>
  );
}

/** Front view of a cab between two clouds, for an empty trip list. */
function EmptyCarArt() {
  return (
    <svg viewBox="0 0 260 130" className="h-32 w-auto drop-shadow-[0_12px_30px_rgba(34,211,238,0.3)]" aria-hidden="true">
      <path d="M10 112 Q50 80 92 112 Z" fill="#12385a" opacity=".7" />
      <path d="M170 112 Q215 78 252 112 Z" fill="#12385a" opacity=".6" />
      <path d="M18 70 q4 -12 18 -10 q8 -12 22 -4 q14 -2 16 12 z" fill="#17466f" opacity=".85" />
      <path d="M190 52 q4 -10 16 -8 q7 -10 19 -3 q12 -1 14 11 z" fill="#17466f" opacity=".8" />
      <g fill="none" stroke="#22d3ee" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M84 96 V76 Q84 70 90 62 L100 40 Q104 32 114 32 H146 Q156 32 160 40 L170 62 Q176 70 176 76 V96" />
        <path d="M94 96 H166" />
        <rect x="80" y="76" width="100" height="24" rx="9" />
        <path d="M100 62 Q130 54 160 62" />
      </g>
      <circle cx="102" cy="88" r="5" fill="#22d3ee" />
      <circle cx="158" cy="88" r="5" fill="#22d3ee" />
      <rect x="112" y="84" width="36" height="9" rx="3" fill="#22d3ee" opacity=".85" />
    </svg>
  );
}

/** A winding road ending in a map pin, for the "plan another trip" card. */
function RoadPinArt() {
  return (
    <svg viewBox="0 0 170 110" className="pointer-events-none absolute bottom-0 right-0 h-28 w-auto opacity-95" aria-hidden="true">
      <path d="M0 110 L50 60 L78 84 L112 44 L170 110 Z" fill="#0f4a73" opacity=".75" />
      <path d="M30 110 L78 70 L118 110 Z" fill="#0b3a5c" opacity=".8" />
      <path d="M58 108 C40 96 98 92 84 80 C68 68 126 66 118 52" fill="none" stroke="#22d3ee" strokeWidth="7" strokeLinecap="round" opacity=".9" />
      <path d="M58 108 C40 96 98 92 84 80 C68 68 126 66 118 52" fill="none" stroke="#06314a" strokeWidth="1.8" strokeDasharray="5 6" strokeLinecap="round" />
      <path d="M130 8 C119 8 111 17 111 27 C111 40 130 56 130 56 C130 56 149 40 149 27 C149 17 141 8 130 8 Z" fill="#22d3ee" />
      <circle cx="130" cy="27" r="7" fill="#06314a" />
    </svg>
  );
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/bookings");

  const raw = (await searchParams).tab;
  const asked = Array.isArray(raw) ? raw[0] : raw;
  const [bookings, site, profile, fleet] = await Promise.all([
    listCustomerBookings(session.customerId).catch((error) => {
      console.error("Could not load bookings", error);
      return null;
    }),
    getSite(),
    getProfile(session.customerId, session.email).catch(() => null),
    getFleet().catch(() => []),
  ]);
  // "Dzire, Etios or similar" for a Sedan booking; the plain vehicle name when the fleet has no models for it
  const cabLabel = (b: BookingRow) => {
    const vehicle = fleet.find((item) => item.title === b.vehicle_type);
    const heading = vehicle ? cabHeading(vehicle.title, vehicle.models ?? "") : { name: b.vehicle_type, similar: false };
    return heading.similar ? `${heading.name} or similar` : heading.name;
  };

  const today = todayIst();
  const list = bookings ?? [];
  const counts = { upcoming: 0, completed: 0, cancelled: 0, all: list.length };
  for (const b of list) counts[bucket(b, today)] += 1;

  const tab: Tab = TABS.some((t) => t.id === asked) ? (asked as Tab) : counts.upcoming > 0 || counts.all === 0 ? "upcoming" : "all";
  const shown = list
    .filter((b) => tab === "all" || bucket(b, today) === tab)
    .sort((a, b) => {
      const key = (x: BookingRow) => `${x.travel_date}T${x.travel_time}`;
      return tab === "upcoming" ? key(a).localeCompare(key(b)) : key(b).localeCompare(key(a));
    });

  // the name from My profile (first name), the start of the email address when none is saved yet
  const name = profile?.name.trim().split(/\s+/)[0] || session.email.split("@")[0];
  const initial = name.charAt(0).toUpperCase();

  const groups = accountGroups({ current: "trips", tab, counts });

  return (
    <AccountShell
      groups={groups}
      email={session.email}
      banner={
        <AccountBanner
          eyebrow="My trips"
          title={
            <>
              Hi, {name} <span aria-hidden="true">👋</span>
            </>
          }
          subtitle={session.email}
          initial={initial}
          stats={[
            { icon: <CalendarCheck />, value: counts.upcoming, label: "Upcoming trips" },
            { icon: <CheckCircle2 />, value: counts.completed, label: "Completed trips" },
            { icon: <Ticket />, value: counts.all, label: "Total bookings" },
          ]}
        />
      }
    >
      <div className="grid gap-6">
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid gap-5">
            {/* Filters (the sidebar has them on desktop) */}
            <nav aria-label="Trip filters" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:hidden">
              {TABS.map((t) => {
                const active = t.id === tab;
                return (
                  <Link
                    key={t.id}
                    href={t.id === "upcoming" ? "/bookings" : `/bookings?tab=${t.id}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition [&>svg]:size-4",
                      active
                        ? "border-transparent bg-linear-to-r from-[#22d3ee] to-brand-bright text-[#04202c] shadow-[0_8px_24px_-10px_rgba(34,211,238,0.8)]"
                        : "border-white/10 bg-white/[0.04] text-white/75 hover:border-white/25 hover:text-white",
                    )}
                  >
                    {t.icon}
                    {t.label}
                    <span className={cn("grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold", active ? "bg-black/15" : "bg-white/10")}>
                      {counts[t.id]}
                    </span>
                  </Link>
                );
              })}
            </nav>

            <h2 className="flex items-center gap-3 font-(family-name:--font-display) text-2xl font-extrabold">
              <span className="grid size-11 place-items-center rounded-xl bg-brand/12 text-brand-bright ring-1 ring-brand-bright/25 [&>svg]:size-5">{TABS.find((t) => t.id === tab)?.icon}</span>
              {tab === "all" ? "All Trips" : `${TABS.find((t) => t.id === tab)?.label} Trips`}
              <span className="rounded-full bg-white/10 px-3 py-0.5 text-sm font-bold text-white/75">{shown.length}</span>
            </h2>

            {bookings === null ? (
              <div role="alert" className="rounded-2xl border border-red-400/30 bg-red-400/10 p-5 text-sm text-red-200">
                We could not load your bookings right now. Please try again in a moment.
              </div>
            ) : shown.length === 0 ? (
              <Empty tab={tab} />
            ) : (
              <ul className="grid gap-4">
                {shown.map((b) => (
                  <TripCard key={b.id} b={b} today={today} cab={cabLabel(b)} />
                ))}
              </ul>
            )}
          </div>

          <aside className="grid gap-4 xl:sticky xl:top-8">
            <div className="relative overflow-hidden rounded-3xl border border-brand-bright/25 bg-linear-to-br from-[#0a3a55] via-[#0b2433] to-panel p-6">
              <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-[#22d3ee]/25 blur-3xl" />
              <RoadPinArt />
              <div className="relative flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-white/8 text-[#22d3ee] ring-1 ring-white/15">
                  <CalendarCheck className="size-5" aria-hidden="true" />
                </span>
                <h2 className="font-(family-name:--font-display) text-xl font-extrabold">Plan Another Trip?</h2>
              </div>
              <p className="relative mt-3 max-w-[15rem] text-sm text-white/75">Fixed fares, verified drivers and instant e-tickets.</p>
              <Link
                href="/book"
                className="relative mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-linear-to-r from-[#22d3ee] to-brand-bright px-7 py-3 text-sm font-bold text-[#04202c] shadow-[0_12px_32px_-10px_rgba(34,211,238,0.7)] transition hover:brightness-110"
              >
                Book a Ride <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="rounded-3xl border border-white/10 bg-panel p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-brand/12 text-brand-bright ring-1 ring-brand-bright/20">
                  <Headset className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-bold">Need Help?</h2>
                  <p className="text-xs text-muted">{site.hours}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2.5">
                <a
                  href={site.primaryPhone.href}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold transition hover:border-brand-bright/40 hover:bg-white/[0.07]"
                >
                  <Phone className="size-4 text-brand-bright" aria-hidden="true" />
                  {site.primaryPhone.display}
                </a>
                <a
                  href={whatsappLink("Hi Veera Tours & Travels, I need help with my booking.", site)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold transition hover:border-emerald-400/40 hover:bg-white/[0.07]"
                >
                  <WhatsAppIcon className="size-5 shrink-0 text-emerald-400" aria-hidden="true" />
                  Chat on WhatsApp
                </a>
              </div>
              <p className="mt-4 text-xs text-muted">
                Quote your booking reference (like <span className="font-mono">VT-XXXXXX</span>) when you contact us.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </AccountShell>
  );
}
