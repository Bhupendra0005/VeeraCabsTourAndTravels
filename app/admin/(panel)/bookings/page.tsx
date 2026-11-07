import type { Metadata } from "next";
import { CalendarCheck, Layers, Search, SlidersHorizontal } from "lucide-react";
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
import { Alert, DataTable, PageHeader, Pagination } from "@/components/admin/ui";
import { STATUS_LABEL } from "@/lib/booking/status";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { PAGE_SIZE, listBookings, pageParam } from "@/lib/server/admin/queries";

export const metadata: Metadata = { title: "Bookings" };

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const statusOptions = [
  { value: "", label: "All statuses" },
  ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
];

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdminPage("bookings.view");
  const raw = await searchParams;
  const filters = {
    q: one(raw.q),
    status: one(raw.status),
    from: one(raw.from),
    to: one(raw.to),
    page: pageParam(one(raw.page)),
  };
  const filtered = Boolean(filters.q || filters.status || filters.from || filters.to);
  const result = await listBookings(filters).catch((error) => {
    console.error("Bookings list failed", error);
    return null;
  });

  const hrefFor = (page: number) => {
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...filters, page })) if (value) q.set(key, String(value));
    return `/admin/bookings?${q.toString()}`;
  };

  return (
    <div className="grid gap-6">
      <PageHeader icon={<CalendarCheck />} title="Bookings" description="Search, review and manage every booking." />

      <FilterPanel label="Filter bookings">
        <form className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[2fr_1.2fr_1fr_1fr_auto] xl:items-start" action="/admin/bookings">
          <div>
            <FilterLabel htmlFor="f-q">Search</FilterLabel>
            <div className="group relative">
              <Search className={filterIcon} aria-hidden="true" />
              <input id="f-q" name="q" defaultValue={filters.q} maxLength={60} className={filterControl} placeholder="e.g. VT7K2M9QXA or 98765" />
            </div>
            <p className="mt-2 text-xs text-muted">Booking ID, name, phone, email or city</p>
          </div>

          <div>
            <FilterLabel htmlFor="f-status">Status</FilterLabel>
            <SelectMenu id="f-status" name="status" size="lg" icon={<Layers />} options={statusOptions} defaultValue={filters.status ?? ""} />
          </div>

          <div>
            <FilterLabel htmlFor="f-from">Travel from</FilterLabel>
            <DatePicker id="f-from" name="from" defaultValue={filters.from} placeholder="dd-mm-yyyy" />
          </div>

          <div>
            <FilterLabel htmlFor="f-to">Travel to</FilterLabel>
            <DatePicker id="f-to" name="to" defaultValue={filters.to} placeholder="dd-mm-yyyy" align="right" />
          </div>

          <FilterButtons
            resetHref="/admin/bookings"
            submitIcon={<SlidersHorizontal aria-hidden="true" />}
            className="sm:col-span-2 xl:col-span-1 xl:pt-[29px]"
          />
        </form>
      </FilterPanel>

      {!result ? (
        <Alert tone="danger">Could not load bookings. Please refresh in a moment.</Alert>
      ) : result.rows.length === 0 ? (
        <EmptyPanel
          art={<CalendarCarArt />}
          title={filtered ? "No bookings match" : "No bookings yet"}
          text={
            filtered
              ? "Try clearing the filters or change your search criteria."
              : "New bookings from the website will show up here."
          }
          action={filtered ? <ClearFiltersLink href="/admin/bookings" /> : null}
        />
      ) : (
        <>
          <p className="-mb-2 text-sm text-muted">
            <b className="text-white">{result.total}</b> {result.total === 1 ? "booking" : "bookings"}
            {filtered ? " match your filters" : " in total"}
          </p>
          <DataTable
            rows={result.rows}
            rowKey={(b) => b.id}
            columns={[
              { header: "Booking", primary: true, cell: (b) => <BookingRoute booking={b} /> },
              { header: "Status", cell: (b) => <StatusBadge status={b.status} /> },
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
            ]}
          />
          <Pagination page={filters.page} pageSize={PAGE_SIZE} total={result.total} hrefFor={hrefFor} />
        </>
      )}
    </div>
  );
}
