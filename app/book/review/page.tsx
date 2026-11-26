import type { Metadata } from "next";
import { ArrowRight, Briefcase, CalendarDays, Car, Check, CheckCircle2, ChevronRight, CircleX, Clock3, FileText, Fuel, Info, MapPin, MapPinned, Pencil, Route, ShieldCheck, Snowflake, ThumbsUp, UserRound, Users, Wind } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReviewForm } from "@/components/booking/review-form";
import { PageShell } from "@/components/site/page-shell";
import { BookingBand } from "@/components/booking/booking-band";
import { SectionCard } from "@/components/booking/section-card";
import { photoSrc } from "@/lib/cms/images";
import {
  TRIP_TYPE_LABEL,
  buildQuote,
  describeMinutes,
  departureAt,
  formatDate,
  formatINR,
  isAirport,
  isOutstation,
  pickupTooSoon,
  to12h,
} from "@/lib/booking/config";
import { tripDays } from "@/lib/booking/outstation";
import { refundSentence } from "@/lib/booking/refund";
import { cabHeading, listOffer } from "@/lib/booking/fleet";
import { linesFor } from "@/lib/booking/extras";
import {
  isSearchComplete,
  parseRouteId,
  parseSearch,
  parseVehicle,
  searchToQuery,
} from "@/lib/booking/search";
import { CustomerReviews } from "@/components/booking/customer-reviews";
import { getHomeReviews, getVehicleReviews } from "@/lib/server/bookings/reviews";
import { getLocalPlaces } from "@/lib/server/bookings/places";
import { lookupTripFare } from "@/lib/server/bookings/service";
import { getBookingExtras, getBookingPage, getBookingSettings, getFleet } from "@/lib/server/cms/content";
import { getProfile } from "@/lib/server/auth/profile";
import { getSession } from "@/lib/server/auth/session";
import { ui } from "@/components/ui/styles";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = {
  title: "Review booking",
  robots: { index: false, follow: false },
};

