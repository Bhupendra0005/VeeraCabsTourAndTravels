import type { Metadata } from "next";
import { ArrowUpDown, CheckCircle2, Clock, Layers, ListFilter, MapPin, Milestone, Pencil, Plus, Route, Search } from "lucide-react";
import Link from "next/link";
import {
  CalendarCarArt,
  ClearFiltersLink,
  EmptyPanel,
  FilterButtons,
  FilterLabel,
  FilterPanel,
  StatTile,
  filterControl,
  filterIcon,
} from "@/components/admin/list-parts";
import { SelectMenu } from "@/components/admin/pickers";
import { vehicleIcon } from "@/components/admin/vehicle-icon";
import { Alert, ButtonLink, DataTable, PageHeader } from "@/components/admin/ui";
import { formatINR } from "@/lib/booking/config";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { db } from "@/lib/server/core/db";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Routes & fares" };

type RouteRow = {
  id: string;
  from_city: string;
  to_city: string;
  distance_km: number;
  duration_hours: number;
  active: boolean;
  route_fares: { vehicle_type: string; fare_one_way: number }[];
};

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const statusOptions = [
  { value: "", label: "All status" },
  { value: "bookable", label: "Bookable" },
  { value: "off", label: "Off" },
];

const sortOptions = [
  { value: "", label: "Name (A to Z)" },
  { value: "distance_asc", label: "Distance (Low to High)" },
  { value: "distance_desc", label: "Distance (High to Low)" },
  { value: "fare_asc", label: "Starting fare (Low to High)" },
];

