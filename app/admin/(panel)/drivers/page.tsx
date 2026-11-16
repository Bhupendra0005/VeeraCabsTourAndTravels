import type { Metadata } from "next";
import { ArrowRight, CalendarClock, CarFront, CheckCheck, IdCard, IndianRupee, Phone, UserRoundCheck, Users } from "lucide-react";
import Link from "next/link";
import { AddDriverButton } from "@/components/admin/add-driver";
import { money } from "@/components/admin/booking-bits";
import { StatTile } from "@/components/admin/list-parts";
import { Alert, Badge, ButtonLink, DataTable, PageHeader } from "@/components/admin/ui";
import { can } from "@/lib/admin/permissions";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { listDrivers } from "@/lib/server/admin/queries";

export const metadata: Metadata = { title: "Drivers" };

export default async function AdminDriversPage() {
  const admin = await requireAdminPage("bookings.view");
  const drivers = await listDrivers().catch((error) => {
    console.error("Drivers list failed", error);
    return null;
  });
  const canManage = can(admin.role, "bookings.manage");

  const active = drivers?.filter((d) => d.active).length ?? 0;
  const upcoming = drivers?.reduce((n, d) => n + d.upcoming, 0) ?? 0;
  const business = drivers?.reduce((n, d) => n + d.business, 0) ?? 0;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader
        icon={<IdCard />}
        title="Drivers"
        description="Your drivers and the cabs they drive. Pick one from this list when you assign a trip."
        actions={canManage ? <AddDriverButton /> : null}
      />

      {drivers ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatTile tone="blue" icon={<Users />} label="Total drivers" value={drivers.length} />
          <StatTile tone="green" icon={<UserRoundCheck />} label="Active drivers" value={active} hint={`${drivers.length - active} switched off`} />
          <StatTile tone="amber" icon={<CalendarClock />} label="Upcoming trips" value={upcoming} hint="Confirmed, not done yet" />
          <StatTile tone="violet" icon={<IndianRupee />} label="Business done" value={money(business)} hint="Total fare, not pay" />
        </div>
      ) : null}

      {!drivers ? (
        <Alert tone="danger">Could not load drivers. Check that migration 011 has been run.</Alert>
      ) : drivers.length === 0 ? (
        <Alert>No drivers yet. Tap &quot;Add driver&quot; to add your first one. You can also save a driver while assigning a trip.</Alert>
      ) : (
        <DataTable
          rows={drivers}
          rowKey={(d) => d.id}
          columns={[
            {
              header: "Driver",
              primary: true,
              cell: (d) => (
                <Link href={`/admin/drivers/${d.id}`} className="group flex items-center gap-3">
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-full text-base font-bold text-white ${
                      d.active ? "bg-linear-to-br from-emerald-400 to-brand shadow-[0_6px_16px_-6px_rgba(52,211,153,0.8)]" : "bg-white/10 text-white/60"
                    }`}
                  >
                    {d.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold group-hover:text-brand-bright group-hover:underline">{d.name}</span>
                    <span className="mt-0.5 block">
                      <Badge tone={d.active ? "success" : "neutral"}>{d.active ? "active" : "switched off"}</Badge>
                    </span>
                  </span>
                </Link>
              ),
            },
            {
              header: "Mobile",
              cell: (d) => (
                <a className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-[13px] font-medium ring-1 ring-white/10 transition hover:bg-white/10 hover:text-brand-bright" href={`tel:+91${d.phone}`}>
                  <Phone className="size-3.5" aria-hidden="true" /> +91 {d.phone}
                </a>
              ),
            },
            {
              header: "Cab",
              cell: (d) =>
                d.cab_number ? (
                  <span className="inline-flex items-start gap-2">
                    <CarFront className="mt-0.5 size-4 shrink-0 text-brand-bright" aria-hidden="true" />
                    <span>
                      <span className="block font-semibold tracking-wide">{d.cab_number}</span>
                      {d.cab_model ? <span className="block text-xs text-muted">{d.cab_model}</span> : null}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted">No cab saved</span>
                ),
            },
            {
              header: "Upcoming",
              cell: (d) => (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-300 ring-1 ring-amber-400/20">
                  <CalendarClock className="size-3.5" aria-hidden="true" /> {d.upcoming}
                </span>
              ),
            },
            {
              header: "Completed",
              cell: (d) => (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/20">
                  <CheckCheck className="size-3.5" aria-hidden="true" /> {d.completed}
                </span>
              ),
            },
            { header: "Business done", cell: (d) => <b className="font-(family-name:--font-display) text-base">{money(d.business)}</b> },
            {
              header: "",
              align: "right",
              cell: (d) => (
                <ButtonLink href={`/admin/drivers/${d.id}`} variant="secondary" size="sm">
                  Open <ArrowRight />
                </ButtonLink>
              ),
            },
          ]}
        />
      )}
      <p className="text-xs text-muted">&quot;Business done&quot; is the total fare of the driver&apos;s confirmed and completed trips. It is not their pay.</p>
    </div>
  );
}
