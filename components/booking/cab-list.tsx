"use client";

import { ArrowRight, ArrowUpDown, Briefcase, ChevronUp, Filter, Fuel, Package, Route, Snowflake, Star, Users, Wind } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { RatingBadge } from "@/components/booking/stars";
import { SelectField } from "@/components/site/select-field";
import { formatINR } from "@/lib/booking/config";
import { cn } from "@/lib/utils/cn";

export type CabOption = {
  vehicle: string;
  /** Model line, e.g. "Dzire, Etios" (or the vehicle name when no models are set). */
  name: string;
  similar: boolean;
  category: string;
  fuel: string;
  /** "AC" or "Non-AC". */
  ac: string;
  seats: string;
  bags: number;
  image: string;
  /** The km charge (the price shown big), in paise. `otherCharges` below is everything added to it. */
  fare: number;
  /** The usual price when the owner shows "% off" (struck through), else null. */
  listFare: number | null;
  discountPercent: number;
  /** Driver allowance, toll, GST and service fee, in paise. */
  otherCharges: number;
  href: string;
  /** One-line offer under the card (the highlighted special request), or null. */
  hint: string | null;
  /** Airport transfers: the extra-km charge already in the fare, in words; null when there is none. */
  extraNote?: string | null;
  /** Average of real customer reviews, when there are any. */
  rating: { avg: number; count: number } | null;
};

type Sort = "price-asc" | "price-desc" | "seats";

const SORTS: { value: Sort; label: string }[] = [
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "seats", label: "Seats: Most first" },
];

const FUEL_BADGE: Record<string, string> = {
  Electric: "bg-sky-500",
  CNG: "bg-emerald-600",
  Diesel: "bg-[#e07a10]",
  Petrol: "bg-rose-600",
};

function countBy(cabs: CabOption[], key: "category" | "fuel" | "name" | "ac") {
  return cabs.reduce<Record<string, number>>((acc, cab) => ({ ...acc, [cab[key]]: (acc[cab[key]] ?? 0) + 1 }), {});
}

/** One collapsible filter group with counts, like MakeMyTrip's left column. */
function FilterGroup({
  title,
  options,
  counts,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  counts: Record<string, number>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <details className="bk-fgroup" open>
      <summary>
        <span>{title}</span>
        <ChevronUp aria-hidden="true" />
      </summary>
      <div className="bk-fgroup-body">
        {options.map((option) => (
          <label key={option}>
            <input type="checkbox" checked={selected.includes(option)} onChange={() => onToggle(option)} />
            <span className="flex-1">{option}</span>
            <span className="bk-fcount">({counts[option] ?? 0})</span>
          </label>
        ))}
      </div>
    </details>
  );
}

export type CabFilters = { type: boolean; model: boolean; fuel: boolean; sort: boolean };

