import Link from "next/link";
import { Badge, type Tone } from "@/components/admin/ui";
import { STATUS_LABEL, type BookingStatusKey } from "@/lib/booking/status";
import { formatDate, formatINR, to12h, TRIP_TYPE_LABEL } from "@/lib/booking/config";
import type { BookingRow } from "@/lib/server/bookings/types";

const TONE: Record<BookingStatusKey, Tone> = {
  confirmed: "success",
  completed: "info",
  pending_payment: "warning",
  cancelled: "danger",
  payment_failed: "danger",
};

export function StatusBadge({ status }: { status: BookingStatusKey }) {
  return <Badge tone={TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function BookingRoute({ booking }: { booking: BookingRow }) {
  return (
    <div>
      <Link href={`/admin/bookings/${booking.id}`} className="font-semibold text-brand-bright hover:underline">
        {booking.ref}
      </Link>
      <p className="text-[13px]">
        {booking.from_city} to {booking.to_city}
      </p>
      <p className="text-xs text-muted">
        {TRIP_TYPE_LABEL[booking.trip_type]} · {booking.vehicle_type}
      </p>
    </div>
  );
}

export function TripWhen({ booking }: { booking: BookingRow }) {
  return (
    <span>
      {formatDate(booking.travel_date)}
      <br />
      <span className="text-xs text-muted">{to12h(booking.travel_time)}</span>
    </span>
  );
}

export function money(paise: number) {
  return formatINR(paise);
}
