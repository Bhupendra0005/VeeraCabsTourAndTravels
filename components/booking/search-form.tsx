"use client";

import { CalendarDays, Clock3, MapPin, Navigation, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { DateField } from "@/components/site/date-field";
import { SelectField } from "@/components/site/select-field";
import { TimeField } from "@/components/site/time-field";
import { TRIP_TYPE_LABEL, TRIP_TYPES, to12h, to24h } from "@/lib/booking/config";
import { searchToQuery, type SearchParams } from "@/lib/booking/search";
import { ui } from "@/components/ui/styles";
import { cn } from "@/lib/utils/cn";

type Cities = { from: string[]; to: Record<string, string[]> };

const PASSENGER_OPTIONS = Array.from({ length: 17 }, (_, i) => `${i + 1} ${i === 0 ? "passenger" : "passengers"}`);

export function SearchForm({ cities, initial }: { cities: Cities; initial: SearchParams }) {
  const router = useRouter();
  const [tripType, setTripType] = useState(initial.tripType);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [date, setDate] = useState(initial.date);
  const [returnDate, setReturnDate] = useState(initial.returnDate);
  const [time, setTime] = useState(initial.time ? to12h(initial.time) : "");
  const [passengers, setPassengers] = useState(initial.passengers);
  const [error, setError] = useState("");

  const toOptions = from ? (cities.to[from] ?? []) : [];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const pickup = to24h(time);
    if (!from || !to) return setError("Choose where you are travelling from and to.");
    if (!date) return setError("Choose your travel date.");
    if (!pickup) return setError("Choose your pickup time.");
    if (tripType === "round_trip" && (!returnDate || returnDate < date)) {
      return setError("Choose a return date on or after the travel date.");
    }
    setError("");
    router.push(
 `/book?${searchToQuery({ tripType, from, to, date, time: pickup, returnDate: tripType === "round_trip" ? returnDate : "", passengers })}`,
    );
  };

  return (
    <form className={cn(ui.card, ui.searchCard)} onSubmit={submit} noValidate>
      <div className="trip-tabs" role="group" aria-label="Trip type">
        {TRIP_TYPES.map((type) => (
          <button
            type="button"
            key={type}
            className={`trip-tab${tripType === type ? " is-active" : ""}`}
            aria-pressed={tripType === type}
            onClick={() => setTripType(type)}
          >
            {TRIP_TYPE_LABEL[type]}
          </button>
        ))}
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="bk-from">From</label>
          <div className="field-control">
            <MapPin aria-hidden="true" />
            <SelectField
              id="bk-from"
              value={from}
              options={cities.from}
              placeholder="Pickup city"
              onChange={(value) => {
                setFrom(value);
                if (!(cities.to[value] ?? []).includes(to)) setTo("");
              }}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="bk-to">To</label>
          <div className="field-control">
            <Navigation aria-hidden="true" />
            <SelectField
              id="bk-to"
              value={to}
              options={toOptions}
              placeholder={from ? "Destination" : "Choose pickup first"}
              onChange={setTo}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="bk-date">Travel date</label>
          <div className="field-control">
            <CalendarDays aria-hidden="true" />
            <DateField id="bk-date" value={date} onChange={setDate} />
          </div>
        </div>

        {tripType === "round_trip" ? (
          <div className="field">
            <label htmlFor="bk-return">Return date</label>
            <div className="field-control">
              <CalendarDays aria-hidden="true" />
              <DateField id="bk-return" value={returnDate} onChange={setReturnDate} placeholder="Select return date" />
            </div>
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="bk-time">Pickup time</label>
          <div className="field-control">
            <Clock3 aria-hidden="true" />
            <TimeField id="bk-time" value={time} onChange={setTime} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="bk-passengers">Passengers</label>
          <div className="field-control">
            <Users aria-hidden="true" />
            <SelectField
              id="bk-passengers"
              value={`${passengers} ${passengers === 1 ? "passenger" : "passengers"}`}
              options={PASSENGER_OPTIONS}
              onChange={(value) => setPassengers(Number.parseInt(value, 10))}
            />
          </div>
        </div>
      </div>

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className={cn("btn btn-gold", ui.searchButton)}>
        <Search aria-hidden="true" />
        Search cabs
      </button>
    </form>
  );
}
