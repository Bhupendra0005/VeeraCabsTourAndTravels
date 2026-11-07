"use client";

import { CarFront, Clock, IndianRupee, MapPin, Milestone, Navigation, Repeat2, Route, Trash2, TriangleAlert } from "lucide-react";
import { useActionState, useState, useTransition, type ChangeEvent, type ReactNode } from "react";
import { FormMessage, SubmitButton } from "@/components/admin/form-parts";
import { filterIcon } from "@/components/admin/list-parts";
import { vehicleIcon } from "@/components/admin/vehicle-icon";
import { Alert, Button } from "@/components/admin/ui";
import { idle } from "@/lib/admin/action-state";
import { deleteRouteAction, saveRouteAction } from "@/lib/server/admin/actions/routes";
import { cn } from "@/lib/utils/cn";

export type RouteFormData = {
  id: string | null;
  fromCity: string;
  toCity: string;
  distanceKm: number | "";
  durationHours: number | "";
  active: boolean;
};

export type FareRow = { vehicle: string; hidden: boolean; oneWay: string; roundTrip: string };

const input =
  "h-12 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-3 text-sm text-(--text) outline-none transition placeholder:text-white/35 hover:border-white/20 focus:border-brand focus:ring-4 focus:ring-brand/15 [color-scheme:dark]";