/** Cab results with MakeMyTrip-style filters (cab type, model, fuel type), sorting and a "Best Value" ribbon. */
export function CabList({ cabs, filters, bestValue, initialVehicle }: { cabs: CabOption[]; filters: CabFilters; bestValue: boolean; initialVehicle?: string }) {
  const [types, setTypes] = useState<string[]>(() => {
    const wanted = initialVehicle ? cabs.find((cab) => cab.vehicle === initialVehicle) : undefined;
    return wanted ? [wanted.category] : [];
  });
  const [fuels, setFuels] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("price-asc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const typeOptions = useMemo(() => [...new Set(cabs.map((cab) => cab.category))], [cabs]);
  const fuelOptions = useMemo(() => [...new Set(cabs.map((cab) => cab.fuel))], [cabs]);
  const modelOptions = useMemo(() => [...new Set(cabs.map((cab) => cab.name))], [cabs]);
  const modelCounts = useMemo(() => countBy(cabs, "name"), [cabs]);
  const typeCounts = useMemo(() => countBy(cabs, "category"), [cabs]);
  const fuelCounts = useMemo(() => countBy(cabs, "fuel"), [cabs]);
  const [acs, setAcs] = useState<string[]>([]);
  const acOptions = useMemo(() => [...new Set(cabs.map((cab) => cab.ac))], [cabs]);
  const acCounts = useMemo(() => countBy(cabs, "ac"), [cabs]);
  // only worth showing when the search really has both
  const showAcFilter = acOptions.length > 1;
  // the cheapest cab of the whole search wears the ribbon, whatever the filters or the sorting
  const cheapest = useMemo(() => cabs.reduce((best, cab) => (cab.fare < best.fare ? cab : best), cabs[0]), [cabs]);

  const shown = useMemo(() => {
    const list = cabs.filter(
      (cab) => (!types.length || types.includes(cab.category)) && (!fuels.length || fuels.includes(cab.fuel)) && (!models.length || models.includes(cab.name)) && (!acs.length || acs.includes(cab.ac)),
    );
    const seats = (cab: CabOption) => Number.parseInt(cab.seats, 10) || 0;
    return list.sort((a, b) => (sort === "price-desc" ? b.fare - a.fare : sort === "seats" ? seats(b) - seats(a) || a.fare - b.fare : a.fare - b.fare));
  }, [cabs, types, fuels, models, acs, sort]);

  const toggle = (setter: (fn: (current: string[]) => string[]) => void) => (value: string) =>
    setter((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  const filtered = types.length > 0 || fuels.length > 0 || models.length > 0 || acs.length > 0;
  const anyFilter = filters.type || filters.model || filters.fuel || filters.sort || showAcFilter;

  return (
    <div className={cn("grid items-start gap-6", anyFilter && "md:grid-cols-[300px_minmax(0,1fr)]")}>
      {anyFilter ? (
        <div className="grid content-start gap-3 md:sticky md:top-24">
          <div className="bk-fbar md:hidden">
            <button type="button" className="bk-filter-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}>
              <Filter aria-hidden="true" /> {filtersOpen ? "Hide filters" : `Filters & sort${types.length + fuels.length + models.length + acs.length ? ` (${types.length + fuels.length + models.length + acs.length})` : ""}`}
            </button>
          </div>
          <aside className={cn("bk-filters", filtersOpen ? "block" : "hidden md:block")} aria-label="Filters">
            <header className="bk-filters-head">
              <span className="bk-filters-icon">
                <Filter aria-hidden="true" />
              </span>
              <h3>Filters</h3>
              {filtered ? (
                <button
                  type="button"
                  onClick={() => {
                    setTypes([]);
                    setFuels([]);
                    setModels([]);
                    setAcs([]);
                  }}
                >
                  Clear All
                </button>
              ) : null}
            </header>
            <div className="bk-filters-body">
              {showAcFilter ? <FilterGroup title="AC / Non-AC" options={acOptions} counts={acCounts} selected={acs} onToggle={toggle(setAcs)} /> : null}
              {filters.type ? <FilterGroup title="Cab Type" options={typeOptions} counts={typeCounts} selected={types} onToggle={toggle(setTypes)} /> : null}
              {filters.model ? <FilterGroup title="Cab Model" options={modelOptions} counts={modelCounts} selected={models} onToggle={toggle(setModels)} /> : null}
              {filters.fuel ? <FilterGroup title="Fuel Type" options={fuelOptions} counts={fuelCounts} selected={fuels} onToggle={toggle(setFuels)} /> : null}
              {filters.sort ? (
                <div className="bk-sort">
                  <label htmlFor="cab-sort">Sort by</label>
                  <div className="field-control">
                    <ArrowUpDown aria-hidden="true" />
                    <SelectField
                      id="cab-sort"
                      value={SORTS.find((item) => item.value === sort)?.label ?? ""}
                      options={SORTS.map((item) => item.label)}
                      onChange={(label) => setSort(SORTS.find((item) => item.label === label)?.value ?? "price-asc")}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      <div className="grid gap-4">
        {shown.length === 0 ? (
          <div className="bk-empty" role="status">
            <div className="bk-empty-text">
              <h3>No cab matches these filters</h3>
              <p>Clear a filter to see all available cabs for this trip.</p>
            </div>
          </div>
        ) : (
          <ul className="m-0 grid list-none gap-4 p-0">
            {shown.map((cab) => {
              const best = bestValue && cabs.length > 1 && cab.vehicle === cheapest.vehicle;
              return (
                <li key={cab.vehicle} className={cn("bk-card", best && "bk-card--best")}>
                  {best ? (
                    <span className="bk-ribbon">
                      <Star aria-hidden="true" /> Best Value
                    </span>
                  ) : null}
                  <div className="bk-card-grid">
                    <div className="bk-card-photo">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cab.image} alt={`${cab.vehicle} by Veera Tours & Travels`} width={240} height={126} loading="lazy" decoding="async" />
                      <span className={cn("bk-fuel", FUEL_BADGE[cab.fuel] ?? "bg-slate-600")}>
                        <Fuel aria-hidden="true" /> {cab.fuel}
                      </span>
                    </div>

                    <div className="bk-card-info">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h3>
                          {cab.name}
                          {cab.similar ? <span>or similar</span> : null}
                        </h3>
                        {cab.rating ? <RatingBadge avg={cab.rating.avg} count={cab.rating.count} /> : null}
                      </div>
                      {(() => {
                        const vehicle = cab.similar && cab.vehicle !== cab.name ? cab.vehicle : "";
                        const category = (cab.category !== cab.vehicle || !cab.similar) && cab.category !== cab.name && cab.category !== vehicle ? cab.category : "";
                        // phones hide the vehicle name here (it nearly repeats the heading) and keep the cab type
                        return vehicle || category ? (
                          <p className="bk-card-sub">
                            {vehicle ? (
                              <span className="bk-sub-name">
                                {vehicle}
                                {category ? " • " : ""}
                              </span>
                            ) : null}
                            {category}
                          </p>
                        ) : null;
                      })()}
                      <ul className="bk-chips">
                        <li>
                          <span>
                            {cab.ac === "Non-AC" ? <Wind aria-hidden="true" /> : <Snowflake aria-hidden="true" />}
                          </span>
                          {cab.ac}
                        </li>
                        <li>
                          <span>
                            <Users aria-hidden="true" />
                          </span>
                          <i className="capitalize not-italic">{cab.seats}</i>
                        </li>
                        <li>
                          <span>
                            <Briefcase aria-hidden="true" />
                          </span>
                          {cab.bags} {cab.bags === 1 ? "Bag" : "Bags"}
                        </li>
                      </ul>
                    </div>

                    <div className="bk-card-price">
                      {cab.listFare ? (
                        <span className="bk-off">
                          <em>
                            {formatINR(cab.listFare - cab.fare)} off ({cab.discountPercent}%)
                          </em>
                          <s>{formatINR(cab.listFare)}</s>
                        </span>
                      ) : null}
                      <b>{formatINR(cab.fare)}</b>
                      <small>+ Taxes &amp; charges {formatINR(cab.otherCharges)}</small>
                      <Link className="btn btn-gold bk-cta" href={cab.href}>
                        Select Cab
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                  {cab.extraNote ? (
                    <p className="bk-hint">
                      <Route aria-hidden="true" /> {cab.extraNote}
                    </p>
                  ) : null}
                  {cab.hint ? (
                    <p className="bk-hint">
                      <Package aria-hidden="true" /> {cab.hint}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
