"use client";

import { Car, PhoneCall, Route, UserRound, Wallet } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { FormMessage, SubmitButton } from "@/components/admin/form-parts";
import { Choice, Section } from "@/components/admin/form-sections";
import { DatePicker } from "@/components/admin/pickers";
import { Badge, Button, Field, inputClass } from "@/components/admin/ui";
import { idle } from "@/lib/admin/action-state";
import { formatINR } from "@/lib/booking/config";
import { cleanMobile } from "@/lib/utils/phone";
import { createPhoneBookingAction, previewPhoneFareAction } from "@/lib/server/admin/actions/phone-booking";
import type { PhoneFarePreview } from "@/lib/server/bookings/service";

/** Today in India, as yyyy-mm-dd, for the date inputs. */
const today = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);

type PreviewState = { ok: true; preview: PhoneFarePreview } | { ok: false; error: string };

/** Fields that change the fare: editing one of them clears an old "Check fare" answer. */
const FARE_KEYS = ["tripType", "vehicle", "from", "to", "date", "returnDate", "distanceKm"];

const SOURCE_LABEL: Record<PhoneFarePreview["source"], string> = {
  custom: "Your price",
  manual_km: "Distance typed by you",
  distance: "Road distance",
  listed: "Listed route price",
};

/** Rupees typed in a box -> paise, 0 when empty or not a number. */
const toPaise = (value: string) => {
  const n = Number(value.replace(/[,\s₹]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};

const dayLabel = (date: string) => (date ? new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "");

/** What the customer will pay, line by line, before the booking is created. */
function FarePreviewBox({ result }: { result: PreviewState }) {
  if (!result.ok) return <p className="rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-300">{result.error}</p>;
  const p = result.preview;
  const b = p.breakup;
  const distance = b
    ? b.tripType !== "round_trip"
      ? `Distance ${b.km} km x ₹${b.ratePerKm}/km`
      : `${b.billedKm} km (${b.billedKm > b.km * 2 ? `${b.days} ${b.days === 1 ? "day" : "days"} x ${b.minKmPerDay} km minimum` : `${b.km} km each way`}) x ₹${b.ratePerKm}/km`
    : "";
  return (
    <div className="grid gap-3 rounded-xl border border-brand/30 bg-brand/5 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <b>Fare for this booking</b>
        <Badge tone="info">{SOURCE_LABEL[p.source]}</Badge>
      </div>
      {p.matched ? (
        <p className="text-xs text-muted wrap-anywhere">
          Distance worked out from <b className="text-(--text)">{p.matched.from}</b> to <b className="text-(--text)">{p.matched.to}</b>
          {b ? ` (${b.km} km).` : "."} Wrong place? Type the km yourself above.
        </p>
      ) : null}
      <dl className="grid gap-1.5 tabular-nums">
        {b ? (
          <>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{distance}</dt>
              <dd>{formatINR(b.kmCharge)}</dd>
            </div>
            {b.returnCharge > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">One-way return charge ({b.returnPercent}%)</dt>
                <dd>{formatINR(b.returnCharge)}</dd>
              </div>
            ) : null}
            {b.toll > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Toll (Google estimate, FASTag)</dt>
                <dd>{formatINR(b.toll)}</dd>
              </div>
            ) : null}
            {b.minFareTopUp > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Minimum fare for this vehicle</dt>
                <dd>+{formatINR(b.minFareTopUp)}</dd>
              </div>
            ) : null}
          </>
        ) : null}
        {p.allowance ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">
              Driver allowance ({p.allowanceDays} {p.allowanceDays === 1 ? "day" : "days"})
            </dt>
            <dd>{formatINR(p.allowance)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4 border-t border-line pt-1.5">
          <dt>Fare before GST</dt>
          <dd className="font-semibold">{formatINR(p.baseFare)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">GST</dt>
          <dd>{formatINR(p.gst)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-base font-bold">
          <dt>Total</dt>
          <dd>{formatINR(p.total)}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted">This fare is used when the price box below is empty.</p>
    </div>
  );
}

export function PhoneBookingForm({ cities, vehicles, gstPercent }: { cities: string[]; vehicles: { title: string; capacity: number }[]; gstPercent: number }) {
  const [state, action] = useActionState(createPhoneBookingAction, idle);
  const [v, setV] = useState({
    tripType: "one_way",
    vehicle: "",
    from: "Pune",
    to: "",
    date: "",
    time: "",
    returnDate: "",
    passengers: "2",
    bags: "1",
    pickupAddress: "",
    dropAddress: "",
    name: "",
    phone: "",
    email: "",
    distanceKm: "",
    fare: "",
    received: "",
    method: "cash",
    note: "",
    sendEmail: true,
    allowFull: false,
  });
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [checking, startChecking] = useTransition();
  // controlled fields: a form action resets plain inputs, which would wipe the whole form when a check fails
  const set = (key: keyof typeof v, value: string | boolean) => {
    if (FARE_KEYS.includes(key)) setPreview(null);
    setV((current) => ({ ...current, [key]: value }));
  };
  const bind = (key: keyof typeof v) => ({
    value: v[key] as string,
    onChange: (e: { target: { value: string } }) => set(key, e.target.value),
  });
  const checkFare = () =>
    startChecking(async () => {
      setPreview(await previewPhoneFareAction({ tripType: v.tripType, from: v.from, to: v.to, date: v.date, returnDate: v.returnDate, vehicle: v.vehicle, distanceKm: v.distanceKm }));
    });

  const tripType = v.tripType;
  const chosen = vehicles.find((item) => item.title === v.vehicle);
  const tooMany = chosen ? Number(v.passengers) > chosen.capacity : false;
  const ready = !!v.vehicle && v.from.trim().length >= 2 && v.to.trim().length >= 2 && !!v.date && !!v.time && v.pickupAddress.trim().length >= 3 && v.name.trim().length >= 2 && /^[6-9]\d{9}$/.test(v.phone);
  const total = preview?.ok ? preview.preview.total : 0;
  // the price box wins when it is filled: the owner agreed a price with the customer
  const customTotal = toPaise(v.fare) > 0 ? toPaise(v.fare) + Math.round((toPaise(v.fare) * gstPercent) / 100) : 0;
  const shownTotal = customTotal > 0 ? customTotal : total;
  const received = toPaise(v.received);

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="grid min-w-0 gap-6">
        <Section icon={<Route />} title="Trip" hint="Type any two places. The fare is worked out from the distance between them, or from the km you type.">
          <div className="grid gap-5">
            <div className="grid gap-1.5">
              <p className="text-[13px] font-semibold">Trip type</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Trip type">
                <Choice name="tripType" value="one_way" checked={tripType === "one_way"} onChange={() => set("tripType", "one_way")}>
                  One-way
                </Choice>
                <Choice name="tripType" value="round_trip" checked={tripType === "round_trip"} onChange={() => set("tripType", "round_trip")}>
                  Round trip
                </Choice>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="From" htmlFor="pb-from">
                <input id="pb-from" name="from" list="pb-cities" required maxLength={60} autoComplete="off" className={inputClass} placeholder="Pune" {...bind("from")} />
              </Field>
              <Field label="To" htmlFor="pb-to">
                <input id="pb-to" name="to" list="pb-cities" required maxLength={60} autoComplete="off" className={inputClass} placeholder="Mumbai" {...bind("to")} />
              </Field>
              <datalist id="pb-cities">
                {cities.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
            </div>

            <div className="grid gap-4 rounded-xl border border-line bg-black/20 p-4">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <Field label="Manual distance in km, one way (optional)" htmlFor="pb-km" hint="Empty: the map works out the road distance between From and To. Type the km here to decide it yourself.">
                  <input id="pb-km" name="distanceKm" inputMode="decimal" maxLength={6} autoComplete="off" className={inputClass} placeholder="Auto, or e.g. 143" {...bind("distanceKm")} />
                </Field>
                <Button variant="secondary" className="sm:mb-6" disabled={checking} onClick={checkFare}>
                  {checking ? "Checking..." : "Check fare"}
                </Button>
              </div>
              {preview ? <FarePreviewBox result={preview} /> : <p className="text-xs text-muted">Press &quot;Check fare&quot; to see what the customer will pay before you create the booking.</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Travel date" htmlFor="pb-date">
                <DatePicker id="pb-date" name="date" size="lg" min={today()} value={v.date} onChange={(date) => set("date", date)} />
              </Field>
              <Field label="Pickup time" htmlFor="pb-time">
                <input id="pb-time" name="time" type="time" required className={inputClass} {...bind("time")} />
              </Field>
              {tripType === "round_trip" ? (
                <Field label="Return date" htmlFor="pb-return">
                  <DatePicker id="pb-return" name="returnDate" size="lg" min={v.date || today()} value={v.returnDate} onChange={(date) => set("returnDate", date)} />
                </Field>
              ) : null}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Passengers" htmlFor="pb-pax">
                  <input id="pb-pax" name="passengers" type="number" min={1} max={60} required className={inputClass} {...bind("passengers")} />
                </Field>
                <Field label="Bags" htmlFor="pb-bags">
                  <input id="pb-bags" name="bags" type="number" min={0} max={40} required className={inputClass} {...bind("bags")} />
                </Field>
              </div>
            </div>

            <div className="grid gap-2">
              <p className="text-[13px] font-semibold">Vehicle</p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {vehicles.map((item) => (
                  <label key={item.title} className="cursor-pointer">
                    <input type="radio" name="vehicle" value={item.title} required checked={v.vehicle === item.title} onChange={() => set("vehicle", item.title)} className="peer sr-only" />
                    <span className="flex items-center gap-3 rounded-xl border border-white/12 bg-black/30 p-3 transition hover:border-white/25 peer-checked:border-brand peer-checked:bg-brand/15 peer-focus-visible:ring-4 peer-focus-visible:ring-brand/25">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/8 text-brand-bright">
                        <Car className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <b className="block text-sm wrap-anywhere">{item.title}</b>
                        <small className="text-xs text-muted">Up to {item.capacity} passengers</small>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {tooMany && chosen ? <p className="text-xs text-amber-300">{chosen.title} seats up to {chosen.capacity}. Choose a bigger vehicle or fewer passengers.</p> : null}
            </div>

            <div className="grid gap-4">
              <Field label="Pickup address" htmlFor="pb-pickup">
                <input id="pb-pickup" name="pickupAddress" required maxLength={200} autoComplete="off" className={inputClass} placeholder="House / landmark, area, Pune" {...bind("pickupAddress")} />
              </Field>
              <Field label="Drop address (optional)" htmlFor="pb-drop">
                <input id="pb-drop" name="dropAddress" maxLength={200} autoComplete="off" className={inputClass} {...bind("dropAddress")} />
              </Field>
            </div>
          </div>
        </Section>

        <Section icon={<UserRound />} title="Customer" hint="Name and mobile are needed.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="pb-name">
              <input id="pb-name" name="name" required maxLength={80} autoComplete="off" className={inputClass} {...bind("name")} />
            </Field>
            <Field label="Mobile" htmlFor="pb-phone" hint="10 digits">
              <input
                id="pb-phone"
                name="phone"
                type="tel"
                required
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                title="Enter a 10-digit mobile number starting with 6, 7, 8 or 9."
                autoComplete="off"
                className={inputClass}
                placeholder="98765 43210"
                value={v.phone}
                onChange={(e) => set("phone", cleanMobile(e.target.value))}
              />
            </Field>
            <Field label="Email (optional)" htmlFor="pb-email" hint="With an email the customer gets the ticket and can log in to see it. Without one, tell them by call or WhatsApp." className="sm:col-span-2">
              <input id="pb-email" name="email" type="email" maxLength={254} autoComplete="off" className={inputClass} {...bind("email")} />
            </Field>
          </div>
        </Section>

        <Section icon={<Wallet />} title="Fare and payment" hint="The fare is the distance x the vehicle's rate per km, like online bookings. GST is added on top.">
          <div className="grid gap-5">
            <Field label="Fare before GST (₹), only if you agreed a different price" htmlFor="pb-fare" hint="Leave empty to use the fare above.">
              <input id="pb-fare" name="fare" inputMode="decimal" maxLength={12} autoComplete="off" className={inputClass} placeholder="e.g. 4500" {...bind("fare")} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Amount received now (₹)" htmlFor="pb-received" hint="0 if nothing is collected yet.">
                <input id="pb-received" name="received" inputMode="decimal" maxLength={12} autoComplete="off" className={inputClass} placeholder="0" {...bind("received")} />
              </Field>
              <div className="grid content-start gap-1.5">
                <p className="text-[13px] font-semibold">Paid by</p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Payment method">
                  {[
                    { value: "cash", label: "Cash" },
                    { value: "upi", label: "UPI" },
                    { value: "bank", label: "Bank" },
                  ].map((m) => (
                    <Choice key={m.value} name="method" value={m.value} checked={v.method === m.value} onChange={() => set("method", m.value)}>
                      {m.label}
                    </Choice>
                  ))}
                </div>
              </div>
            </div>

            <Field label="Internal note (optional)" htmlFor="pb-note">
              <textarea id="pb-note" name="note" rows={3} maxLength={1000} className={inputClass} placeholder="Only staff can see this." {...bind("note")} />
            </Field>

            <div className="grid gap-3 text-sm">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" name="sendEmail" checked={v.sendEmail} onChange={(e) => set("sendEmail", e.target.checked)} className="mt-0.5 size-5 accent-brand" />
                <span>Email the ticket and invoice to the customer (only if an email is given)</span>
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" name="allowFull" checked={v.allowFull} onChange={(e) => set("allowFull", e.target.checked)} className="mt-0.5 size-5 accent-brand" />
                <span>Book anyway, even if all vehicles of this type are already booked</span>
              </label>
            </div>
          </div>
        </Section>
      </div>

      {/* the booking in short, next to the form on a laptop; on a phone it comes last, right above the button */}
      <aside className="lg:sticky lg:top-6">
        <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
          <h2 className="font-(family-name:--font-display) text-base font-bold">Booking summary</h2>

          <div className="mt-3 grid gap-1 border-b border-line pb-3 text-sm">
            <p className="font-semibold wrap-anywhere">
              {v.from.trim() || "From"} <span className="text-muted">to</span> {v.to.trim() || "To"}
            </p>
            <p className="text-xs text-muted">
              {tripType === "round_trip" ? "Round trip" : "One-way"}
              {v.date ? ` · ${dayLabel(v.date)}` : ""}
              {v.time ? `, ${v.time}` : ""}
            </p>
            {tripType === "round_trip" && v.returnDate ? <p className="text-xs text-muted">Return {dayLabel(v.returnDate)}</p> : null}
          </div>

          <dl className="grid gap-2 border-b border-line py-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Vehicle</dt>
              <dd className="text-right wrap-anywhere">{v.vehicle || "Not chosen"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Passengers</dt>
              <dd>
                {v.passengers || "-"} · {v.bags || 0} {Number(v.bags) === 1 ? "bag" : "bags"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Customer</dt>
              <dd className="text-right wrap-anywhere">{v.name.trim() || "-"}</dd>
            </div>
          </dl>

          <dl className="grid gap-2 pt-3 text-sm tabular-nums">
            {shownTotal > 0 ? (
              <>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-base font-bold">Total</dt>
                  <dd className="font-(family-name:--font-display) text-2xl font-extrabold">{formatINR(shownTotal)}</dd>
                </div>
                {received > 0 ? (
                  <>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Received now</dt>
                      <dd className="text-emerald-300">{formatINR(Math.min(received, shownTotal))}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Left to collect</dt>
                      <dd className="font-bold text-amber-300">{formatINR(Math.max(0, shownTotal - received))}</dd>
                    </div>
                  </>
                ) : null}
              </>
            ) : (
              <p className="text-muted">The fare shows here after you press &quot;Check fare&quot;.</p>
            )}
          </dl>

          <div className="mt-4 grid gap-3">
            <FormMessage state={state} />
            <Button variant="secondary" className="w-full py-3" disabled={checking || !v.vehicle || !v.to.trim()} onClick={checkFare}>
              {checking ? "Checking..." : "Check fare"}
            </Button>
            <SubmitButton pendingText="Creating booking..." disabled={!ready || tooMany} className="w-full py-3">
              <PhoneCall aria-hidden="true" /> Create booking
            </SubmitButton>
            {!ready ? <p className="text-center text-xs text-muted">Fill the trip, the vehicle, the pickup address and the customer&apos;s name and mobile.</p> : null}
          </div>
        </section>
      </aside>
    </form>
  );
}
