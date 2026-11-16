import type { Metadata } from "next";
import { ArrowLeft, CalendarClock, CarFront, CheckCheck, CircleCheck, IndianRupee, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingRoute, StatusBadge, TripWhen, money } from "@/components/admin/booking-bits";
import { EditDriverButton } from "@/components/admin/edit-driver";
import { StatTile } from "@/components/admin/list-parts";
import { Badge, Card, DataTable, EmptyState } from "@/components/admin/ui";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { can } from "@/lib/admin/permissions";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { getDriverWithTrips, todayIst } from "@/lib/server/admin/queries";
import { isUuid } from "@/lib/server/core/validate";

export const metadata: Metadata = { title: "Driver" };

export default async function AdminDriverPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdminPage("bookings.view");
  const { id } = await params;
  const flags = await searchParams;
  if (!isUuid(id)) notFound();
  const found = await getDriverWithTrips(id);
  if (!found) notFound();
  const { driver, trips } = found;
  const today = todayIst();
  const counted = trips.filter((t) => t.status === "confirmed" || t.status === "completed");
  const upcoming = counted.filter((t) => t.status === "confirmed" && t.travel_date >= today);
  const done = counted.length - upcoming.length;
  const business = counted.reduce((sum, t) => sum + t.total, 0);
  const canManage = can(admin.role, "bookings.manage");

  return (
    <div className="grid max-w-5xl grid-cols-[minmax(0,1fr)] gap-6">
      <Link href="/admin/drivers" className="inline-flex w-fit items-center gap-1.5 rounded-lg py-1.5 pr-2 text-sm text-muted transition hover:text-white">
        <ArrowLeft className="size-4" aria-hidden="true" /> Back to Drivers
      </Link>
      {flags.created ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          <CircleCheck className="size-5 shrink-0" aria-hidden="true" />
          <p>Driver added. You can now pick them when assigning a trip.</p>
        </div>
      ) : null}

      <section className="relative overflow-hidden rounded-3xl border border-brand-bright/25 bg-linear-to-br from-[#0c1a24] via-panel to-panel p-5 shadow-[0_0_50px_-20px_rgba(0,150,219,0.5)] sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-brand opacity-[0.12] blur-3xl" />
        {canManage ? (
          <div className="relative z-10 mb-4 flex justify-end sm:absolute sm:right-5 sm:top-5 sm:mb-0">
            <EditDriverButton
              driver={{ id: driver.id, name: driver.name, phone: driver.phone, cabNumber: driver.cab_number, cabModel: driver.cab_model, note: driver.note, active: driver.active }}
            />
          </div>
        ) : null}
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <span
            className={`grid size-20 shrink-0 place-items-center rounded-full font-(family-name:--font-display) text-3xl font-bold text-white ${
              driver.active ? "bg-linear-to-br from-emerald-400 to-brand shadow-[0_10px_28px_-8px_rgba(52,211,153,0.8)]" : "bg-white/10 text-white/60"
            }`}
          >
            {driver.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-(family-name:--font-display) text-2xl font-bold wrap-anywhere sm:text-3xl">{driver.name}</h1>
              <Badge tone={driver.active ? "success" : "neutral"}>{driver.active ? "active" : "switched off"}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={`tel:+91${driver.phone}`}
                className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm font-medium ring-1 ring-white/10 transition hover:bg-white/10 hover:text-brand-bright"
              >
                <Phone className="size-4" aria-hidden="true" /> +91 {driver.phone}
              </a>
              <a
                href={`https://wa.me/91${driver.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-400/10 px-3 py-2 text-sm font-medium text-emerald-300 ring-1 ring-emerald-400/20 transition hover:bg-emerald-400/20"
              >
                <WhatsAppIcon className="size-4" aria-hidden="true" /> WhatsApp
              </a>
              {driver.cab_number ? (
                <span className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10">
                  <CarFront className="size-4 text-brand-bright" aria-hidden="true" />
                  <b className="tracking-wide">{driver.cab_number}</b>
                  {driver.cab_model ? <span className="text-muted">· {driver.cab_model}</span> : null}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-muted ring-1 ring-white/10">
                  <CarFront className="size-4" aria-hidden="true" /> No cab saved
                </span>
              )}
            </div>
            {driver.note ? <div className="mt-3 max-w-2xl whitespace-pre-line text-sm text-muted wrap-anywhere">{driver.note}</div> : null}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatTile tone="amber" icon={<CalendarClock />} label="Upcoming trips" value={upcoming.length} hint="Confirmed, not done yet" />
        <StatTile tone="green" icon={<CheckCheck />} label="Completed trips" value={done} />
        <StatTile tone="violet" icon={<IndianRupee />} label="Business done" value={money(business)} hint="Total fare, not pay" />
      </div>

      <Card title="Trips" description="Every trip given to this driver, newest first.">
        {trips.length === 0 ? (
          <EmptyState bare icon={<CarFront />} title="No trips yet">
            Assign this driver from a booking page and the trip will show up here.
          </EmptyState>
        ) : (
          <DataTable
            rows={trips}
            rowKey={(t) => t.id}
            columns={[
              { header: "Booking", primary: true, cell: (t) => <BookingRoute booking={t} /> },
              { header: "Status", cell: (t) => <StatusBadge status={t.status} /> },
              { header: "Travel", cell: (t) => <TripWhen booking={t} /> },
              { header: "Total", align: "right", cell: (t) => money(t.total) },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
