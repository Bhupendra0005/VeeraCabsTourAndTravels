import type { Metadata } from "next";
import { CalendarCheck, Eye, Globe, Layers, PhoneCall, Route, Search, SlidersHorizontal } from "lucide-react";
import { BookingRoute, StatusBadge, TripWhen, money } from "@/components/admin/booking-bits";
import {
  CalendarCarArt,
  ClearFiltersLink,
  EmptyPanel,
  FilterButtons,
  FilterLabel,
  FilterPanel,
  filterControl,
  filterIcon,
} from "@/components/admin/list-parts";
import { DatePicker, SelectMenu } from "@/components/admin/pickers";
import { Alert, Badge, ButtonLink, DataTable, PageHeader, Pagination } from "@/components/admin/ui";
import Link from "next/link";
import { can } from "@/lib/admin/permissions";
import { STATUS_LABEL } from "@/lib/booking/status";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { PAGE_SIZE, countBookingViews, isBookingView, listBookings, pageParam, todayIst, type BookingView } from "@/lib/server/admin/queries";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Bookings" };

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const statusOptions = [
  { value: "", label: "All statuses" },
  ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
];

const tripOptions = [
  { value: "", label: "All trips" },
  { value: "one_way", label: "Outstation one-way" },
  { value: "round_trip", label: "Outstation round trip" },
  { value: "airport", label: "Airport (pickup + drop)" },
  { value: "airport_pickup", label: "Airport pickup" },
  { value: "airport_drop", label: "Airport drop" },
  { value: "hourly", label: "Local (hourly rental)" },
];

const sourceOptions = [
  { value: "", label: "Online + phone" },
  { value: "online", label: "Booked online" },
  { value: "phone", label: "Phone bookings" },
];

