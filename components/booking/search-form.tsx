"use client";

import { CalendarDays, CarFront, Clock3, MapPin, Navigation, Plane, Plus, Search, Timer, Users, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LocationField } from "@/components/booking/location-field";
import { SCROLL_FLAG } from "@/components/booking/scroll-to-results";
import { TravellersField } from "@/components/booking/travellers-field";
import { DateField } from "@/components/site/date-field";
import { SelectField } from "@/components/site/select-field";
import { TimeField } from "@/components/site/time-field";
import { isAirport, isOutstation, to12h, to24h, type BookingTripType } from "@/lib/booking/config";
import { quoteHref } from "@/lib/booking/quote";
import { searchToQuery, type SearchParams } from "@/lib/booking/search";
import type { SearchOptions } from "@/lib/server/bookings/service";
import { ui } from "@/components/ui/styles";
import { cn } from "@/lib/utils/cn";

/** The four tabs of the search box. "Airport Transfers" covers airport_pickup and airport_drop. */
const TABS: { id: string; label: string; icon: LucideIcon; types: BookingTripType[] }[] = [
  { id: "one_way", label: "Outstation One-Way", icon: CarFront, types: ["one_way"] },
  { id: "round_trip", label: "Outstation Round-Trip", icon: CarFront, types: ["round_trip"] },
  { id: "airport", label: "Airport Transfers", icon: Plane, types: ["airport_pickup", "airport_drop"] },
  { id: "hourly", label: "Hourly Rentals", icon: Clock3, types: ["hourly"] },
];

/** The phone layout groups the four tabs into three (One-Way and Round-Trip share "Outstation"). */
const MOBILE_TABS: { id: string; label: string; icon: LucideIcon; tabs: string[] }[] = [
  { id: "outstation", label: "Outstation Cabs", icon: CarFront, tabs: ["one_way", "round_trip"] },
  { id: "airport", label: "Airport Cabs", icon: Plane, tabs: ["airport"] },
  { id: "hourly", label: "Hourly Rentals", icon: Clock3, tabs: ["hourly"] },
];

type Props = {
  options: Pick<SearchOptions, "cities" | "stopCities" | "airports" | "places" | "hourlyCities" | "hourlyPackages">;
  initial: SearchParams;
  /** Ids of the tabs to show (one_way, round_trip, airport, hourly). */
  tabs: string[];
  /** Most extra stops a customer may add; 0 hides "Add Stops". */
  maxStops: number;
  /** One-Way tab: optional Return date that turns the search into a round trip. */
  oneWayReturn: boolean;
  returnHint: string;
  /** Show "Travellers & Bags" on these tabs (outstation always has it). */
  askTravellers: { airport: boolean; hourly: boolean };
  /** Suggest addresses while typing. */
  suggestions: boolean;
  /** Scroll target after searching, e.g. "results" (used by the home page so the visitor lands on the cab list). */
  landOn?: string;
};

/** The airport a typed place refers to, or "" when it is not one of the owner's airports. */
function airportOf(text: string, airports: string[]): string {
  const t = text.trim().toLowerCase();
  if (!t) return "";
  return airports.find((name) => name.toLowerCase() === t) ?? airports.find((name) => t.includes(name.toLowerCase())) ?? "";
}

