import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftRight, BadgeCheck, CarFront, Clock3, MapPin, Route, ShieldCheck, Sparkles } from "lucide-react";
import { CabList, type CabOption } from "@/components/booking/cab-list";
import { ScrollToResults } from "@/components/booking/scroll-to-results";
import { SearchCollapse } from "@/components/booking/search-collapse";
import { SearchForm } from "@/components/booking/search-form";
import { PageShell } from "@/components/site/page-shell";
import { BookingBand } from "@/components/booking/booking-band";
import {
  TRIP_TYPE_LABEL,
  formatDate,
  formatINR,
  isAirport,
  isOutstation,
  to12h,
} from "@/lib/booking/config";
import { photoSrc } from "@/lib/cms/images";
import { quoteHref } from "@/lib/booking/quote";
import { isSearchComplete, parseSearch, searchToQuery } from "@/lib/booking/search";
import { cabHeading } from "@/lib/booking/fleet";
import { getBookingExtras, getBookingPage, getBookingSettings, getFleet } from "@/lib/server/cms/content";
import { getVehicleRatings } from "@/lib/server/bookings/reviews";
import { pricedByDistance } from "@/lib/server/bookings/distance";
import { busyVehicles, isFullyBooked, listSearchOptions, searchFares, type RouteFare, type SearchOptions } from "@/lib/server/bookings/service";
import { ui } from "@/components/ui/styles";

