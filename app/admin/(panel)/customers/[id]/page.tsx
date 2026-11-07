import type { Metadata } from "next";
import { ArrowLeft, CalendarCheck, CalendarDays, IndianRupee, Mail, MapPin, Phone, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { BookingRoute, StatusBadge, TripWhen, money } from "@/components/admin/booking-bits";
import { CalendarCarArt } from "@/components/admin/list-parts";
import { UrlSelect } from "@/components/admin/status-filter";
import { DataTable } from "@/components/admin/ui";
import { STATUS_LABEL } from "@/lib/booking/status";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { getCustomerWithBookings } from "@/lib/server/admin/queries";
import { getProfile } from "@/lib/server/auth/profile";
import { isUuid } from "@/lib/server/core/validate";

export const metadata: Metadata = { title: "Customer" };

const joined = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

const filterOptions = [{ value: "", label: "All bookings" }, ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))];

function Info({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-4 px-2 py-1 sm:px-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-brand/25 to-brand/5 text-brand-bright ring-1 ring-brand-bright/20 [&>svg]:size-5">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="font-semibold wrap-anywhere">{children}</p>
      </div>
    </div>
  );
}

export default async function AdminCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("customers.view");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const raw = (await searchParams).status;
  const status = (Array.isArray(raw) ? raw[0] : raw) ?? "";

  const found = await getCustomerWithBookings(id);
  if (!found) notFound();
  const { customer, bookings, spent } = found;
  const profile = await getProfile(customer.id, customer.email).catch(() => null);

  const shown = status && status in STATUS_LABEL ? bookings.filter((b) => b.status === status) : bookings;
  const extra: { icon: ReactNode; label: string; value: string }[] = [];
  if (profile?.name) extra.push({ icon: <UserRound />, label: "Name", value: profile.name });
  if (profile?.phone) extra.push({ icon: <Phone />, label: "Mobile", value: `+91 ${profile.phone}` });
  if (profile?.city) extra.push({ icon: <MapPin />, label: "City", value: profile.city });

  return (
    <div className="grid gap-6">
      <div className="grid gap-4">
        <Link href="/admin/customers" className="inline-flex w-fit items-center gap-1.5 rounded-lg py-1 pr-2 text-sm text-muted transition hover:text-white">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to Customers
        </Link>
        <header className="flex min-w-0 items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-violet-400 to-brand text-2xl font-extrabold text-white shadow-[0_10px_30px_-10px_rgba(139,92,246,0.9)]">
            {(profile?.name || customer.email).charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="font-(family-name:--font-display) text-2xl font-bold wrap-anywhere sm:text-3xl">{profile?.name || customer.email}</h1>
            <p className="mt-1 text-sm text-muted wrap-anywhere">{profile?.name ? customer.email : "Customer profile and their bookings."}</p>
          </div>
        </header>
      </div>

      {/* Profile */}
      <section className="rounded-2xl border border-brand-bright/30 bg-linear-to-b from-[#0c1a24] to-panel p-5 shadow-[0_0_44px_-18px_rgba(0,150,219,0.55)] sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand-bright ring-1 ring-brand-bright/20">
            <UserRound className="size-5" aria-hidden="true" />
          </span>
          <h2 className="font-(family-name:--font-display) text-lg font-bold">Profile</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-white/10">
          <Info icon={<Mail />} label="Email">
            {customer.email}
          </Info>
          <Info icon={<CalendarDays />} label="Joined on">
            {joined(customer.created_at)}
          </Info>
          <Info icon={<CalendarCheck />} label="Total bookings">
            {bookings.length}
          </Info>
          <Info icon={<IndianRupee />} label="Total spent">
            {money(spent)}
          </Info>
        </div>
        {extra.length > 0 ? (
          <div className="mt-5 grid gap-5 border-t border-white/10 pt-5 sm:grid-cols-2 xl:grid-cols-4">
            {extra.map((item) => (
              <Info key={item.label} icon={item.icon} label={item.label}>
                {item.value}
              </Info>
            ))}
          </div>
        ) : null}
      </section>

      {/* Bookings */}
      <section className="relative rounded-2xl border border-white/10 bg-linear-to-b from-[#0b1620] to-panel">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand-bright ring-1 ring-brand-bright/20">
              <CalendarCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-(family-name:--font-display) text-lg font-bold">Bookings</h2>
              <p className="text-sm text-muted">All bookings made by this customer.</p>
            </div>
          </div>
          {bookings.length > 0 ? <UrlSelect id="cb-status" param="status" value={status} options={filterOptions} className="w-full sm:w-56" /> : null}
        </div>

        {shown.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <CalendarCarArt />
            <h3 className="mt-5 font-(family-name:--font-display) text-2xl font-extrabold">{bookings.length === 0 ? "No bookings yet" : "No bookings match"}</h3>
            <p className="mt-2 max-w-md text-sm text-muted">
              {bookings.length === 0 ? "This customer hasn't made any bookings so far." : "This customer has no bookings with that status."}
            </p>
            {bookings.length > 0 ? (
              <Link
                href={`/admin/customers/${customer.id}`}
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-brand-bright/50 bg-brand/10 px-6 py-3 text-sm font-bold text-brand-bright transition hover:bg-brand/20"
              >
                Show all bookings
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            <DataTable
              rows={shown}
              rowKey={(b) => b.id}
              columns={[
                { header: "Booking", primary: true, cell: (b) => <BookingRoute booking={b} /> },
                { header: "Status", cell: (b) => <StatusBadge status={b.status} /> },
                { header: "Travel", cell: (b) => <TripWhen booking={b} /> },
                { header: "Total", align: "right", cell: (b) => money(b.total) },
              ]}
            />
          </div>
        )}
      </section>
    </div>
  );
}
