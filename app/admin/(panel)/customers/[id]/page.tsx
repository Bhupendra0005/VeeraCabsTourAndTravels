import type { Metadata } from "next";
import { ArrowLeft, Ban, CalendarCheck, CalendarClock, CalendarDays, CircleCheck, Clock3, CreditCard, Fingerprint, History, IndianRupee, Mail, MapPin, Phone, TrendingUp, Undo2, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { BookingRoute, StatusBadge, TripWhen, money } from "@/components/admin/booking-bits";
import { CalendarCarArt } from "@/components/admin/list-parts";
import { UrlSelect } from "@/components/admin/status-filter";
import { CustomerBlockControl, CustomerNoteForm } from "@/components/admin/customer-controls";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { deleteCustomerAction } from "@/lib/server/admin/actions/customers";
import { Alert, Badge, Card, DataTable } from "@/components/admin/ui";
import { can } from "@/lib/admin/permissions";
import { formatDate, to12h } from "@/lib/booking/config";
import { STATUS_LABEL } from "@/lib/booking/status";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { getCustomerWithBookings, todayIst } from "@/lib/server/admin/queries";
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
  const admin = await requireAdminPage("customers.view");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const raw = (await searchParams).status;
  const status = (Array.isArray(raw) ? raw[0] : raw) ?? "";

  const found = await getCustomerWithBookings(id);
  if (!found) notFound();
  const { customer, bookings, spent, payments } = found;
  const profile = await getProfile(customer.id, customer.email).catch(() => null);

  const shown = status && status in STATUS_LABEL ? bookings.filter((b) => b.status === status) : bookings;
  const count = (s: string) => bookings.filter((b) => b.status === s).length;
  const refunded = bookings.reduce((sum, b) => sum + (b.refund_amount || 0), 0);
  const today = todayIst();
  const counted = bookings.filter((b) => b.status === "confirmed" || b.status === "completed");
  const average = counted.length ? Math.round(counted.reduce((sum, b) => sum + b.total, 0) / counted.length) : 0;
  const nextTrip = bookings
    .filter((b) => b.status === "confirmed" && b.travel_date >= today)
    .sort((a, b) => `${a.travel_date} ${a.travel_time}`.localeCompare(`${b.travel_date} ${b.travel_time}`))[0];
  const lastBooking = bookings[0];
  const refOf = (bookingId: string) => bookings.find((b) => b.id === bookingId)?.ref ?? "-";
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

      {customer.blocked ? (
        <Alert tone="danger">
          This customer is blocked from new online bookings{customer.blocked_reason ? `: ${customer.blocked_reason}` : ""}. They can still log in and see their old trips.
        </Alert>
      ) : null}

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
        <div className="mt-5 grid gap-5 border-t border-white/10 pt-5 sm:grid-cols-2 xl:grid-cols-4">
          <Info icon={<CircleCheck />} label="Confirmed / completed">
            {count("confirmed")} / {count("completed")}
          </Info>
          <Info icon={<Ban />} label="Cancelled">
            {count("cancelled")}
          </Info>
          <Info icon={<Clock3 />} label="Payment pending / failed">
            {count("pending_payment")} / {count("payment_failed")}
          </Info>
          <Info icon={<Undo2 />} label="Refunded">
            {money(refunded)}
          </Info>
          <Info icon={<TrendingUp />} label="Average booking value">
            {counted.length ? money(average) : "-"}
          </Info>
          <Info icon={<CalendarClock />} label="Next trip">
            {nextTrip ? `${formatDate(nextTrip.travel_date)}, ${to12h(nextTrip.travel_time)} (${nextTrip.ref})` : "None scheduled"}
          </Info>
          <Info icon={<History />} label="Last booking made">
            {lastBooking ? joined(lastBooking.created_at) : "-"}
          </Info>
          <Info icon={<Fingerprint />} label="Customer ID">
            <span className="text-sm font-medium">{customer.id}</span>
          </Info>
        </div>
        {customer.blocked ? (
          <div className="mt-5 grid gap-5 border-t border-white/10 pt-5 sm:grid-cols-2">
            <Info icon={<Ban />} label="Blocked since">
              {customer.blocked_at ? joined(customer.blocked_at) : "-"}
            </Info>
            <Info icon={<Ban />} label="Block reason">
              {customer.blocked_reason || "No reason given"}
            </Info>
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Private note" description="Only staff can see this. The customer never does.">
          <CustomerNoteForm id={customer.id} note={customer.admin_note ?? ""} />
        </Card>
        <Card title="Online booking access" description="A blocked customer can still log in, but cannot book online. You can unblock them any time.">
          <CustomerBlockControl id={customer.id} blocked={!!customer.blocked} reason={customer.blocked_reason ?? ""} allowed={can(admin.role, "settings.manage")} />
        </Card>
      </div>

      {can(admin.role, "bookings.delete") ? (
        <Card
          title="Delete customer"
          description={bookings.length ? "This customer has bookings, so they cannot be deleted. Block them above if you do not want new bookings." : "Permanently removes this customer. Possible only because they have no bookings."}
        >
          {bookings.length === 0 ? <ConfirmDelete id={customer.id} action={deleteCustomerAction} what="customer" summary={customer.email} redirectTo="/admin/customers" /> : null}
        </Card>
      ) : null}

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
                {
                  header: "Trip details",
                  cell: (b) => (
                    <div className="grid gap-0.5">
                      <span>{`${b.passengers} passenger${b.passengers === 1 ? "" : "s"}, ${b.bags} bag${b.bags === 1 ? "" : "s"}`}</span>
                      {b.pickup_address ? <span className="text-xs text-muted">Pickup: {b.pickup_address}</span> : null}
                    </div>
                  ),
                },
                { header: "Driver", cell: (b) => (b.driver_name ? `${b.driver_name}${b.cab_number ? ` · ${b.cab_number}` : ""}` : <span className="text-muted">Not assigned</span>) },
                { header: "Source", cell: (b) => (b.source === "phone" ? "Phone" : "Website") },
                { header: "Booked on", cell: (b) => <span className="whitespace-nowrap">{joined(b.created_at)}</span> },
                { header: "Total", align: "right", cell: (b) => <b className="whitespace-nowrap">{money(b.total)}</b> },
              ]}
            />
          </div>
        )}
      </section>

      {/* Payments */}
      <section className="relative rounded-2xl border border-white/10 bg-linear-to-b from-[#0b1620] to-panel">
        <div className="flex items-center gap-3 border-b border-white/10 p-5 sm:px-6">
          <span className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand-bright ring-1 ring-brand-bright/20">
            <CreditCard className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-(family-name:--font-display) text-lg font-bold">Payments</h2>
            <p className="text-sm text-muted">{payments.length ? "Every payment attempt for this customer's bookings, newest first." : "No payments yet."}</p>
          </div>
        </div>
        {payments.length === 0 ? null : (
          <div className="p-4 sm:p-5">
          <DataTable
            rows={payments}
            rowKey={(p) => p.id}
            columns={[
              { header: "Booking", primary: true, cell: (p) => <Link href={`/admin/bookings/${p.booking_id}`} className="font-semibold text-brand-bright hover:underline">{refOf(p.booking_id)}</Link> },
              { header: "Type", cell: (p) => <span className="capitalize">{p.kind}</span> },
              { header: "Amount", cell: (p) => <b>{money(p.amount)}</b> },
              { header: "Status", cell: (p) => <Badge tone={p.status === "paid" ? "success" : p.status === "failed" ? "danger" : p.status === "refunded" ? "info" : "warning"}>{p.status === "created" ? "not completed" : p.status}</Badge> },
              { header: "Razorpay payment", cell: (p) => <span className="font-mono text-xs">{p.razorpay_payment_id || "-"}</span> },
              { header: "Date", cell: (p) => <span className="whitespace-nowrap">{joined(p.paid_at ?? p.created_at)}</span> },
            ]}
          />
          </div>
        )}
      </section>
    </div>
  );
}