export const metadata: Metadata = {
  title: "Book a Cab Online",
  description:
 "Search fixed-fare outstation cabs, airport transfers and hourly rentals from Pune. Choose your vehicle, pay securely online and get your ticket by email.",
  alternates: { canonical: "/book" },
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  let params = parseSearch(rawParams);
  const wantedCab = (() => {
    const value = Array.isArray(rawParams.cab) ? rawParams.cab[0] : rawParams.cab;
    return typeof value === "string" && /^[\w &,.()'-]{2,40}$/.test(value) ? value : "";
  })();
  const page = await getBookingPage();
  const tabOn = isAirport(params.tripType) ? page.enableAirport : params.tripType === "hourly" ? page.enableHourly : true;
  let searched = false;

  let options: SearchOptions = { cities: { from: [], to: {} }, stopCities: [], airports: [], places: [], hourlyCities: [], hourlyPackages: {} };
  let fares: RouteFare[] = [];
  let unavailable = false;
  let byDistance = false;
  try {
    options = await listSearchOptions();
    byDistance = await pricedByDistance();
    // links from elsewhere on the site (or typed by hand) may name a place we have no fares for: start from a clean field instead
    // (not when fares are worked out from the distance: any place is allowed then)
    if (isOutstation(params.tripType) && !byDistance) {
      const from = options.cities.from.includes(params.from) ? params.from : "";
      const to = from && options.cities.to[from]?.includes(params.to) ? params.to : "";
      params = { ...params, from, to };
    }
    searched = isSearchComplete(params) && tabOn;
    if (searched) fares = await searchFares(params);
  } catch (error) {
    console.error("Booking search failed", error);
    unavailable = true;
  }

  const [fleet, settings, extras, ratings] = await Promise.all([getFleet(), getBookingSettings(), getBookingExtras(), page.enableReviews ? getVehicleRatings() : Promise.resolve({})]);
  const capacity = (name: string) => fleet.find((vehicle) => vehicle.title === name)?.capacity ?? 0;
  // only vehicles that are shown on the site and seat the group
  const seating = fares.filter((fare) => capacity(fare.vehicle) >= params.passengers);
  // vehicles the owner has limited (fleet "How many do you have") and that are already taken for this time are not offered
  let busy: Record<string, number> = {};
  if (searched && seating.some((fare) => (fleet.find((vehicle) => vehicle.title === fare.vehicle)?.count ?? 0) > 0)) {
    try {
      busy = await busyVehicles({
        travel_date: params.date,
        travel_time: params.time,
        return_date: params.tripType === "round_trip" ? params.returnDate : null,
        hours: seating[0]?.durationHours || seating[0]?.hours || null,
        label: params.tripType === "hourly" ? params.pkg : undefined,
      });
    } catch (error) {
      console.error("Availability check failed", error);
    }
  }
  const fitting = seating.filter((fare) => !isFullyBooked(fleet.find((vehicle) => vehicle.title === fare.vehicle) ?? {}, busy, fare.vehicle));
  const allTaken = seating.length > 0 && fitting.length === 0;
  const highlighted = extras.addons.find((addon) => addon.active && (addon.highlight ?? /roof/i.test(addon.label)));
  const cabs: CabOption[] = fitting.map((fare) => {
    const meta = fleet.find((item) => item.title === fare.vehicle);
    const heading = cabHeading(fare.vehicle, meta?.models ?? "");
    const bags = meta?.bags ?? 2;
    const discountPercent = Math.max(0, Math.min(70, Math.round(meta?.listDiscountPercent ?? 0)));
    return {
      vehicle: fare.vehicle,
      name: heading.name,
      similar: heading.similar,
      category: meta?.category || fare.vehicle,
      fuel: meta?.fuel || "Diesel",
      seats: meta?.seats ?? `${capacity(fare.vehicle)} seats`,
      bags,
      image: meta ? photoSrc(meta, 480) : "",
      fare: fare.fare,
      listFare: discountPercent > 0 && discountPercent < 100 ? Math.round(fare.fare / (1 - discountPercent / 100)) : null,
      discountPercent,
      gst: Math.round((fare.fare * settings.gstPercent) / 100),
      href: `/book/review?${searchToQuery({ ...params, routeId: fare.routeId || undefined, vehicle: fare.vehicle })}`,
      hint: highlighted && bags < 10 ? `${highlighted.description || `Add ${highlighted.label}`} @ ₹${highlighted.rupees}` : null,
      rating: (ratings as Record<string, { avg: number; count: number }>)[fare.vehicle] ?? null,
    };
  });
  const sample = fitting[0];
  const km = sample ? (sample.billedKm ?? sample.distanceKm * (params.tripType === "round_trip" ? 2 : 1)) : 0;
  const stopsCharge = Math.round(extras.stopCharge * 100) * (isOutstation(params.tripType) ? params.stops.length : 0);
  const heading =
    params.tripType === "airport_pickup" ? (
      <>
        {params.airport} to <span className="text-brand">{params.address}</span>
      </>
    ) : params.tripType === "airport_drop" ? (
      <>
        {params.address} to <span className="text-brand">{params.airport}</span>
      </>
    ) : params.tripType === "hourly" ? (
      <>
        {params.from} · <span className="text-brand">{params.pkg}</span>
      </>
    ) : (
      <>
        {params.from} to <span className="text-brand">{params.to}</span>
      </>
    );

  // the slim bar shown on phones in place of the form once a search has run
  const summaryTitle =
    params.tripType === "airport_pickup"
      ? `${params.airport} to ${params.address}`
      : params.tripType === "airport_drop"
        ? `${params.address} to ${params.airport}`
        : params.tripType === "hourly"
          ? `${params.from} · ${params.pkg}`
          : `${params.from} to ${params.to}`;
  const summarySub = `${formatDate(params.date)}, ${to12h(params.time)}`;

  // the big banner shows before a search; after it a slim search bar keeps the cab list in view (switchable in the admin)
  const showHero = page.showHeroBanner && (!searched || page.heroOnResults);

  return (
    <PageShell footer={false}>
      <div className="mmt">
        <BookingBand
          wide
          title={`${page.titleLead} ${page.titleEmphasis}`.trim()}
          hero={
            showHero
              ? {
                  lead: page.titleLead,
                  emphasis: page.titleEmphasis,
                  subtitle: page.subtitle,
                  points: page.heroPoints.map((point) => point.label),
                  image: page.heroImage,
                }
              : undefined
          }
        >
          {unavailable || !settings.onlineBookingEnabled ? (
            <div className={ui.card} role="alert">
              <h2 className={ui.cardTitle}>Online booking is temporarily unavailable</h2>
              <p className={ui.muted}>
                {unavailable ? "Please call or WhatsApp us and we will book your ride right away." : settings.maintenanceMessage}
              </p>
            </div>
          ) : (
            <SearchCollapse title={summaryTitle} subtitle={summarySub} enabled={searched}>
              <SearchForm
                options={options}
                initial={params}
                tabs={[
                  "one_way",
                  ...(page.showRoundTripTab || !page.oneWayReturn ? ["round_trip"] : []),
                  ...(page.enableAirport && options.airports.length > 0 ? ["airport"] : []),
                  ...(page.enableHourly && options.hourlyCities.length > 0 ? ["hourly"] : []),
                ]}
                maxStops={page.enableStops ? page.maxStops : 0}
                oneWayReturn={page.oneWayReturn}
                returnHint={page.returnHint}
                askTravellers={{ airport: page.airportAskTravellers, hourly: page.hourlyAskTravellers }}
                suggestions={page.addressSuggestions}
                byDistance={byDistance}
              />
            </SearchCollapse>
          )}
        </BookingBand>

        <section className={showHero ? "mmt-body mmt-body--hero" : "mmt-body"}>
          <div className="mmt-wrap mmt-wrap--wide grid gap-4">
            {searched && !unavailable ? (
              <>
                <div className="bk-results-head scroll-mt-24" id="results">
                  <ScrollToResults targetId="results" />
                  <div className="min-w-0">
                    <p className="bk-trip-chip">
                      <span className="bk-trip-chip-icon">{params.tripType === "round_trip" ? <ArrowLeftRight aria-hidden="true" /> : <CarFront aria-hidden="true" />}</span>
                      <span>{TRIP_TYPE_LABEL[params.tripType]}</span>
                      <i aria-hidden="true">•</i>
                      <span>
                        {formatDate(params.date)}, {to12h(params.time)}
                      </span>
                      <i aria-hidden="true">•</i>
                      <span>
                        {params.passengers} {params.passengers === 1 ? "Traveller" : "Travellers"}
                      </span>
                    </p>
                    <h2 className="bk-results-title">{heading}</h2>
                  </div>
                  {cabs.length > 0 ? (
                    <p className="bk-count-pill">
                      <CarFront aria-hidden="true" /> {cabs.length} {cabs.length === 1 ? "cab" : "cabs"} available
                    </p>
                  ) : null}
                </div>

                {cabs.length === 0 ? (
                  <div className={ui.card}>
                    <h3 className={ui.cardTitle}>No fixed-fare cab for this search</h3>
                    <p className={ui.muted}>
                      {fares.length === 0
                        ? byDistance && isOutstation(params.tripType)
                          ? "We could not work out the distance between these two places. Check the spelling, or try the nearest big city."
                          : "We do not have an online fare for this route yet."
                        : allTaken
                          ? "All our vehicles that seat your group are booked for this time. Try another time or date, or send us your trip."
                          : `No vehicle seats ${params.passengers} passengers on this route online.`}{" "}
                      Send us your trip and we will quote it for you.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Link
                        className="btn btn-gold"
                        href={quoteHref({
                          from: params.tripType === "airport_pickup" ? params.airport : params.tripType === "airport_drop" ? params.address : params.from,
                          to: params.tripType === "airport_pickup" ? params.address : params.tripType === "airport_drop" ? params.airport : params.to || params.pkg,
                          date: params.date,
                          time: params.time,
                          passengers: params.passengers,
                          kind: isAirport(params.tripType) ? "Airport transfer" : params.tripType === "hourly" ? "Hourly rental" : undefined,
                        })}
                      >
                        Get a quote
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    {page.trustPoints.length > 0 ? (
                      <ul className="bk-trust" style={{ gridTemplateColumns: `repeat(${Math.max(1, page.trustPoints.length)}, minmax(0, 1fr))` }}>
                        {page.trustPoints.map(({ label, text }, index) => {
                          const Icon = [ShieldCheck, Sparkles, Clock3, BadgeCheck][index % 4];
                          return (
                            <li key={label}>
                              <span className="bk-trust-icon">
                                <Icon aria-hidden="true" />
                              </span>
                              <span>
                                <b>{label}</b>
                                {text ? <small>{text}</small> : null}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                    <div className="bk-info-pills">
                      {isOutstation(params.tripType) ? (
                        <>
                          <p>
                            <Route aria-hidden="true" /> Rates for <b>{km} Kms</b> (approx. distance)
                          </p>
                          <p>
                            <Clock3 aria-hidden="true" /> <b>{sample.durationHours} hr(s)</b> (approx. time{params.tripType === "round_trip" ? " one way" : ""})
                          </p>
                          {sample.matched ? (
                            <p>
                              <MapPin aria-hidden="true" />
                              <span>
                                Distance worked out from <b>{sample.matched.from}</b> to <b>{sample.matched.to}</b>. Not the right place? Change it above and pick from the suggestions.
                              </span>
                            </p>
                          ) : null}
                          {params.stops.length > 0 ? (
                            <p>
                              <b>{params.stops.length} extra {params.stops.length === 1 ? "stop" : "stops"}</b> ({params.stops.join(", ")}) add {formatINR(stopsCharge)} at checkout
                            </p>
                          ) : null}
                        </>
                      ) : isAirport(params.tripType) ? (
                        <p>
                          <Route aria-hidden="true" /> Fixed fare for your <b>airport transfer</b>
                          {sample.distanceKm > 0 ? ` (up to ${sample.distanceKm} km included)` : ""}
                        </p>
                      ) : (
                        <p>
                          <Clock3 aria-hidden="true" /> Package <b>{params.pkg}</b>: {sample.hours} hr(s) and {sample.distanceKm} km included
                        </p>
                      )}
                    </div>
                    <CabList
                      cabs={cabs}
                      bestValue={page.showBestValue}
                      initialVehicle={wantedCab}
                      filters={{ type: page.showTypeFilter, model: page.showModelFilter, fuel: page.showFuelFilter, sort: page.showSort }}
                    />
                  </>
                )}
              </>
            ) : (
              <div className="bk-empty">
                <span className="bk-empty-icon">
                  <CarFront aria-hidden="true" />
                </span>
                <span className="bk-empty-rule" aria-hidden="true" />
                <div className="bk-empty-text">
                  <h2>Search to see fixed-fare cabs</h2>
                  <p>{page.description}</p>
                </div>
                <svg className="bk-empty-art" viewBox="0 0 520 150" aria-hidden="true" preserveAspectRatio="xMaxYMax slice">
                  <defs>
                    <linearGradient id="bk-hill-a" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#c9dcf5" />
                      <stop offset="1" stopColor="#e9f1fb" />
                    </linearGradient>
                    <linearGradient id="bk-hill-b" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#a9c6ec" />
                      <stop offset="1" stopColor="#dce9f8" />
                    </linearGradient>
                  </defs>
                  <path d="M120 150 L230 62 L292 104 L372 38 L520 128 V150 Z" fill="url(#bk-hill-a)" />
                  <path d="M250 150 L350 84 L430 124 L520 78 V150 Z" fill="url(#bk-hill-b)" />
                  <path d="M470 150 C 400 128 520 118 430 98 C 350 82 440 70 380 52" fill="none" stroke="#9bb8df" strokeWidth="9" strokeLinecap="round" opacity="0.7" />
                  <path d="M470 150 C 400 128 520 118 430 98 C 350 82 440 70 380 52" fill="none" stroke="#f4f8fe" strokeWidth="1.6" strokeDasharray="6 7" strokeLinecap="round" />
                </svg>
              </div>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