const freeUntilFormat = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
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
  if (!isSearchComplete(search) || !vehicle) redirect("/book");

  const here = `/book/review?${searchToQuery({ ...search, routeId: routeId || undefined, vehicle })}`;
  const loginPath = `/login?next=${encodeURIComponent(here)}`;
  // like MakeMyTrip, the review page is open to everyone; login (email code) is asked when the customer pays
  const session = await getSession();
  // a signed-in customer finds the name and mobile from My profile already filled in
  const profile = session ? await getProfile(session.customerId, session.email).catch(() => null) : null;

  const fare = await lookupTripFare({
    tripType: search.tripType,
    routeId,
    vehicle,
    from: search.from,
    airport: search.airport,
    pkg: search.pkg,
    address: search.address,
    to: search.to,
    stops: search.stops,
    date: search.date,
    returnDate: search.returnDate || null,
  }).catch((error) => {
    console.error("Fare lookup failed", error);
    return null;
  });
  if (!fare) redirect("/book");

  const [settings, extras, fleet] = await Promise.all([getBookingSettings(), getBookingExtras(), getFleet()]);
  if (!settings.onlineBookingEnabled) redirect("/book");
  // sooner than the owner's "Earliest bookable pickup": back to the results, which say why
  if (pickupTooSoon(search.date, search.time, settings.minLeadMinutes)) redirect(`/book?${searchToQuery(search)}`);
  const meta = fleet.find((item) => item.title === fare.vehicle);
  const bookingPage = await getBookingPage();
  const places = await getLocalPlaces();
  const customerReviews = bookingPage.enableReviews ? await getVehicleReviews(fare.vehicle, 20) : { summary: null, reviews: [] };
  // a cab nobody has reviewed yet: show the reviews of the business as a whole (website and owner-added), clearly worded so
  const allReviews = bookingPage.enableReviews && !customerReviews.summary ? await getHomeReviews(20) : null;
  const heading = cabHeading(fare.vehicle, meta?.models ?? "");
  const bootBags = meta?.bags ?? 2;
  const includedKm = fare.billedKm ?? fare.distanceKm * (search.tripType === "round_trip" ? 2 : 1);
  // the "minimum km per day" rule applies to every day of a round trip (a same-day trip too)
  const tripLengthDays = tripDays(search.date, search.tripType === "round_trip" ? search.returnDate : null);
  const minKmDay = meta?.minKmPerDay ?? 0;
  const airportTrip = isAirport(search.tripType);
  const hourly = search.tripType === "hourly";
  // outstation places can be a long typed address ("Accenture Pune, Mundhwa, Pune, Maharashtra"): the first part is the heading, the rest goes small below it
  const placeHead = (place: string) => (isOutstation(search.tripType) ? place.split(",")[0].trim() || place : place);
  const placeRest = (place: string) => (isOutstation(search.tripType) ? place.split(",").slice(1).join(",").trim() : "");
  const stopCharge = Math.round(extras.stopCharge * 100);
  const serviceFee = Math.round(extras.serviceFee * 100);
  const fareTotal = buildQuote({ baseFare: fare.fare, serviceFee, withInsurance: false, payMode: "full" }, settings).total;
  const showTravellers = isOutstation(search.tripType) || (airportTrip ? bookingPage.airportAskTravellers : bookingPage.hourlyAskTravellers);
  const departure = departureAt(search.date, search.time);
  const freeUntil = freeUntilFormat.format(new Date(departure.getTime() - settings.freeCancelMinutes * 60_000));
  const cancelAfter = settings.freeCancelMinutes > 0;
  const activeAddons = extras.addons.filter((addon) => addon.active);
  const activeCoupons = extras.coupons.filter((coupon) => coupon.active);
  // the owner picks, per line, which trip types it is shown on (Admin > Online booking > Fees & extras)
  // a driver allowance with an amount (Vehicles) already has its own line with the rupees: the owner's general
  // "Driver allowance" lines would only repeat it (or, as an exclusion, contradict it)
  const allowanceShown = isOutstation(search.tripType) && (meta?.driverAllowance ?? 0) > 0;
  const notRepeated = (item: { title: string }) => !(allowanceShown && /driver\s*(allowance|charge|bhatta)/i.test(item.title));
  const inclusions = linesFor(extras.inclusions, search.tripType).filter(notRepeated);
  // round trip: the expected toll is written into the owner's toll exclusion, or gets a line of its own
  const ownExclusions = linesFor(extras.exclusions, search.tripType).filter(notRepeated);
  const tollNote = fare.tollApprox ? `Toll about ${formatINR(fare.tollApprox * 100)} (FASTag estimate, there and back).` : "";
  const exclusions = !tollNote
    ? ownExclusions
    : ownExclusions.some((item) => /toll/i.test(item.title))
      ? ownExclusions.map((item) => (/toll/i.test(item.title) ? { ...item, text: `${tollNote} ${item.text}`.trim() } : item))
      : [{ ...ownExclusions[0], title: "Toll charges", text: `${tollNote} Paid extra, as per receipt.` }, ...ownExclusions];
  // airport rows can carry their own extra-km rate; otherwise the vehicle's rate from the Fleet
  const extraKmRate = fare.extraKmRate ?? meta?.extraKmRate ?? 0;

  return (
    <PageShell footer={false}>
      <div className="mmt">
        <BookingBand title="Review booking" wide curved>
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 text-white">
            <div className="grid min-w-0 max-w-full gap-4">
              <div className="min-w-0">
                {/* one line: a long typed address is cut with "..." instead of filling the header; the full text is in the tooltip */}
                <p className="flex min-w-0 items-center gap-x-1.5 text-sm text-white/70">
                  <span className="shrink-0">{TRIP_TYPE_LABEL[search.tripType]}</span>
                  <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 truncate" title={hourly ? `${fare.fromCity}, ${fare.toCity}` : `${fare.fromCity} to ${fare.toCity}`}>
                    {hourly ? `${fare.fromCity}, ${fare.toCity}` : `${placeHead(fare.fromCity)} to ${placeHead(fare.toCity)}`}
                  </span>
                </p>
                <p className="font-(family-name:--font-display) text-3xl font-extrabold leading-tight sm:text-[2.6rem]">Review Booking</p>
              </div>
              {/* three steps on one line also on a phone: the middle label is shortened there */}
              <ol className="m-0 flex list-none items-center gap-x-1.5 p-0 text-[12.5px] font-semibold sm:gap-x-2 sm:text-[13px]" aria-label="Booking steps">
                {[
                  { label: "Select Cab", short: "Select Cab", state: "done" },
                  { label: "Review & Traveller Details", short: "Review", state: "active" },
                  { label: "Payment", short: "Payment", state: "todo" },
                ].map((step, index) => (
                  <li key={step.label} className="flex items-center gap-1.5 sm:gap-2">
                    {index > 0 ? <span className="h-px w-3 bg-white/30 sm:w-8" aria-hidden="true" /> : null}
                    <span
                      className={cn(
                        "grid size-6 place-items-center rounded-full text-xs font-bold",
                        step.state === "done" && "bg-ok text-white",
                        step.state === "active" && "bg-white text-[#0b2c52] shadow-[0_0_0_4px_rgba(255,255,255,0.18)]",
                        step.state === "todo" && "bg-white/15 text-white/70",
                      )}
                    >
                      {step.state === "done" ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                    </span>
                    <span className={cn("whitespace-nowrap", step.state === "todo" ? "text-white/60" : "text-white")}>
                      <span className="sm:hidden">{step.short}</span>
                      <span className="hidden sm:inline">{step.label}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="mmt-glass hidden gap-0.5 px-6 py-3.5 text-center sm:grid">
              <p className="text-sm font-semibold text-white/80">Fare From</p>
              <p className="font-(family-name:--font-display) text-3xl font-extrabold leading-none">{formatINR(fareTotal)}</p>
              <p className="text-sm text-white/80">{fare.vehicle} • Incl. taxes</p>
            </div>
          </div>
        </BookingBand>

      <section className="mmt-body">
        <div className="mmt-wrap mmt-wrap--wide grid gap-5">
          <ReviewForm
            routeId={fare.routeId}
            vehicle={fare.vehicle}
            tripType={search.tripType}
            from={search.from}
            to={search.to}
            airport={search.airport}
            pkg={search.pkg}
            stops={isOutstation(search.tripType) ? search.stops : []}
            stopCharge={stopCharge}
            prefillAddress={search.address}
            loggedIn={!!session}
            gstEnabled={bookingPage.enableGstDetails}
            serviceFee={serviceFee}
            serviceFeeLabel={extras.serviceFeeLabel}
            showCoupons={bookingPage.showCoupons}
            suggestions={bookingPage.addressSuggestions}
            places={places}
            date={search.date}
            time={search.time}
            returnDate={search.returnDate}
            passengers={search.passengers}
            bags={search.bags}
            baseFare={fare.fare}
            distanceBreakup={fare.breakup}
            airportExtra={fare.airportExtra}
            offer={listOffer(fare.fare - (fare.allowance ?? 0) - (fare.breakup?.toll ?? 0), meta?.listDiscountPercent)}
            allowance={fare.allowance ? { perDay: meta?.driverAllowance ?? 0, days: fare.allowanceDays ?? 1, total: fare.allowance } : undefined}
            rules={{
              gstPercent: settings.gstPercent,
              partPayPercent: settings.partPayPercent,
              insuranceEnabled: settings.insuranceEnabled,
              insuranceRupees: settings.insuranceRupees,
              balanceCutoffHours: settings.balanceCutoffHours,
            }}
            addons={activeAddons}
            coupons={activeCoupons}
            defaultEmail={session?.email ?? ""}
            defaultName={profile?.name ?? ""}
            defaultPhone={profile?.phone ?? ""}
            loginPath={loginPath}
          >
            {/* left column, server rendered: trip, cab, inclusions, cancellation policy */}
            <SectionCard
              icon={<MapPinned aria-hidden="true" />}
              title="Your Trip"
              aside={
                <Link className="inline-flex items-center gap-1.5 rounded-full border border-[#b9d2f3] bg-white px-4 py-2 text-[14px] font-semibold text-[#0a47bf] no-underline transition hover:border-brand hover:bg-brand/5" href={`/book?${searchToQuery(search)}`}>
                  <Pencil className="size-3.5" aria-hidden="true" /> Change
                </Link>
              }
            >
              <div className="grid gap-5">
                {hourly ? (
                  <div>
                    <p className="font-(family-name:--font-display) text-2xl font-extrabold leading-tight">{fare.fromCity}</p>
                    <p className="text-sm text-muted">
                      Package {fare.toCity}: {fare.hours} hr(s) and {fare.distanceKm} km included
                    </p>
                  </div>
                ) : (
                  /* phone: From, the route line and To stack one under the other, so a long place name has the full width; from sm up they sit side by side */
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(86px,1.1fr)_minmax(0,1fr)] sm:items-center sm:gap-5">
                    <div className="min-w-0">
                      <p className="rv-endpoint"><MapPin aria-hidden="true" /> From</p>
                      <p className="font-(family-name:--font-display) text-[1.45rem] font-extrabold leading-tight [overflow-wrap:anywhere] sm:text-[1.9rem]">{placeHead(fare.fromCity)}</p>
                      <p className="text-sm text-muted">{placeRest(fare.fromCity) || (search.tripType === "airport_pickup" ? "Airport pickup" : airportTrip ? "Your pickup location" : "Pickup city")}</p>
                    </div>
                    <div className="grid justify-items-center gap-1.5">
                      {isOutstation(search.tripType) && fare.distanceKm > 0 ? (
                        <span className="rounded-full bg-(--panel-soft) px-2.5 py-0.5 text-[11px] font-bold text-muted">
                          {includedKm} km · ~{fare.durationHours} hrs
                        </span>
                      ) : null}
                      <div className="flex w-full items-center gap-1.5 text-brand">
                        <span className="size-2.5 flex-none rounded-full border-2 border-brand bg-white" aria-hidden="true" />
                        <span className="h-0 flex-1 border-t-2 border-dashed border-brand/50" aria-hidden="true" />
                        <span className="grid size-8 flex-none place-items-center rounded-full bg-brand text-white shadow-md">
                          <Car className="size-4" aria-hidden="true" />
                        </span>
                        <span className="h-0 flex-1 border-t-2 border-dashed border-brand/50" aria-hidden="true" />
                        <span className="size-2.5 flex-none rounded-full bg-brand" aria-hidden="true" />
                      </div>
                    </div>
                    <div className="min-w-0 sm:text-right">
                      <p className="rv-endpoint sm:justify-end"><MapPin aria-hidden="true" /> To</p>
                      <p className="font-(family-name:--font-display) text-[1.45rem] font-extrabold leading-tight [overflow-wrap:anywhere] sm:text-[1.9rem]">{placeHead(fare.toCity)}</p>
                      <p className="text-sm text-muted">{placeRest(fare.toCity) || (search.tripType === "airport_drop" ? "Airport drop" : airportTrip ? "Your drop location" : "Drop city")}</p>
                    </div>
                  </div>
                )}

                {isOutstation(search.tripType) && search.stops.length > 0 ? (
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <b>Stops:</b>
                    {search.stops.map((stop) => (
                      <span key={stop} className="rounded-full bg-brand/10 px-3 py-0.5 font-semibold text-brand">
                        {stop}
                      </span>
                    ))}
                  </p>
                ) : null}

                {/* ticket perforation */}
                <div className="relative -mx-4 sm:-mx-5" aria-hidden="true">
                  <div className="border-t-2 border-dashed border-line" />
                  <span className="absolute -left-3 -top-3 size-6 rounded-full border border-line bg-(--page)" />
                  <span className="absolute -right-3 -top-3 size-6 rounded-full border border-line bg-(--page)" />
                </div>

                <ul className={cn("m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3", search.tripType === "round_trip" && "sm:grid-cols-2 lg:grid-cols-4")}>
                  {[
                    { icon: CalendarDays, label: "Pickup date", value: formatDate(search.date) },
                    { icon: Clock3, label: "Pickup time", value: to12h(search.time) },
                    ...(search.tripType === "round_trip" ? [{ icon: CalendarDays, label: "Return date", value: formatDate(search.returnDate) }] : []),
                    ...(showTravellers
                      ? [
                          {
                            icon: Users,
                            label: "Travellers",
                            value: `${search.passengers}${search.bags > 0 ? ` · ${search.bags} ${search.bags === 1 ? "bag" : "bags"}` : ""}`,
                          },
                        ]
                      : []),
                  ].map(({ icon: Icon, label, value }) => (
                    <li key={label} className="flex items-center gap-3 rounded-xl bg-(--panel-soft) p-3 transition hover:-translate-y-0.5 hover:shadow-md last:col-span-2 sm:last:col-span-1">
                      <span className="grid size-9 flex-none place-items-center rounded-full bg-white text-brand shadow-sm">
                        <Icon className="size-[18px]" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <small className="block text-[13px] font-medium text-[#4a5668]">{label}</small>
                        <b className="block text-[15px] leading-tight">{value}</b>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </SectionCard>

            <SectionCard icon={<Car aria-hidden="true" />} title="Your Cab" bodyClassName="p-0 sm:p-0">
              <div className="grid sm:grid-cols-[200px_minmax(0,1fr)]">
                {/* the photo has its own white background: show it edge to edge at its real proportions, with no tinted frame or padding around it */}
                <div className="relative grid place-items-center bg-white">
                  {meta ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoSrc(meta, 480)} alt={`${fare.vehicle} by Veera Tours & Travels`} width={240} height={126} loading="lazy" decoding="async" className="block h-auto w-full" />
                  ) : null}
                </div>
                <div className="grid content-center gap-2.5 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="font-(family-name:--font-display) text-xl font-extrabold leading-tight">
                      {heading.name}
                      {heading.similar ? <span className="ml-2 text-sm font-normal text-muted">or similar</span> : null}
                    </h3>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-brand">
                      <Fuel className="size-3.5" aria-hidden="true" /> {meta?.fuel || "Diesel"}
                    </span>
                  </div>
                  <p className="text-sm text-muted">{fare.vehicle}</p>
                  <ul className="m-0 flex list-none flex-wrap gap-2 p-0 text-[13px] font-semibold">
                    <li className="inline-flex items-center gap-1.5 rounded-full bg-(--panel-soft) px-3 py-1">
                      {meta?.ac === "Non-AC" ? <Wind className="size-3.5 text-brand" aria-hidden="true" /> : <Snowflake className="size-3.5 text-brand" aria-hidden="true" />} {meta?.ac ?? "AC"}
                    </li>
                    <li className="inline-flex items-center gap-1.5 rounded-full bg-(--panel-soft) px-3 py-1">
                      <Users className="size-3.5 text-brand" aria-hidden="true" /> Seats {meta?.capacity ?? "-"}
                    </li>
                    <li className="inline-flex items-center gap-1.5 rounded-full bg-(--panel-soft) px-3 py-1">
                      <Briefcase className="size-3.5 text-brand" aria-hidden="true" /> {bootBags} bags in the boot
                    </li>
                    <li className="inline-flex items-center gap-1.5 rounded-full bg-ok/15 px-3 py-1 text-ok">
                      <ThumbsUp className="size-3.5" aria-hidden="true" /> Best Fit
                    </li>
                  </ul>
                  <p className="text-sm text-muted">
                    Comfortably fits <b className="text-(--text)">{bootBags} bags</b> in the boot space
                    {search.bags > bootBags ? ` (you have ${search.bags}, add a roof carrier below)` : ""}
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={<Check aria-hidden="true" />} title="Inclusions">
              <ul className="rv-incl">
                {hourly || includedKm > 0 ? (
                  <li>
                    <span className="rv-incl-icon">
                      <Route aria-hidden="true" />
                    </span>
                    <span>
                      <b>{hourly ? `${fare.hours} hrs & ${includedKm} Km included` : `${includedKm} Km included`}</b>
                      <small>
                        {hourly || extraKmRate > 0 ? "Extra km charges are shown under Exclusions below" : "Extra kms are charged beyond the included kms"}
                      </small>
                    </span>
                  </li>
                ) : null}
                {search.tripType === "round_trip" && minKmDay > 0 ? (
                  <li>
                    <span className="rv-incl-icon">
                      <Route aria-hidden="true" />
                    </span>
                    <span>
                      <b>Minimum {minKmDay} km per day</b>
                      <small>
                        {tripLengthDays === 1
                          ? `At least ${minKmDay} km is charged for your trip, even if the cab runs less.`
                          : `Your trip is ${tripLengthDays} days, so at least ${tripLengthDays * minKmDay} km (${tripLengthDays} x ${minKmDay}) is charged, even if the cab runs less.`}
                      </small>
                    </span>
                  </li>
                ) : null}
                {isOutstation(search.tripType) && (meta?.driverAllowance ?? 0) > 0 ? (
                  <li>
                    <span className="rv-incl-icon rv-incl-icon--extra">
                      <UserRound aria-hidden="true" />
                    </span>
                    <span>
                      <b>Driver allowance: ₹{meta?.driverAllowance} per day, included</b>
                      <small>
                        {fare.allowance
                          ? `Already in the fare: ${formatINR(fare.allowance)} for ${fare.allowanceDays} ${fare.allowanceDays === 1 ? "day" : "days"}.`
                          : "It is included in the fare for each day of the trip."}
                      </small>
                    </span>
                  </li>
                ) : null}
                {inclusions.map((item) => {
                  const Icon = /driver/i.test(item.title) ? UserRound : /fuel/i.test(item.title) ? Fuel : Check;
                  return (
                    <li key={item.title}>
                      <span className="rv-incl-icon rv-incl-icon--ok">
                        <Icon aria-hidden="true" />
                      </span>
                      <span>
                        <b>{item.title}</b>
                        {item.text ? <small>{item.text}</small> : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {hourly || extraKmRate > 0 || exclusions.length > 0 ? (
                <>
                  <h3 className="flex items-center gap-2 pt-5 pb-3 text-[15px] font-bold">
                    <CircleX className="size-[18px] text-[#b86e00]" aria-hidden="true" /> Exclusions (paid extra)
                  </h3>
                  <ul className="rv-incl">
                    {hourly || extraKmRate > 0 ? (
                      <li>
                        <span className="rv-incl-icon rv-incl-icon--extra">
                          <Route aria-hidden="true" />
                        </span>
                        <span>
                          <b>
                            {hourly
                              ? `Extra km ₹${fare.extraKmRate ?? 0}/km, extra hour ₹${fare.extraHourRate ?? 0}/hr`
                              : `Extra km: ₹${extraKmRate}/km`}
                          </b>
                          <small>{includedKm > 0 ? `Charged beyond the ${includedKm} km${hourly ? ` and ${fare.hours} hrs` : ""} in your fare.` : "Charged for any km beyond the trip."}</small>
                        </span>
                      </li>
                    ) : null}
                    {exclusions.map((item) => (
                      <li key={item.title}>
                        <span className="rv-incl-icon rv-incl-icon--extra">
                          <Info aria-hidden="true" />
                        </span>
                        <span>
                          <b>{item.title}</b>
                          {item.text ? <small>{item.text}</small> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              <div className="rv-policies">
                <Link href="/terms" target="_blank">
                  <FileText aria-hidden="true" /> View policies <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            </SectionCard>

            <SectionCard icon={<ShieldCheck aria-hidden="true" />} title="Cancellation Policy">
              {cancelAfter ? (
                <p className="rv-free">
                  <CheckCircle2 aria-hidden="true" />
                  <b>Free cancellation until {freeUntil}</b>
                  <span>({describeMinutes(settings.freeCancelMinutes)} before pick up time)</span>
                </p>
              ) : (
                <p className="rv-free rv-free--no">
                  <b>Free cancellation is not available for this trip.</b>
                </p>
              )}
              <div className="rv-timeline" aria-hidden="true">
                <div className="rv-bar">
                  <span>
                    <i />
                  </span>
                </div>
                <div className="rv-timeline-labels">
                  <div>
                    <b>Now</b>
                    <em className="rv-ok">100% refund</em>
                  </div>
                  <div className="rv-mid">
                    <CalendarDays /> {cancelAfter ? freeUntil : ""}
                  </div>
                  <div className="rv-end">
                    <b>Pickup</b>
                    <em className="rv-no">No refund</em>
                  </div>
                </div>
              </div>
              <p className="rv-note">
                <Info aria-hidden="true" />
                <span>
                  {refundSentence(settings.freeCancelMinutes, settings.refundSlabs)}{" "}
                  <Link href="/cancellation-policy" target="_blank">
                    View cancellation policy <ArrowRight aria-hidden="true" />
                  </Link>
                </span>
              </p>
            </SectionCard>
            <CustomerReviews summary={customerReviews.summary} reviews={customerReviews.reviews} vehicle={fare.vehicle} all={allReviews} />
          </ReviewForm>
          <p className={ui.muted}>
            Your fare is fixed for this route and vehicle. Your confirmation lists anything that is paid separately.
          </p>
        </div>
      </section>
      </div>
    </PageShell>
  );
}
