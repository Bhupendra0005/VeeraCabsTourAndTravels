import type { Metadata } from "next";
import { CalendarCheck, CalendarDays, ChevronRight, CalendarPlus, IndianRupee, Search, Users } from "lucide-react";
import Link from "next/link";
import { money } from "@/components/admin/booking-bits";
import {
  ClearFiltersLink,
  EmptyPanel,
  FilterButtons,
  FilterLabel,
  FilterPanel,
  PeopleArt,
  StatTile,
  filterControl,
  filterIcon,
} from "@/components/admin/list-parts";
import { Alert, DataTable, PageHeader, Pagination } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { PAGE_SIZE, getCustomerTotals, listCustomers, pageParam } from "@/lib/server/admin/queries";

export const metadata: Metadata = { title: "Customers" };

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const joined = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdminPage("customers.view");
  const raw = await searchParams;
  const filters = { q: one(raw.q), page: pageParam(one(raw.page)) };
  const filtered = Boolean(filters.q);

  const [result, totals] = await Promise.all([
    listCustomers(filters).catch((error) => {
      console.error("Customers list failed", error);
      return null;
    }),
    getCustomerTotals().catch((error) => {
      console.error("Customer totals failed", error);
      return null;
    }),
  ]);

  const hrefFor = (page: number) => {
    const q = new URLSearchParams({ page: String(page) });
    if (filters.q) q.set("q", filters.q);
    return `/admin/customers?${q.toString()}`;
  };

  return (
    <div className="grid gap-6">
      <PageHeader icon={<Users />} title="Customers" description="People who have registered and booked with you." />

      {totals ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatTile tone="blue" icon={<Users />} label="Total customers" value={totals.total} />
          <StatTile tone="green" icon={<CalendarCheck />} label="With bookings" value={totals.withBookings} />
          <StatTile tone="violet" icon={<IndianRupee />} label="Total spent" value={money(totals.spent)} />
          <StatTile tone="amber" icon={<CalendarPlus />} label="Joined this month" value={totals.joinedThisMonth} />
        </div>
      ) : null}

      <FilterPanel label="Search customers">
        <form action="/admin/customers" className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <FilterLabel htmlFor="c-q">Search by email</FilterLabel>
            <div className="group relative">
              <Search className={filterIcon} aria-hidden="true" />
              <input id="c-q" name="q" defaultValue={filters.q} maxLength={60} className={filterControl} placeholder="Enter customer email..." />
            </div>
          </div>
          <FilterButtons resetHref="/admin/customers" submitLabel="Search" submitIcon={<Search aria-hidden="true" />} />
        </form>
      </FilterPanel>

      {!result ? (
        <Alert tone="danger">Could not load customers. Please refresh in a moment.</Alert>
      ) : result.rows.length === 0 ? (
        <EmptyPanel
          art={<PeopleArt />}
          title={filtered ? "No customers match" : "No customers yet"}
          text={filtered ? "Try a different email or clear the search." : "Customers appear here after they sign in to book."}
          action={filtered ? <ClearFiltersLink href="/admin/customers" label="Clear search" /> : null}
        />
      ) : (
        <>
          <DataTable
            rows={result.rows}
            rowKey={(c) => c.id}
            columns={[
              {
                header: "Customer",
                primary: true,
                cell: (c) => (
                  <Link href={`/admin/customers/${c.id}`} className="group flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-linear-to-br from-violet-400 to-brand text-sm font-bold text-white shadow-[0_6px_16px_-6px_rgba(139,92,246,0.8)]">
                      {c.email.charAt(0).toUpperCase()}
                    </span>
                    <span className="font-semibold group-hover:text-brand-bright group-hover:underline">{c.email}</span>
                    {c.blocked ? <span className="ml-2 rounded-full bg-red-400/15 px-2 py-0.5 text-xs font-bold uppercase text-red-300">blocked</span> : null}
                  </Link>
                ),
              },
              {
                header: "Bookings",
                cell: (c) => (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-400/10 px-2.5 py-1 text-xs font-bold text-sky-300 ring-1 ring-sky-400/20">
                    <CalendarCheck className="size-3.5" aria-hidden="true" /> {c.bookings}
                  </span>
                ),
              },
              {
                header: "Paid so far",
                cell: (c) => (
                  <span className="inline-flex items-center rounded-lg bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/20">
                    {money(c.spent)}
                  </span>
                ),
              },
              {
                header: "Joined on",
                cell: (c) => (
                  <span className="inline-flex items-center gap-2 text-white/80">
                    <CalendarDays className="size-4 text-white/45" aria-hidden="true" /> {joined(c.created_at)}
                  </span>
                ),
              },
              {
                header: "Details",
                align: "right",
                cell: (c) => (
                  <Link
                    href={`/admin/customers/${c.id}`}
                    aria-label={`View ${c.email}`}
                    className="inline-grid size-9 place-items-center rounded-lg border border-white/10 bg-white/4 text-white/70 transition hover:border-brand-bright/40 hover:text-white"
                  >
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
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
