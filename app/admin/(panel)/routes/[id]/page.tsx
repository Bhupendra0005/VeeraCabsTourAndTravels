import type { Metadata } from "next";
import { ArrowLeft, CarFront, Clock, IndianRupee, MapPin, Milestone, Navigation, Route, Ticket } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, PageHeader } from "@/components/admin/ui";
import { RouteForm } from "@/components/admin/route-form";
import { formatINR } from "@/lib/booking/config";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { getFleetAll } from "@/lib/server/cms/content";
import { db } from "@/lib/server/core/db";
import { isUuid } from "@/lib/server/core/validate";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Edit route" };

const rupees = (paise: number | null) => (paise === null ? "" : String(paise / 100));

function Chip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-3.5 py-2.5 backdrop-blur">
      <span className="grid size-9 place-items-center rounded-lg bg-brand/12 text-brand-bright ring-1 ring-brand-bright/20 [&>svg]:size-4">{icon}</span>
      <div>
        <p className="text-[11px] text-white/55">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}

export default async function EditRoutePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("routes.manage");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const query = await searchParams;

  const { data: route, error } = await db()
    .from("routes")
    .select("id, from_city, to_city, distance_km, duration_hours, active, route_fares(vehicle_type, fare_one_way, fare_round_trip)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!route) notFound();

  const fareList = route.route_fares as { vehicle_type: string; fare_one_way: number; fare_round_trip: number | null }[];
  const existing = new Map(fareList.map((f) => [f.vehicle_type, f]));
  const fleet = await getFleetAll();
  const titles = new Set(fleet.map((v) => v.title));
  const rows = [
    ...fleet.map((v) => ({ vehicle: v.title, photo: v.photo, hidden: !v.active })),
    // fares for a vehicle that was later removed from the fleet stay visible so they are not lost silently
    ...[...existing.keys()].filter((name) => !titles.has(name)).map((name) => ({ vehicle: name, hidden: true })),
  ];

  const startFare = fareList.length ? Math.min(...fareList.map((f) => f.fare_one_way)) : null;

  return (
    <div className="grid max-w-5xl gap-6">
      <div className="grid gap-4">
        <Link href="/admin/routes" className="inline-flex w-fit items-center gap-1.5 rounded-lg py-1 pr-2 text-sm text-muted transition hover:text-white">
          <ArrowLeft className="size-4" aria-hidden="true" /> Routes &amp; fares
        </Link>
        <PageHeader icon={<Route />} title={`${route.from_city} to ${route.to_city}`} description="Edit the route details and fares." />
      </div>

      {query.created ? <Alert tone="success">Route created. You can adjust it below.</Alert> : null}

      {/* Route summary */}
      <section className="relative overflow-hidden rounded-2xl border border-brand-bright/25 bg-linear-to-br from-[#0a2a3d] via-[#0b1a24] to-panel p-5 sm:p-6">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-brand/20 blur-[80px]" />
        <div className="relative grid gap-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">
                <Navigation className="size-3" aria-hidden="true" /> From
              </p>
              <p className="font-(family-name:--font-display) text-2xl leading-tight font-extrabold wrap-anywhere sm:text-4xl">{route.from_city}</p>
            </div>
            <div className="flex w-20 items-center sm:w-44" aria-hidden="true">
              <span className="size-2.5 shrink-0 rounded-full border-2 border-brand-bright" />
              <span className="relative h-px flex-1 border-t border-dashed border-white/35">
                <CarFront className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 bg-[#0b1a24] px-0.5 text-brand-bright" />
              </span>
              <MapPin className="size-5 shrink-0 text-brand-bright" />
            </div>
            <div className="min-w-0 text-right">
              <p className="flex items-center justify-end gap-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">
                To <MapPin className="size-3" aria-hidden="true" />
              </p>
              <p className="font-(family-name:--font-display) text-2xl leading-tight font-extrabold wrap-anywhere sm:text-4xl">{route.to_city}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Chip icon={<Milestone />} label="Distance" value={`${Number(route.distance_km).toLocaleString("en-IN")} km`} />
            <Chip icon={<Clock />} label="Drive time" value={`~${Number(route.duration_hours)} hrs`} />
            <Chip icon={<Ticket />} label="Vehicles priced" value={`${fareList.length} of ${rows.length}`} />
            <Chip icon={<IndianRupee />} label="Starting fare" value={startFare === null ? "Not set" : formatINR(startFare)} />
            <span
              className={cn(
                "inline-flex items-center gap-2 self-center rounded-full px-4 py-2 text-xs font-bold ring-1",
                route.active ? "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25" : "bg-white/6 text-white/60 ring-white/10",
              )}
            >
              <span className={cn("size-2 rounded-full", route.active ? "bg-emerald-400" : "bg-white/40")} aria-hidden="true" />
              {route.active ? "Bookable online" : "Hidden from booking"}
            </span>
          </div>
        </div>
      </section>

      <RouteForm
        route={{
          id: route.id,
          fromCity: route.from_city,
          toCity: route.to_city,
          distanceKm: route.distance_km,
          durationHours: Number(route.duration_hours),
          active: route.active,
        }}
        fares={rows.map((r) => ({
          ...r,
          oneWay: rupees(existing.get(r.vehicle)?.fare_one_way ?? null),
          roundTrip: rupees(existing.get(r.vehicle)?.fare_round_trip ?? null),
        }))}
      />
    </div>
  );
}