function Panel({ icon, title, description, children }: { icon: ReactNode; title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-linear-to-b from-[#0b1620] to-panel p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-bright ring-1 ring-brand-bright/20 [&>svg]:size-5">{icon}</span>
        <div className="min-w-0">
          <h2 className="font-(family-name:--font-display) text-lg font-bold">{title}</h2>
          {description ? <p className="text-sm text-muted">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function TextField({
  label,
  htmlFor,
  icon,
  suffix,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  icon: ReactNode;
  suffix?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid content-start gap-2">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold">
        {label}
      </label>
      <div className="group relative">
        <span className={cn(filterIcon, "[&>svg]:size-4")}>{icon}</span>
        {children}
        {suffix ? <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-white/45">{suffix}</span> : null}
      </div>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/** A checkbox styled as a switch. Still a plain checkbox, so the form submits it as before. */
function Switch({ name, defaultChecked, title, text, icon }: { name: string; defaultChecked?: boolean; title: string; text: string; icon: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-white/10 bg-white/3 p-4 transition hover:border-white/20 has-checked:border-brand-bright/40 has-checked:bg-brand/8">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/6 text-white/60 [&>svg]:size-5">{icon}</span>
      <span className="min-w-0 flex-1">
        <b className="block text-sm">{title}</b>
        <span className="block text-[13px] text-muted">{text}</span>
      </span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="relative h-7 w-12 shrink-0 rounded-full bg-white/15 transition-colors after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-brand peer-checked:after:translate-x-5 peer-focus-visible:ring-4 peer-focus-visible:ring-brand/30"
      />
    </label>
  );
}

/** Shown while adding a route: mirrors what is typed so the result is visible before saving. */
function LivePreview({ from, to, km, hours }: { from: string; to: string; km: string; hours: string }) {
  const empty = !from.trim() && !to.trim();
  return (
    <section className="relative overflow-hidden rounded-2xl border border-brand-bright/25 bg-linear-to-br from-[#0a2a3d] via-[#0b1a24] to-panel p-5 sm:p-6" aria-label="Route preview">
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-brand/20 blur-[80px]" />
      <p className="relative mb-4 text-[11px] font-bold tracking-[0.18em] text-brand-bright uppercase">Live preview</p>
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
        <p className={cn("font-(family-name:--font-display) text-2xl leading-tight font-extrabold wrap-anywhere sm:text-4xl", !from.trim() && "text-white/25")}>
          {from.trim() || "From city"}
        </p>
        <div className="flex w-20 items-center sm:w-44" aria-hidden="true">
          <span className="size-2.5 shrink-0 rounded-full border-2 border-brand-bright" />
          <span className="relative h-px flex-1 border-t border-dashed border-white/35">
            <CarFront className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 bg-[#0b1a24] px-0.5 text-brand-bright" />
          </span>
          <MapPin className="size-5 shrink-0 text-brand-bright" />
        </div>
        <p className={cn("text-right font-(family-name:--font-display) text-2xl leading-tight font-extrabold wrap-anywhere sm:text-4xl", !to.trim() && "text-white/25")}>
          {to.trim() || "To city"}
        </p>
      </div>
      <div className="relative mt-5 flex flex-wrap gap-2.5 text-sm">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3.5 py-1.5">
          <Milestone className="size-4 text-brand-bright" aria-hidden="true" /> {km ? `${Number(km).toLocaleString("en-IN")} km` : "- km"}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3.5 py-1.5">
          <Clock className="size-4 text-brand-bright" aria-hidden="true" /> {hours ? `~${hours} hrs` : "- hrs"}
        </span>
        {empty ? <span className="self-center text-xs text-muted">Fill in the cities below to see them here.</span> : null}
      </div>
    </section>
  );
}

export function RouteForm({ route, fares }: { route: RouteFormData; fares: FareRow[] }) {
  const [state, action] = useActionState(saveRouteAction.bind(null, route.id), idle);
  const [live, setLive] = useState({ from: route.fromCity, to: route.toCity, km: String(route.distanceKm), hours: String(route.durationHours) });
  const track = (key: keyof typeof live) => (event: ChangeEvent<HTMLInputElement>) => setLive((current) => ({ ...current, [key]: event.target.value }));

  return (
    <form action={action} className="grid gap-6">
      {route.id === null ? <LivePreview {...live} /> : null}

      <Panel icon={<Route />} title="Route" description="The two cities and how far apart they are.">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="From city" htmlFor="r-from" icon={<Navigation />}>
            <input id="r-from" name="fromCity" defaultValue={route.fromCity} onChange={track("from")} required minLength={2} maxLength={60} className={input} placeholder="Pune" />
          </TextField>
          <TextField label="To city" htmlFor="r-to" icon={<MapPin />}>
            <input id="r-to" name="toCity" defaultValue={route.toCity} onChange={track("to")} required minLength={2} maxLength={60} className={input} placeholder="Mumbai" />
          </TextField>
          <TextField label="Distance" htmlFor="r-km" icon={<Milestone />} suffix="km">
            <input id="r-km" name="distanceKm" type="number" min={1} max={5000} step={1} defaultValue={route.distanceKm} onChange={track("km")} required className={cn(input, "pr-12")} />
          </TextField>
          <TextField label="Drive time" htmlFor="r-hours" icon={<Clock />} suffix="hours">
            <input id="r-hours" name="durationHours" type="number" min={0.1} max={99} step={0.1} defaultValue={route.durationHours} onChange={track("hours")} required className={cn(input, "pr-16")} />
          </TextField>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <Switch
            name="active"
            defaultChecked={route.active}
            icon={<Route />}
            title="Bookable online"
            text="Switch off to hide this route from the booking page without deleting it."
          />
          <Switch
            name="alsoReverse"
            icon={<Repeat2 />}
            title="Also save the return direction"
            text="Creates or updates the opposite route (To to From) with the same fares."
          />
        </div>
      </Panel>

      <Panel icon={<IndianRupee />} title="Fixed fares" description="Amounts in rupees, before GST. Leave the one-way fare empty to not offer that vehicle on this route.">
        {fares.length === 0 ? (
          <Alert tone="warning">Add vehicles under Website &gt; Fleet first.</Alert>
        ) : (
          <div className="grid gap-3">
            {fares.map((fare, index) => (
              <div
                key={fare.vehicle}
                className="grid gap-4 rounded-2xl border border-white/10 bg-white/3 p-4 transition focus-within:border-brand-bright/40 sm:grid-cols-[1.1fr_1fr_1fr] sm:items-start"
              >
                <input type="hidden" name={`vehicle_${index}`} value={fare.vehicle} />
                <div className="flex items-center gap-3 sm:pt-6">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-linear-to-br from-brand/25 to-brand/5 text-brand-bright ring-1 ring-brand-bright/20 [&>svg]:size-5">
                    {vehicleIcon(fare.vehicle)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold wrap-anywhere">{fare.vehicle}</p>
                    {fare.hidden ? (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-amber-300">
                        <TriangleAlert className="size-3" aria-hidden="true" /> Hidden on the website
                      </p>
                    ) : null}
                  </div>
                </div>
                <TextField label="One way" htmlFor={`ow-${index}`} icon={<IndianRupee />}>
                  <input id={`ow-${index}`} name={`oneWay_${index}`} type="number" min={1} max={1000000} step="any" defaultValue={fare.oneWay} className={input} placeholder="Not offered" />
                </TextField>
                <TextField label="Round trip" htmlFor={`rt-${index}`} icon={<IndianRupee />} hint="Empty means 2 x one way">
                  <input id={`rt-${index}`} name={`roundTrip_${index}`} type="number" min={1} max={1000000} step="any" defaultValue={fare.roundTrip} className={input} placeholder="Auto" />
                </TextField>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="sticky bottom-4 z-20 grid gap-3 rounded-2xl border border-white/10 bg-[#0b1217]/90 p-3 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-4">
        <FormMessage state={state} />
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton className="h-11 min-w-40 rounded-xl px-6 shadow-[0_10px_28px_-10px_rgba(0,150,219,0.8)]">
            {route.id ? "Save changes" : "Create route"}
          </SubmitButton>
          {route.id ? <DeleteRoute id={route.id} /> : null}
        </div>
      </div>
    </form>
  );
}

function DeleteRoute({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  if (!confirming) {
    return (
      <Button variant="ghost" className="h-11 rounded-xl hover:bg-red-500/10! hover:text-red-300!" onClick={() => setConfirming(true)}>
        <Trash2 aria-hidden="true" /> Delete route
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-400/40 bg-red-400/10 px-3 py-2">
      <span className="text-sm">Delete this route and all its fares?</span>
      <Button
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await deleteRouteAction(id);
            if (result && !result.ok) setError(result.error ?? "Could not delete.");
          })
        }
      >
        {pending ? "Deleting..." : "Yes, delete"}
      </Button>
      <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
      {error ? <span className="w-full text-sm text-red-300">{error}</span> : null}
    </div>
  );
}