/** The chips above the list. `tone` colours the one that asks for action. */
const VIEW_CHIPS: { view: BookingView | ""; label: string; tone?: "warn" }[] = [
  { view: "", label: "All bookings" },
  { view: "upcoming", label: "Upcoming" },
  { view: "today", label: "Today" },
  { view: "tomorrow", label: "Tomorrow" },
  { view: "no_driver", label: "Needs a driver", tone: "warn" },
  { view: "booked_today", label: "Booked today" },
  { view: "past", label: "Past trips" },
  { view: "unpaid", label: "Unpaid / abandoned" },
  { view: "cancelled", label: "Cancelled" },
];

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const admin = await requireAdminPage("bookings.view");
  const raw = await searchParams;
  // old links (dashboard, bookmarks) use driver=none for "Needs a driver"
  const rawView = one(raw.driver) === "none" ? "no_driver" : one(raw.view);
  const explicitView = isBookingView(rawView) || rawView === "all";
  const anyField = Boolean(one(raw.q) || one(raw.status) || one(raw.trip) || one(raw.source) || one(raw.from) || one(raw.to));
  // opening the page shows the upcoming trips; a search or filter from there looks through every booking
  const view: BookingView | undefined = isBookingView(rawView) ? rawView : explicitView || anyField ? undefined : "upcoming";
  const viewKey = view ?? "all";
  const filters = {
    q: one(raw.q),
    view,
    status: one(raw.status),
    trip: one(raw.trip),
    source: one(raw.source),
    from: one(raw.from),
    to: one(raw.to),
    page: pageParam(one(raw.page)),
  };
  const filtered = Boolean(filters.q || filters.view || filters.status || filters.trip || filters.source || filters.from || filters.to);
  const [result, viewCounts] = await Promise.all([
    listBookings(filters).catch((error) => {
      console.error("Bookings list failed", error);
      return null;
    }),
    countBookingViews().catch((error) => {
      console.error("Booking view counts failed", error);
      return {} as Partial<Record<BookingView, number>>;
    }),
  ]);

  const hrefFor = (page: number) => {
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...filters, view: viewKey, page })) if (value) q.set(key, String(value));
    return `/admin/bookings?${q.toString()}`;
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader
        icon={<CalendarCheck />}
        title="Bookings"
        description="Search, review and manage every booking."
        actions={
          can(admin.role, "bookings.manage") ? (
            <ButtonLink href="/admin/bookings/new">
              <PhoneCall aria-hidden="true" /> New phone booking
            </ButtonLink>
          ) : null
        }
      />

      <FilterPanel label="Filter bookings">
        <form className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-4 lg:grid-cols-4 lg:items-start [&>div]:min-w-0" action="/admin/bookings">
          {/* the chosen quick view stays on when the filters are applied */}
          {explicitView ? <input type="hidden" name="view" value={viewKey} /> : null}
          <div className="col-span-2 lg:col-span-1">
            <FilterLabel htmlFor="f-q">Search</FilterLabel>
            <div className="group relative">
              <Search className={filterIcon} aria-hidden="true" />
              <input id="f-q" name="q" defaultValue={filters.q} maxLength={60} className={filterControl} placeholder="e.g. VT7K2M9QXA or 98765" />
            </div>
            <p className="pt-2 text-xs text-muted">Booking ID, name, phone, email or city</p>
          </div>

          <div>
            <FilterLabel htmlFor="f-status">Status</FilterLabel>
            <SelectMenu id="f-status" name="status" size="lg" icon={<Layers />} options={statusOptions} defaultValue={filters.status ?? ""} />
          </div>

          <div>
            <FilterLabel htmlFor="f-trip">Trip type</FilterLabel>
            <SelectMenu id="f-trip" name="trip" size="lg" icon={<Route />} options={tripOptions} defaultValue={filters.trip ?? ""} />
          </div>

          <div>
            <FilterLabel htmlFor="f-source">Booked by</FilterLabel>
            <SelectMenu id="f-source" name="source" size="lg" icon={<Globe />} options={sourceOptions} defaultValue={filters.source ?? ""} />
          </div>

          <div>
            <FilterLabel htmlFor="f-from">Travel from</FilterLabel>
            <DatePicker id="f-from" name="from" defaultValue={filters.from} placeholder="Any date" />
          </div>

          <div>
            <FilterLabel htmlFor="f-to">Travel to</FilterLabel>
            <DatePicker id="f-to" name="to" defaultValue={filters.to} placeholder="Any date" align="right" />
          </div>

          <FilterButtons
            resetHref={`/admin/bookings?view=${viewKey}`}
            submitIcon={<SlidersHorizontal aria-hidden="true" />}
            className="col-span-2 lg:justify-end lg:pt-[29px]"
          />
        </form>
      </FilterPanel>

      <nav className="flex flex-wrap gap-2" aria-label="Quick views">
        {VIEW_CHIPS.map((chip) => {
          const active = viewKey === (chip.view || "all");
          const count = chip.view ? viewCounts[chip.view] : undefined;
          return (
            <Link
              key={chip.view || "all"}
              href={`/admin/bookings?view=${chip.view || "all"}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold",
                active
                  ? chip.tone === "warn"
                    ? "border-amber-400 bg-amber-400/15 text-white"
                    : "border-brand bg-brand/15 text-white"
                  : "border-line text-muted hover:text-white",
              )}
            >
              {chip.label}
              {count !== undefined ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs tabular-nums",
                    chip.tone === "warn" && count > 0 ? "bg-amber-400/20 text-amber-300" : "bg-white/10 text-white/80",
                  )}
                >
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>


      {!result ? (
        <Alert tone="danger">Could not load bookings. Please refresh in a moment.</Alert>
      ) : result.rows.length === 0 ? (
        <EmptyPanel
          art={<CalendarCarArt />}
          title={view === "upcoming" && !anyField ? "No upcoming trips" : filtered ? "No bookings match" : "No bookings yet"}
          text={
            view === "upcoming" && !anyField
              ? "Confirmed trips from today on show up here. Open All bookings to see older ones."
              : filtered
                ? "Try clearing the filters or change your search criteria."
                : "New bookings from the website will show up here."
          }
          action={filtered ? <ClearFiltersLink href="/admin/bookings?view=all" /> : null}
        />
      ) : (
        <>
          <p className="-mb-2 text-sm text-muted">
            <b className="text-white">{result.total}</b> {result.total === 1 ? "booking" : "bookings"}
            {/* a quick view on its own is not a "filter": its chip already says what is listed */}
            {anyField ? (result.total === 1 ? " matches your filters" : " match your filters") : view ? " in this view" : " in total"}
          </p>
          <DataTable
            rows={result.rows}
            rowKey={(b) => b.id}
            columns={[
              { header: "Booking", primary: true, cell: (b) => <BookingRoute booking={b} /> },
              {
                header: "Status",
                cell: (b) => (
                  <span className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={b.status} />
                    {b.status === "confirmed" && !b.driver_name && b.travel_date >= todayIst() ? <Badge tone="warning">no driver</Badge> : null}
                  </span>
                ),
              },
              { header: "Travel", cell: (b) => <TripWhen booking={b} /> },
              {
                header: "Traveller",
                cell: (b) => (
                  <span>
                    {b.traveller_name}
                    <br />
                    <span className="text-xs text-muted">+91 {b.traveller_phone}</span>
                  </span>
                ),
              },
              { header: "Total", align: "right", cell: (b) => money(b.total) },
              {
                header: "",
                align: "right",
                cell: (b) => (
                  <ButtonLink href={`/admin/bookings/${b.id}`} variant="secondary" size="sm">
                    <Eye aria-hidden="true" /> View
                  </ButtonLink>
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