export function SearchForm({ options, initial, tabs, maxStops, oneWayReturn, returnHint, askTravellers, suggestions, landOn }: Props) {
  const router = useRouter();
  const visibleTabs = TABS.filter((tab) => tabs.includes(tab.id));

  // a round-trip search opened while the Round-Trip tab is off lands on One-Way with the return date filled
  const startType: BookingTripType = visibleTabs.some((tab) => tab.types.includes(initial.tripType))
    ? initial.tripType
    : initial.tripType === "round_trip" && oneWayReturn
      ? "one_way"
      : (visibleTabs[0] ?? TABS[0]).types[0];
  const [tripType, setTripType] = useState<BookingTripType>(startType);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [date, setDate] = useState(initial.date);
  const [returnDate, setReturnDate] = useState(initial.returnDate);
  const [time, setTime] = useState(initial.time ? to12h(initial.time) : "");
  const [passengers, setPassengers] = useState(initial.passengers);
  const [bags, setBags] = useState(initial.bags);
  // airport tab: two places, one of them an airport (like MakeMyTrip)
  const [airportFrom, setAirportFrom] = useState(initial.tripType === "airport_drop" ? initial.address : initial.airport);
  const [airportTo, setAirportTo] = useState(initial.tripType === "airport_drop" ? initial.airport : initial.address);
  const [pkg, setPkg] = useState(initial.pkg);
  const [stops, setStops] = useState<string[]>(initial.stops);
  const [error, setError] = useState("");

  const activeTab = visibleTabs.find((tab) => tab.types.includes(tripType)) ?? visibleTabs[0] ?? TABS[0];
  const outstation = isOutstation(tripType);
  const airportTrip = isAirport(tripType);
  const hourly = tripType === "hourly";
  const showReturn = tripType === "round_trip" || (tripType === "one_way" && oneWayReturn);
  const showTravellers = outstation || (airportTrip && askTravellers.airport) || (hourly && askTravellers.hourly);
  const toOptions = from ? (options.cities.to[from] ?? []) : [];
  const packages = from ? (options.hourlyPackages[from] ?? []) : [];

  const pickTab = (id: string) => {
    const tab = visibleTabs.find((item) => item.id === id);
    if (!tab || tab.id === activeTab.id) return;
    setTripType(tab.types[0]);
    setError("");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const pickup = to24h(time);
    let finalType = tripType;
    let airport = "";
    let address = "";

    if (outstation) {
      if (!from || !to) return setError("Choose where you are travelling from and to.");
    } else if (airportTrip) {
      if (airportFrom.trim().length < 3 || airportTo.trim().length < 3) return setError("Enter both the pickup and the drop location.");
      const a = airportOf(airportFrom, options.airports);
      const b = airportOf(airportTo, options.airports);
      if (a && !b) {
        finalType = "airport_pickup";
        airport = a;
        address = airportTo.trim();
      } else if (b && !a) {
        finalType = "airport_drop";
        airport = b;
        address = airportFrom.trim();
      } else {
        return setError(`One of the two locations must be an airport we serve${options.airports.length ? `, for example ${options.airports[0]}` : ""}.`);
      }
    } else if (!from || !pkg) {
      return setError("Choose the city and the package.");
    }
    if (!date) return setError("Choose your pickup date.");
    if (!pickup) return setError("Choose your pickup time.");
    if (tripType === "round_trip" && (!returnDate || returnDate < date)) return setError("Choose a return date on or after the pickup date.");
    if (tripType === "one_way" && oneWayReturn && returnDate) {
      if (returnDate < date) return setError("Choose a return date on or after the pickup date.");
      finalType = "round_trip"; // adding a return date makes it a round trip
    }
    setError("");

    const query = searchToQuery({
      tripType: finalType,
      date,
      time: pickup,
      passengers: showTravellers ? passengers : 1,
      bags: showTravellers ? bags : 0,
      ...(outstation ? { from, to, stops: stops.filter(Boolean), returnDate: finalType === "round_trip" ? returnDate : "" } : {}),
      ...(airportTrip ? { airport, address } : {}),
      ...(hourly ? { from, pkg } : {}),
    });
    try {
      sessionStorage.setItem(SCROLL_FLAG, "1");
    } catch {
      // storage blocked: the search still works, it just will not auto-scroll
    }
    router.push(`/book?${query}${landOn ? `#${landOn}` : ""}`);
  };

  return (
    <form className={cn(ui.card, ui.searchCard, "mmt-search")} onSubmit={submit} noValidate>
      {/* phones: three big tabs and a One Way / Round Trip choice, like the MakeMyTrip app */}
      <div className="bk-mtabs" role="group" aria-label="Service">
        {MOBILE_TABS.filter((group) => group.tabs.some((id) => tabs.includes(id))).map((group) => {
          const target = group.tabs.find((id) => tabs.includes(id)) ?? group.tabs[0];
          const on = group.tabs.includes(activeTab.id);
          return (
            <button type="button" key={group.id} className={cn("bk-mtab", on && "is-active")} aria-pressed={on} onClick={() => (on ? undefined : pickTab(target))}>
              <group.icon aria-hidden="true" />
              {group.label}
            </button>
          );
        })}
      </div>
      {outstation && tabs.includes("one_way") && tabs.includes("round_trip") ? (
        <div className="bk-mradio" role="radiogroup" aria-label="Trip type">
          {[
            { id: "one_way", label: "One Way" },
            { id: "round_trip", label: "Round Trip" },
          ].map((item) => (
            <button type="button" key={item.id} role="radio" aria-checked={activeTab.id === item.id} className={cn(activeTab.id === item.id && "is-on")} onClick={() => pickTab(item.id)}>
              <i aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="trip-tabs bk-dtabs" role="group" aria-label="Trip type">
        {visibleTabs.map((tab) => (
          <button
            type="button"
            key={tab.id}
            className={`trip-tab${activeTab.id === tab.id ? " is-active" : ""}`}
            aria-pressed={activeTab.id === tab.id}
            onClick={() => pickTab(tab.id)}
          >
            <tab.icon className="size-[18px]" aria-hidden="true" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="form-grid">
        {outstation ? (
          <>
            <div className="field">
              <label htmlFor="bk-from">
                <MapPin aria-hidden="true" /> From
              </label>
              <div className="field-control">
                <MapPin aria-hidden="true" />
                <SelectField
                  id="bk-from"
                  value={from}
                  options={options.cities.from}
                  placeholder="Pickup city"
                  onChange={(value) => {
                    setFrom(value);
                    if (!(options.cities.to[value] ?? []).includes(to)) setTo("");
                  }}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="bk-to">
                <MapPin aria-hidden="true" /> To
              </label>
              <div className="field-control">
                <Navigation aria-hidden="true" />
                <SelectField id="bk-to" value={to} options={toOptions} placeholder="Choose destination" onChange={setTo} />
              </div>
            </div>
          </>
        ) : null}

        {airportTrip ? (
          <>
            <div className="field">
              <label htmlFor="bk-air-from">
                <MapPin aria-hidden="true" /> From
              </label>
              <div className="field-control">
                {airportOf(airportFrom, options.airports) ? <Plane aria-hidden="true" /> : <MapPin aria-hidden="true" />}
                <LocationField id="bk-air-from" value={airportFrom} onChange={setAirportFrom} airports={options.airports} places={options.places} placeholder="Pick up location" suggest={suggestions} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="bk-air-to">
                <MapPin aria-hidden="true" /> To
              </label>
              <div className="field-control">
                {airportOf(airportTo, options.airports) ? <Plane aria-hidden="true" /> : <Navigation aria-hidden="true" />}
                <LocationField id="bk-air-to" value={airportTo} onChange={setAirportTo} airports={options.airports} places={options.places} placeholder="Drop location" suggest={suggestions} />
              </div>
            </div>
          </>
        ) : null}

        {hourly ? (
          <>
            <div className="field">
              <label htmlFor="bk-city">
                <MapPin aria-hidden="true" /> Pickup Location
              </label>
              <div className="field-control">
                <MapPin aria-hidden="true" />
                <SelectField
                  id="bk-city"
                  value={from}
                  options={options.hourlyCities}
                  placeholder="Choose city"
                  onChange={(value) => {
                    setFrom(value);
                    if (!(options.hourlyPackages[value] ?? []).includes(pkg)) setPkg("");
                  }}
                />
              </div>
            </div>
          </>
        ) : null}

        <div className="field">
          <label htmlFor="bk-date">{outstation && !airportTrip ? "Departure" : "Pickup date"}</label>
          <div className="field-control">
            <CalendarDays aria-hidden="true" />
            <DateField id="bk-date" value={date} onChange={setDate} />
          </div>
        </div>

        {showReturn ? (
          <div className="field">
            <label htmlFor="bk-return">
              Return {tripType === "one_way" ? <span className="bk-opt">(Optional)</span> : null}
            </label>
            <div className="field-control">
              <CalendarDays aria-hidden="true" />
              <DateField id="bk-return" value={returnDate} onChange={setReturnDate} placeholder={tripType === "one_way" ? returnHint || "Add a return date" : "Select return date"} />
              {returnDate && tripType === "one_way" ? (
                <button type="button" className="grid size-6 flex-none place-items-center rounded-full text-muted hover:bg-black/5" aria-label="Remove return date" onClick={() => setReturnDate("")}>
                  <X className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="bk-time">Pickup Time</label>
          <div className="field-control">
            <Clock3 aria-hidden="true" />
            <TimeField id="bk-time" value={time} onChange={setTime} />
          </div>
        </div>

        {hourly ? (
          <div className="field">
            <label htmlFor="bk-package">Select Package</label>
            <div className="field-control">
              <Timer aria-hidden="true" />
              <SelectField id="bk-package" value={pkg} options={packages} placeholder={from ? "Choose package" : "Choose city first"} onChange={setPkg} />
            </div>
          </div>
        ) : null}

        {showTravellers ? (
          <div className="field">
            <label htmlFor="bk-passengers">
              <Users aria-hidden="true" /> Travellers &amp; Bags
            </label>
            <div className="field-control">
              <Users aria-hidden="true" />
              <TravellersField
                id="bk-passengers"
                travellers={passengers}
                bags={bags}
                onChange={(value) => {
                  setPassengers(value.travellers);
                  setBags(value.bags);
                }}
              />
            </div>
          </div>
        ) : null}

        {outstation && maxStops > 0 && stops.length < maxStops ? (
          <div className="bk-add-stops">
            <button type="button" className={cn(ui.linkButton, "inline-flex items-center gap-1.5 font-semibold")} onClick={() => setStops((current) => [...current, ""])}>
              <Plus className="size-4" aria-hidden="true" /> Add Stops
            </button>
          </div>
        ) : null}

        {outstation && maxStops > 0
          ? stops.map((stop, index) => (
              <div key={index} className="bk-stop-row grid grid-cols-[1fr_auto] items-end gap-2.5 sm:max-w-md">
                <div className="field">
                  <label htmlFor={`bk-stop-${index}`}>Stop {index + 1}</label>
                  <div className="field-control">
                    <MapPin aria-hidden="true" />
                    <SelectField
                      id={`bk-stop-${index}`}
                      value={stop}
                      options={options.stopCities.filter((city) => city !== from && city !== to && !stops.includes(city))}
                      placeholder="Choose a city on the way"
                      onChange={(value) => setStops((current) => current.map((item, i) => (i === index ? value : item)))}
                    />
                  </div>
                </div>
                <button type="button" className="btn btn-ghost" aria-label={`Remove stop ${index + 1}`} onClick={() => setStops((current) => current.filter((_, i) => i !== index))}>
                  <X aria-hidden="true" />
                </button>
              </div>
            ))
          : null}

        <div className="bk-search-cell">
          <button type="submit" className="btn btn-gold mmt-search-button">
            <Search aria-hidden="true" />
            Search Cabs
          </button>
        </div>
      </div>

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}

      {/* the list only has the routes we price online: anything else becomes an enquiry the owner answers */}
      <p className="bk-quote-link">
        Cannot find your route or place?{" "}
        <Link
          href={quoteHref({
            from: outstation ? from : hourly ? from : airportFrom,
            to: outstation ? to : airportTo,
            date,
            time: to24h(time) || undefined,
            passengers: showTravellers ? passengers : undefined,
            kind: airportTrip ? "Airport transfer" : hourly ? "Hourly rental" : undefined,
          })}
        >
          Get a quote
        </Link>
      </p>
    </form>
  );
}
