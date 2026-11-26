import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Fragment } from "react";
import { ArrowDown, ArrowLeftRight, BadgeCheck, CarFront, Clock3, MapPin, Route, ShieldCheck, Sparkles } from "lucide-react";
import { CabList, type CabOption } from "@/components/booking/cab-list";
import { ScrollToResults } from "@/components/booking/scroll-to-results";
import { SearchCollapse } from "@/components/booking/search-collapse";
import { SearchForm } from "@/components/booking/search-form";
import { PageShell } from "@/components/site/page-shell";
import { BookingBand } from "@/components/booking/booking-band";
import {
  TRIP_TYPE_LABEL,
  describeMinutes,
  earliestPickupLabel,
  formatDate,
  formatINR,
  isAirport,
  isOutstation,
  pickupTooSoon,
  to12h,
} from "@/lib/booking/config";
import { photoSrc } from "@/lib/cms/images";
import { quoteHref } from "@/lib/booking/quote";
import { isSearchComplete, parseSearch, searchToQuery } from "@/lib/booking/search";
import { cabHeading, listOffer } from "@/lib/booking/fleet";
import { getBookingExtras, getBookingPage, getBookingSettings, getFleet } from "@/lib/server/cms/content";
import { getVehicleRatings } from "@/lib/server/bookings/reviews";
import { pricedByDistance } from "@/lib/server/bookings/distance";
import { busyVehicles, isFullyBooked, isBeyondAirportLimit, listSearchOptions, searchFares, type RouteFare, type SearchOptions } from "@/lib/server/bookings/service";
import { ui } from "@/components/ui/styles";
import { leadMinutesFor, surchargeTotal } from "@/lib/booking/surcharges";

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

  // an airport transfer to or from a place outside the city is an outstation trip: send the customer there, places filled in
  if (isAirport(params.tripType) && tabOn && isSearchComplete(params)) {
    const beyond = await isBeyondAirportLimit(params.airport, params.address).catch((error) => {
      console.error("Airport distance check failed", error);
      return false;
    });
    if (beyond) {
      const pickup = params.tripType === "airport_pickup";
      const query = searchToQuery({
        tripType: "one_way",
        from: pickup ? params.airport : params.address,
        to: pickup ? params.address : params.airport,
        date: params.date,
        time: params.time,
        passengers: params.passengers,
        bags: params.bags,
      });
      redirect(`/book?${query}&moved=airport${wantedCab ? `&cab=${encodeURIComponent(wantedCab)}` : ""}`);
    }
  }
  const movedFromAirport = rawParams.moved === "airport" && params.tripType === "one_way";

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
  // the owner's "Earliest bookable pickup": no cabs are offered for a pickup sooner than that
  const leadMinutes = leadMinutesFor(params.tripType, settings.minLeadMinutes, extras);
  const tooSoon = searched ? pickupTooSoon(params.date, params.time, leadMinutes) : null;
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
    // the card's price is the km charge alone (like the review page's Base Fare); driver allowance, toll and taxes are
    // shown beside it and added in the final amount
    const kmFare = fare.fare - (fare.allowance ?? 0) - (fare.breakup?.toll ?? 0) - surchargeTotal(fare.surcharges);
    const notes = [
      fare.airportExtra
        ? `${fare.airportExtra.tripKm} km trip: includes ${formatINR(fare.airportExtra.amount)} for ${fare.airportExtra.extraKm} extra km (beyond ${fare.airportExtra.includedKm} km, at ₹${fare.airportExtra.rate}/km)`
        : "",
      ...(fare.surcharges ?? []).map((item) => `${item.label} ${formatINR(item.amount)} applies for this pickup time`),
    ].filter(Boolean);
    const otherCharges = fare.fare - kmFare + Math.round((fare.fare * settings.gstPercent) / 100) + Math.round(extras.serviceFee * 100);
    const offer = listOffer(kmFare, meta?.listDiscountPercent);
    return {
      vehicle: fare.vehicle,
      name: heading.name,
      similar: heading.similar,
      category: meta?.category || fare.vehicle,
      fuel: meta?.fuel || "Diesel",
      ac: meta?.ac ?? "AC",
      seats: meta?.seats ?? `${capacity(fare.vehicle)} seats`,
      bags,
      image: meta ? photoSrc(meta, 480) : "",
      fare: kmFare,
      listFare: offer?.was ?? null,
      discountPercent: offer?.percent ?? 0,
      otherCharges,
      href: `/book/review?${searchToQuery({ ...params, routeId: fare.routeId || undefined, vehicle: fare.vehicle })}`,
      extraNote: notes.join(" · ") || null,
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
  const [summaryFrom, summaryTo] =
    params.tripType === "airport_pickup"
      ? [params.airport, params.address]
      : params.tripType === "airport_drop"
        ? [params.address, params.airport]
        : params.tripType === "hourly"
          ? [params.from, params.pkg]
          : [params.from, params.to];
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
            <SearchCollapse from={summaryFrom} to={summaryTo} subtitle={summarySub} enabled={searched}>
              <SearchForm
                // moved from the airport tab: start the form again so it shows the outstation tab with the same places
                key={movedFromAirport ? searchToQuery(params) : "search"}
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
            {movedFromAirport ? (
              <p className="rounded-xl border border-[#f3d9a4] bg-[#fff8e6] px-4 py-3 text-sm font-semibold text-[#6b5314]" role="status">
                This location is outside the city, so it is booked as an Outstation One-Way trip. The fares below are outstation fares.
              </p>
            ) : null}
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
                  {cabs.length > 0 && !tooSoon ? (
                    <p className="bk-count-pill">
                      <CarFront aria-hidden="true" /> {cabs.length} {cabs.length === 1 ? "cab" : "cabs"} available
                    </p>
                  ) : null}
                </div>

                {tooSoon ? (
                  <div className="grid gap-4 rounded-2xl border-2 border-[#f0b849] bg-[#fff8e6] p-5 sm:p-6" role="alert">
                    <div className="flex items-start gap-3.5">
                      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#f0a81c] text-white">
                        <Clock3 className="size-6" aria-hidden="true" />
                      </span>
                      <div className="grid min-w-0 gap-1.5">
                        <h3 className="text-xl font-extrabold text-[#4a3500]">Choose a later pickup time</h3>
                        {leadMinutes > 0 ? (
                          <p className="text-[15px] leading-8 text-[#6b5314]">
                            Please book at least{" "}
                            <mark className="whitespace-nowrap rounded-lg bg-[#ffdf8a] px-2.5 py-1 text-base font-extrabold text-[#3d2b00]">
                              {describeMinutes(leadMinutes)} before pickup
                            </mark>
                          </p>
                        ) : (
                          <p className="text-[15px] text-[#6b5314]">{tooSoon}</p>
                        )}
                      </div>
                    </div>
                    {leadMinutes > 0 ? (
                      <div className="grid gap-1 rounded-xl border border-[#f3d9a4] bg-white px-4 py-3">
                        <span className="text-[13px] font-semibold text-[#6b5314]">Earliest pickup you can book online</span>
                        <b className="text-2xl font-extrabold text-[#0b2c52]">{earliestPickupLabel(leadMinutes)}</b>
                      </div>
                    ) : null}
                    <p className="text-sm font-semibold text-[#6b5314]">Need a cab sooner? Call or WhatsApp us.</p>
                  </div>
                ) : cabs.length === 0 ? (
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
                    {isOutstation(params.tripType) ? (
                      <div className="overflow-hidden rounded-2xl border border-[#dbe6f3] bg-white shadow-[0_8px_26px_rgba(15,27,45,0.07)]">
                        {/* laptop: the two places at the ends of a route line, distance and time in the middle of it */}
                        {sample.matched ? (
                          <div className="hidden gap-3 px-7 py-5 lg:grid">
                            <div className="grid grid-cols-[minmax(0,1fr)_minmax(300px,1.1fr)_minmax(0,1fr)] items-center gap-5">
                              <div className="grid min-w-0 gap-0.5">
                                <small className="flex items-center gap-1.5 text-xs font-semibold text-[#5b6778]">
                                  <MapPin className="size-4 text-[#0f8a4b]" aria-hidden="true" /> From
                                </small>
                                <b className="wrap-break-word text-lg font-extrabold leading-snug text-[#0a2a5e]">{sample.matched.from}</b>
                              </div>
                              <div className="flex items-center">
                                <span className="size-3 shrink-0 rounded-full border-[3px] border-[#0f8a4b]" aria-hidden="true" />
                                <span className="min-w-4 flex-1 border-t-2 border-dashed border-[#b9cdea]" aria-hidden="true" />
                                <span className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-[#cfe0f8] bg-[#eef5ff] px-4 py-2 text-sm font-bold text-[#0a2a5e]">
                                  {params.tripType === "round_trip" ? <ArrowLeftRight className="size-4 text-[#1f74ee]" aria-hidden="true" /> : <CarFront className="size-4 text-[#1f74ee]" aria-hidden="true" />}
                                  {km} Km
                                  <i className="not-italic text-[#9aa5b5]" aria-hidden="true">
                                    •
                                  </i>
                                  ~{sample.durationHours} hr(s){params.tripType === "round_trip" ? " one way" : ""}
                                </span>
                                <span className="min-w-4 flex-1 border-t-2 border-dashed border-[#b9cdea]" aria-hidden="true" />
                                <span className="size-3 shrink-0 rounded-full border-[3px] border-[#e0483c]" aria-hidden="true" />
                              </div>
                              <div className="grid min-w-0 justify-items-end gap-0.5 text-right">
                                <small className="flex items-center gap-1.5 text-xs font-semibold text-[#5b6778]">
                                  <MapPin className="size-4 text-[#e0483c]" aria-hidden="true" /> To
                                </small>
                                <b className="wrap-break-word text-lg font-extrabold leading-snug text-[#0a2a5e]">{sample.matched.to}</b>
                              </div>
                            </div>
                            <p className="text-center text-xs text-[#7a8696]">Distance is approximate. Not the right place? Change it above and pick from the suggestions.</p>
                          </div>
                        ) : null}
                        {/* phones and tablets (and laptops when the matched places are unknown): stacked */}
                        <div className={sample.matched ? "lg:hidden" : undefined}>
                          <div className="grid grid-cols-2 divide-x divide-[#dbe6f3] bg-[#f1f6fe]">
                            {[
                              { Icon: Route, value: `${km} Km`, label: "Approx. distance" },
                              { Icon: Clock3, value: `${sample.durationHours} hr(s)`, label: `Approx. time${params.tripType === "round_trip" ? " one way" : ""}` },
                            ].map(({ Icon, value, label }) => (
                              <div key={label} className="flex min-w-0 items-center gap-3 px-3.5 py-3 sm:px-5">
                                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#1f74ee] text-white">
                                  <Icon className="size-5" aria-hidden="true" />
                                </span>
                                <span className="grid min-w-0">
                                  <b className="text-lg font-extrabold leading-tight text-[#0a2a5e]">{value}</b>
                                  <small className="text-xs text-[#5b6778]">{label}</small>
                                </span>
                              </div>
                            ))}
                          </div>
                          {sample.matched ? (
                            <div className="grid gap-3 border-t border-[#dbe6f3] px-3.5 py-3.5 sm:px-5">
                              <div className="grid gap-2 sm:grid-cols-2 sm:gap-5">
                                {[
                                  { label: "From", place: sample.matched.from, color: "text-[#0f8a4b]" },
                                  { label: "To", place: sample.matched.to, color: "text-[#e0483c]" },
                                ].map(({ label, place, color }) => (
                                  <Fragment key={label}>
                                    {/* phones: the two places are stacked, so the arrow points down (the span hides it: svg ignores "hidden") */}
                                    {label === "To" ? (
                                      <span className="sm:hidden">
                                        <ArrowDown className="size-5 text-[#9aa5b5]" aria-hidden="true" />
                                      </span>
                                    ) : null}
                                    <div className="flex min-w-0 items-start gap-2.5">
                                      <MapPin className={`mt-0.5 size-5 shrink-0 ${color}`} aria-hidden="true" />
                                      <span className="grid min-w-0">
                                        <small className="text-xs font-semibold text-[#5b6778]">{label}</small>
                                        <b className="wrap-break-word text-sm font-semibold leading-snug text-[#0f1b2d]">{place}</b>
                                      </span>
                                    </div>
                                  </Fragment>
                                ))}
                              </div>
                              <p className="rounded-lg bg-[#fff8e6] px-3 py-2 text-[12.5px] leading-snug text-[#6b5314]">
                                <b>Not the right place?</b> Change it above and pick from the suggestions.
                              </p>
                            </div>
                          ) : null}
                        </div>
                        {params.stops.length > 0 ? (
                          <p className="border-t border-[#dbe6f3] px-3.5 py-3 text-sm text-[#3d4a5c] sm:px-5">
                            <b>
                              {params.stops.length} extra {params.stops.length === 1 ? "stop" : "stops"}
                            </b>{" "}
                            ({params.stops.join(", ")}) add {formatINR(stopsCharge)} at checkout
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="bk-info-pills">
                        {isAirport(params.tripType) ? (
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
                    )}
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
