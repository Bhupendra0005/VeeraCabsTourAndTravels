import type { Metadata } from "next";
import { ArrowRight, Clock3, Route, Users } from "lucide-react";
import Link from "next/link";
import { SearchForm } from "@/components/booking/search-form";
import { PageShell } from "@/components/site/page-shell";
import { PageHero, SectionHead } from "@/components/site/page-parts";
import {
  TRIP_TYPE_LABEL,
  formatDate,
  formatINR,
  to12h,
} from "@/lib/booking/config";
import { photoSrc } from "@/lib/cms/images";
import { isSearchComplete, parseSearch, searchToQuery } from "@/lib/booking/search";
import { getBookingSettings, getFleet } from "@/lib/server/cms/content";
import { listCities, searchFares, type RouteFare } from "@/lib/server/bookings/service";
import { ui } from "@/components/ui/styles";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = {
  title: "Book a Cab Online",
  description:
 "Search fixed-fare outstation cabs from Pune. Choose your vehicle, pay securely online and get your ticket by email.",
  alternates: { canonical: "/book" },
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseSearch(await searchParams);
  const searched = isSearchComplete(params);

  let cities: Awaited<ReturnType<typeof listCities>> = { from: [], to: {} };
  let fares: RouteFare[] = [];
  let unavailable = false;
  try {
    cities = await listCities();
    if (searched) fares = await searchFares(params.from, params.to, params.tripType);
  } catch (error) {
    console.error("Booking search failed", error);
    unavailable = true;
  }

  const [fleet, settings] = await Promise.all([getFleet(), getBookingSettings()]);
  const capacity = (name: string) => fleet.find((vehicle) => vehicle.title === name)?.capacity ?? 0;
  // only vehicles that are shown on the site and seat the group
  const fitting = fares.filter((fare) => capacity(fare.vehicle) >= params.passengers);

  return (
    <PageShell>
      <PageHero
        eyebrow="Book online"
        title={
          <>
            Fixed fares, <em>zero haggling.</em>
          </>
        }
        description="Pick your route and date, choose a vehicle and pay securely. Your ticket and invoice arrive by email."
        crumbs={[{ label: "Home", href: "/" }, { label: "Book online" }]}
      />

      <section className="section">
        <div className={cn("shell", ui.container)}>
          {unavailable || !settings.onlineBookingEnabled ? (
            <div className={ui.card} role="alert">
              <h2 className={ui.cardTitle}>Online booking is temporarily unavailable</h2>
              <p className={ui.muted}>
                {unavailable ? "Please call or WhatsApp us and we will book your ride right away." : settings.maintenanceMessage}
              </p>
            </div>
          ) : (
            <SearchForm cities={cities} initial={params} />
          )}

          {searched && !unavailable ? (
            <div className={ui.results}>
              <SectionHead
                eyebrow={`${TRIP_TYPE_LABEL[params.tripType]} · ${formatDate(params.date)}, ${to12h(params.time)}`}
                title={
                  <>
                    {params.from} to <span className="gold">{params.to}</span>
                  </>
                }
              />

              {fitting.length === 0 ? (
                <div className={ui.card}>
                  <h3 className={ui.cardTitle}>No fixed-fare cab for this search</h3>
                  <p className={ui.muted}>
                    {fares.length === 0
                      ? "We do not have an online fare for this route yet."
                      : `No vehicle seats ${params.passengers} passengers on this route online.`}{" "}
                    Message us on WhatsApp and we will quote it for you.
                  </p>
                </div>
              ) : (
                <ul className={ui.list}>
                  {fitting.map((fare) => {
                    const meta = fleet.find((item) => item.title === fare.vehicle);
                    const gst = Math.round((fare.fare * settings.gstPercent) / 100);
                    return (
                      <li key={fare.vehicle} className={cn(ui.card, ui.fareCard)}>
                        {meta ? (
                          <img
                            src={photoSrc(meta, 480)}
                            alt={`${fare.vehicle} by Veera Tours & Travels`}
                            width={240}
                            height={126}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : null}
                        <div className={ui.fareInfo}>
                          <h3>{fare.vehicle}</h3>
                          <ul className={ui.chips}>
                            <li>
                              <Users aria-hidden="true" /> {meta?.seats ?? `${capacity(fare.vehicle)} seats`}
                            </li>
                            <li>
                              <Route aria-hidden="true" /> {fare.distanceKm} km
                            </li>
                            <li>
                              <Clock3 aria-hidden="true" /> ~{fare.durationHours} hrs
                            </li>
                          </ul>
                          <small className={ui.muted}>AC · Verified driver · Free cancellation till 1 hr before pickup</small>
                        </div>
                        <div className={ui.farePrice}>
                          <b>{formatINR(fare.fare)}</b>
                          <small>+ {formatINR(gst)} GST</small>
                          <Link
                            className="btn btn-gold"
                            href={`/book/review?${searchToQuery({ ...params, routeId: fare.routeId, vehicle: fare.vehicle })}`}
                          >
                            Select cab
                            <ArrowRight aria-hidden="true" />
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}
