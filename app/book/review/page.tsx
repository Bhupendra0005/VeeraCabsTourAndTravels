import type { Metadata } from "next";
import { CalendarDays, CarFront, Clock3, MapPin, Route, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReviewForm } from "@/components/booking/review-form";
import { PageShell } from "@/components/site/page-shell";
import { PageHero } from "@/components/site/page-parts";
import {
  TRIP_TYPE_LABEL,
  describeMinutes,
  departureAt,
  formatDate,
  to12h,
} from "@/lib/booking/config";
import {
  isSearchComplete,
  parseRouteId,
  parseSearch,
  parseVehicle,
  searchToQuery,
} from "@/lib/booking/search";
import { lookupFare } from "@/lib/server/bookings/service";
import { getBookingSettings } from "@/lib/server/cms/content";
import { getSession } from "@/lib/server/auth/session";
import { ui } from "@/components/ui/styles";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = {
  title: "Review your ride",
  robots: { index: false, follow: false },
};

const freeUntilFormat = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const search = parseSearch(raw);
  const vehicle = parseVehicle(raw);
  const routeId = parseRouteId(raw);
  if (!isSearchComplete(search) || !vehicle || !routeId) redirect("/book");

  const here = `/book/review?${searchToQuery({ ...search, routeId, vehicle })}`;
  const loginPath = `/login?next=${encodeURIComponent(here)}`;
  const session = await getSession();
  if (!session) redirect(loginPath);

  const fare = await lookupFare(routeId, vehicle, search.tripType).catch((error) => {
    console.error("Fare lookup failed", error);
    return null;
  });
  if (!fare) redirect("/book");

  const settings = await getBookingSettings();
  if (!settings.onlineBookingEnabled) redirect("/book");
  const departure = departureAt(search.date, search.time);
  const freeUntil = freeUntilFormat.format(new Date(departure.getTime() - settings.freeCancelMinutes * 60_000));

  return (
    <PageShell>
      <PageHero
        eyebrow="Review your ride"
        title={
          <>
            Almost <em>there.</em>
          </>
        }
        description="Check your trip, enter traveller details and pay securely to confirm."
        crumbs={[{ label: "Home", href: "/" }, { label: "Book online", href: "/book" }, { label: "Review" }]}
      />

      <section className="section">
        <div className={cn("shell", ui.container)}>
          <section className={ui.card}>
            <h2 className={ui.cardTitle}>
              {fare.fromCity} to {fare.toCity}
            </h2>
            <ul className={ui.chipsLarge}>
              <li>
                <Route aria-hidden="true" /> {TRIP_TYPE_LABEL[search.tripType]} · {fare.distanceKm} km
              </li>
              <li>
                <CalendarDays aria-hidden="true" /> {formatDate(search.date)}
                {search.tripType === "round_trip" ? ` to ${formatDate(search.returnDate)}` : ""}
              </li>
              <li>
                <Clock3 aria-hidden="true" /> {to12h(search.time)}
              </li>
              <li>
                <CarFront aria-hidden="true" /> {fare.vehicle}
              </li>
              <li>
                <Users aria-hidden="true" /> {search.passengers} {search.passengers === 1 ? "passenger" : "passengers"}
              </li>
            </ul>
            <Link className={ui.linkButton} href={`/book?${searchToQuery(search)}`}>
              Change search
            </Link>
          </section>

          <section className={cn(ui.card, ui.cancelCard)}>
            <h2 className={ui.cardTitle}>
              <ShieldCheck aria-hidden="true" /> Cancellation policy
            </h2>
            <p>
              <b>Free cancellation till {describeMinutes(settings.freeCancelMinutes)} of departure</b> ({freeUntil}).
            </p>
            <div className={ui.timeline} aria-hidden="true">
              <span className={ui.timelineOk}>Fully refundable</span>
              <span className={ui.timelineNo}>Non refundable</span>
            </div>
            <p className={ui.muted}>
              No penalty up to {describeMinutes(settings.freeCancelMinutes)} before departure, 100% penalty after that.{" "}
              <Link href="/cancellation-policy" target="_blank">
                Read cancellation policy
              </Link>
            </p>
          </section>

          <ReviewForm
            routeId={fare.routeId}
            vehicle={fare.vehicle}
            tripType={search.tripType}
            date={search.date}
            time={search.time}
            returnDate={search.returnDate}
            passengers={search.passengers}
            baseFare={fare.fare}
            rules={{
              gstPercent: settings.gstPercent,
              partPayPercent: settings.partPayPercent,
              insuranceEnabled: settings.insuranceEnabled,
              insuranceRupees: settings.insuranceRupees,
              balanceCutoffHours: settings.balanceCutoffHours,
            }}
            defaultEmail={session.email}
            loginPath={loginPath}
          />
          <p className={ui.muted}>
            <MapPin aria-hidden="true" className={ui.inlineIcon} /> The fare is fixed for this route and vehicle. Your
            confirmation lists anything that is paid separately.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