const minFare = (r: RouteRow) => (r.route_fares.length ? Math.min(...r.route_fares.map((f) => f.fare_one_way)) : Number.POSITIVE_INFINITY);
const hrs = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} hrs`;

function FareChips({ route }: { route: RouteRow }) {
  if (route.route_fares.length === 0) {
    return <span className="inline-block rounded-lg bg-amber-400/10 px-2.5 py-1.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-400/20">No fares set</span>;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {route.route_fares
        .slice()
        .sort((a, b) => a.fare_one_way - b.fare_one_way)
        .map((f) => (
          <li
            key={f.vehicle_type}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-2.5 py-1.5 [&_svg]:size-4 [&_svg]:text-brand-bright"
          >
            {vehicleIcon(f.vehicle_type)}
            <span className="leading-tight">
              <span className="block text-[11px] text-muted">{f.vehicle_type}</span>
              <b className="block text-[13px]">{formatINR(f.fare_one_way)}</b>
            </span>
          </li>
        ))}
    </ul>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1",
        active ? "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25" : "bg-white/6 text-white/60 ring-white/10",
      )}
    >
      <span className={cn("size-1.5 rounded-full", active ? "bg-emerald-400" : "bg-white/40")} aria-hidden="true" />
      {active ? "Bookable" : "Off"}
    </span>
  );
}

export default async function AdminRoutesPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdminPage("routes.manage");
  const params = await searchParams;
  const q = (one(params.q) ?? "").trim().slice(0, 60);
  const status = one(params.status) ?? "";
  const sort = one(params.sort) ?? "";
  const filtered = Boolean(q || status || sort);

  const { data, error } = await db()
    .from("routes")
    .select("id, from_city, to_city, distance_km, duration_hours, active, route_fares(vehicle_type, fare_one_way)")
    .order("from_city")
    .order("to_city");
  if (error) console.error("Routes list failed", error);
  const all = (data ?? []) as unknown as RouteRow[];

  const needle = q.toLowerCase();
  const routes = all
    .filter((r) => !needle || `${r.from_city} ${r.to_city}`.toLowerCase().includes(needle))
    .filter((r) => (status === "bookable" ? r.active : status === "off" ? !r.active : true))
    .sort((a, b) => {
      if (sort === "distance_asc") return a.distance_km - b.distance_km;
      if (sort === "distance_desc") return b.distance_km - a.distance_km;
      if (sort === "fare_asc") return minFare(a) - minFare(b);
      return 0; // already ordered by name
    });

  const bookable = all.filter((r) => r.active).length;
  const totalKm = all.reduce((sum, r) => sum + Number(r.distance_km), 0);
  const avgHours = all.length ? all.reduce((sum, r) => sum + Number(r.duration_hours), 0) / all.length : 0;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader
        icon={<Route />}
        title="Routes & fares"
        description="Fixed-fare routes customers can book online. Each route has one fare per vehicle."
        actions={
          <ButtonLink href="/admin/routes/new" className="shadow-[0_10px_28px_-10px_rgba(0,150,219,0.8)]">
            <Plus aria-hidden="true" /> Add route
          </ButtonLink>
        }
      />
      {params.deleted ? <Alert tone="success">Route deleted.</Alert> : null}
      {error ? <Alert tone="danger">Could not load routes. Please refresh.</Alert> : null}

      {all.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatTile tone="blue" icon={<MapPin />} label="Total routes" value={all.length} />
          <StatTile tone="green" icon={<CheckCircle2 />} label="Bookable routes" value={bookable} />
          <StatTile tone="violet" icon={<Milestone />} label="Total distance" value={`${totalKm.toLocaleString("en-IN")} km`} />
          <StatTile tone="amber" icon={<Clock />} label="Avg. travel time" value={`~${avgHours.toFixed(1)} hrs`} />
        </div>
      ) : null}

      {all.length > 0 ? (
        <FilterPanel label="Filter routes">
          <form action="/admin/routes" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1.2fr_auto] xl:items-end">
            <div>
              <FilterLabel htmlFor="r-q">Search</FilterLabel>
              <div className="group relative">
                <Search className={filterIcon} aria-hidden="true" />
                <input id="r-q" name="q" defaultValue={q} maxLength={60} className={filterControl} placeholder="Search route (e.g. Pune, Mumbai, Goa...)" />
              </div>
            </div>
            <div>
              <FilterLabel htmlFor="r-status">Status</FilterLabel>
              <SelectMenu id="r-status" name="status" size="lg" icon={<Layers />} options={statusOptions} defaultValue={status} />
            </div>
            <div>
              <FilterLabel htmlFor="r-sort">Sort by</FilterLabel>
              <SelectMenu id="r-sort" name="sort" size="lg" icon={<ArrowUpDown />} options={sortOptions} defaultValue={sort} />
            </div>
            <FilterButtons resetHref="/admin/routes" submitIcon={<ListFilter aria-hidden="true" />} className="sm:col-span-2 xl:col-span-1" />
          </form>
        </FilterPanel>
      ) : null}

      {routes.length === 0 && !error ? (
        <EmptyPanel
          art={<CalendarCarArt />}
          title={filtered ? "No routes match" : "No routes yet"}
          text={filtered ? "Try a different search or clear the filters." : "Add your first route to start taking online bookings."}
          action={
            filtered ? (
              <ClearFiltersLink href="/admin/routes" />
            ) : (
              <ButtonLink href="/admin/routes/new">
                <Plus aria-hidden="true" /> Add route
              </ButtonLink>
            )
          }
        />
      ) : (
        <DataTable
          rows={routes}
          rowKey={(r) => r.id}
          columns={[
            {
              header: "Route",
              primary: true,
              cell: (r) => (
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-linear-to-br from-brand/25 to-brand/5 text-brand-bright ring-1 ring-brand-bright/20">
                    <Route className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <Link href={`/admin/routes/${r.id}`} className="font-semibold wrap-anywhere hover:text-brand-bright hover:underline">
                      {r.from_city} to {r.to_city}
                    </Link>
                    <span className="block text-xs font-normal text-muted">{r.route_fares.length ? `From ${formatINR(minFare(r))}` : "No fares set"}</span>
                  </span>
                </span>
              ),
            },
            {
              header: "Distance & time",
              cell: (r) => (
                <span className="grid gap-1 whitespace-nowrap text-sm text-white/85">
                  <span className="flex items-center gap-2">
                    <Milestone className="size-4 text-white/45" aria-hidden="true" /> {Number(r.distance_km).toLocaleString("en-IN")} km
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="size-4 text-white/45" aria-hidden="true" /> ~{hrs(Number(r.duration_hours))}
                  </span>
                </span>
              ),
            },
            { header: "One-way fares", cell: (r) => <FareChips route={r} /> },
            { header: "Status", cell: (r) => <StatusPill active={r.active} /> },
            {
              header: "",
              align: "right",
              cell: (r) => (
                <ButtonLink href={`/admin/routes/${r.id}`} variant="secondary" size="sm" aria-label={`Edit ${r.from_city} to ${r.to_city}`}>
                  <Pencil aria-hidden="true" /> Edit
                </ButtonLink>
              ),
            },
          ]}
          card={(r) => (
            <div className={cn("flex h-full flex-col rounded-2xl border bg-panel p-4 sm:p-5", r.active ? "border-line" : "border-dashed border-white/15 opacity-85")}>
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-linear-to-br from-brand/25 to-brand/5 text-brand-bright ring-1 ring-brand-bright/20">
                  <Route className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/routes/${r.id}`} className="font-(family-name:--font-display) text-lg leading-snug font-bold wrap-anywhere hover:text-brand-bright">
                    {r.from_city} to {r.to_city}
                  </Link>
                  <div className="mt-1">
                    <StatusPill active={r.active} />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="min-w-0 rounded-xl border border-line bg-white/3 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                    <Milestone className="size-3.5" aria-hidden="true" /> Distance
                  </div>
                  <div className="mt-1 font-(family-name:--font-display) text-lg font-bold">{Number(r.distance_km).toLocaleString("en-IN")} km</div>
                </div>
                <div className="min-w-0 rounded-xl border border-line bg-white/3 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                    <Clock className="size-3.5" aria-hidden="true" /> Drive time
                  </div>
                  <div className="mt-1 font-(family-name:--font-display) text-lg font-bold">~{hrs(Number(r.duration_hours))}</div>
                </div>
              </div>

              <div className="mt-4 flex-1">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">One-way fares</div>
                <FareChips route={r} />
              </div>

              <div className="mt-4 border-t border-line pt-4">
                <ButtonLink href={`/admin/routes/${r.id}`} variant="secondary" size="sm" className="min-h-10 w-full sm:w-auto">
                  <Pencil aria-hidden="true" /> Edit route
                </ButtonLink>
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}
