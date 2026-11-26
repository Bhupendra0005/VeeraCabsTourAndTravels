"use client";

import { FilePlus2, IndianRupee, ListPlus, Plus, Route, Trash2, UserRound } from "lucide-react";
import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/admin/form-parts";
import { Choice, Section } from "@/components/admin/form-sections";
import { DatePicker } from "@/components/admin/pickers";
import { Button, Field, inputClass } from "@/components/admin/ui";
import { idle } from "@/lib/admin/action-state";
import { createQuotationAction } from "@/lib/server/admin/actions/quotations";
import { cleanMobile } from "@/lib/utils/phone";

const MAX_LINES = 6;

/** Today in India (plus some days), as yyyy-mm-dd. */
const day = (offset = 0) => new Date(Date.now() + 5.5 * 3_600_000 + offset * 86_400_000).toISOString().slice(0, 10);

/** Rupees typed in a box -> paise, 0 when empty or not a number. Display only: the server recomputes everything. */
const toPaise = (value: string) => {
  const n = Number(value.replace(/[,\s₹]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};
const inr = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;

type Line = { title: string; detail: string; amount: string };
const emptyLine = (): Line => ({ title: "", detail: "", amount: "" });

export function QuotationForm({ cities, vehicles, gstPercent }: { cities: string[]; vehicles: { title: string; capacity: number }[]; gstPercent: number }) {
  const [state, action] = useActionState(createQuotationAction, idle);
  // controlled fields: a form action resets plain inputs, which would wipe the whole form when a check fails
  const [v, setV] = useState({
    date: day(),
    validUntil: day(7),
    name: "",
    phone: "",
    email: "",
    tripType: "one_way",
    from: "Pune",
    to: "",
    pickupAddress: "",
    travelDate: "",
    time: "",
    returnDate: "",
    passengers: "2",
    vehicle: "",
    discount: "",
    note: "",
  });
  const [lines, setLines] = useState<Line[]>([{ title: "Cab fare", detail: "", amount: "" }]);
  const set = (key: keyof typeof v, value: string) => setV((current) => ({ ...current, [key]: value }));
  const bind = (key: keyof typeof v) => ({ value: v[key], onChange: (e: { target: { value: string } }) => set(key, e.target.value) });
  const setLine = (index: number, key: keyof Line, value: string) =>
    setLines((current) => current.map((line, i) => (i === index ? { ...line, [key]: value } : line)));

  const subtotal = lines.reduce((sum, line) => sum + toPaise(line.amount), 0);
  const discount = Math.min(toPaise(v.discount), subtotal);
  const gst = Math.round(((subtotal - discount) * gstPercent) / 100);
  const total = subtotal - discount + gst;
  const ready = subtotal > 0 && v.name.trim().length >= 2 && /^[6-9]\d{9}$/.test(v.phone) && !!v.vehicle && v.to.trim().length >= 2 && !!v.travelDate;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="grid min-w-0 gap-6">
        <Section icon={<UserRound />} title="Customer" hint="Name and mobile are needed (they are used if the quotation becomes a booking).">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer name" htmlFor="qt-name">
              <input id="qt-name" name="name" required maxLength={80} autoComplete="off" className={inputClass} {...bind("name")} />
            </Field>
            <Field label="Mobile" htmlFor="qt-phone" hint="10 digits">
              <input id="qt-phone" name="phone" type="tel" required inputMode="numeric" autoComplete="off" className={inputClass} placeholder="98765 43210" value={v.phone} onChange={(e) => set("phone", cleanMobile(e.target.value))} />
            </Field>
            <Field label="Email (optional)" htmlFor="qt-email" className="sm:col-span-2">
              <input id="qt-email" name="email" type="email" maxLength={254} autoComplete="off" className={inputClass} {...bind("email")} />
            </Field>
            <Field label="Quotation date" htmlFor="qt-date">
              <DatePicker id="qt-date" name="date" size="lg" value={v.date} onChange={(value) => set("date", value)} />
            </Field>
            <Field label="Valid until (optional)" htmlFor="qt-valid">
              <DatePicker id="qt-valid" name="validUntil" size="lg" min={v.date} value={v.validUntil} onChange={(value) => set("validUntil", value)} />
            </Field>
          </div>
        </Section>

        <Section icon={<Route />} title="Trip" hint="The trip the price is for.">
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Trip type">
              <Choice name="tripType" value="one_way" checked={v.tripType === "one_way"} onChange={() => set("tripType", "one_way")}>
                One-way
              </Choice>
              <Choice name="tripType" value="round_trip" checked={v.tripType === "round_trip"} onChange={() => set("tripType", "round_trip")}>
                Round trip
              </Choice>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="From" htmlFor="qt-from">
                <input id="qt-from" name="from" list="qt-cities" required maxLength={60} autoComplete="off" className={inputClass} {...bind("from")} />
              </Field>
              <Field label="To" htmlFor="qt-to">
                <input id="qt-to" name="to" list="qt-cities" required maxLength={60} autoComplete="off" className={inputClass} {...bind("to")} />
              </Field>
              <datalist id="qt-cities">
                {cities.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
              <Field label="Travel date" htmlFor="qt-travel">
                <DatePicker id="qt-travel" name="travelDate" size="lg" min={day()} value={v.travelDate} onChange={(value) => set("travelDate", value)} />
              </Field>
              <Field label="Pickup time (optional)" htmlFor="qt-time">
                <input id="qt-time" name="time" type="time" className={inputClass} {...bind("time")} />
              </Field>
              {v.tripType === "round_trip" ? (
                <Field label="Return date" htmlFor="qt-return">
                  <DatePicker id="qt-return" name="returnDate" size="lg" min={v.travelDate || day()} value={v.returnDate} onChange={(value) => set("returnDate", value)} />
                </Field>
              ) : null}
              <Field label="Passengers" htmlFor="qt-pax">
                <input id="qt-pax" name="passengers" type="number" min={1} max={60} required className={inputClass} {...bind("passengers")} />
              </Field>
              <Field label="Vehicle" htmlFor="qt-vehicle">
                <select id="qt-vehicle" name="vehicle" required className={inputClass} {...bind("vehicle")}>
                  <option value="">Choose a vehicle</option>
                  {vehicles.map((item) => (
                    <option key={item.title} value={item.title}>
                      {item.title} (up to {item.capacity})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Pickup address (optional)" htmlFor="qt-pickup" className="sm:col-span-2">
                <input id="qt-pickup" name="pickupAddress" maxLength={200} autoComplete="off" className={inputClass} {...bind("pickupAddress")} />
              </Field>
            </div>
          </div>
        </Section>

        <Section icon={<ListPlus />} title="Price" hint={`Up to ${MAX_LINES} lines, amounts before GST.`}>
          <input type="hidden" name="items" value={JSON.stringify(lines)} />
          <div className="grid gap-3">
            {lines.map((line, index) => (
              <div key={index} className="grid gap-2.5 rounded-xl border border-line bg-black/20 p-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_140px_auto] md:items-center">
                <input aria-label={`Line ${index + 1}: description`} maxLength={80} autoComplete="off" className={inputClass} placeholder="Description" value={line.title} onChange={(e) => setLine(index, "title", e.target.value)} />
                <input aria-label={`Line ${index + 1}: details`} maxLength={120} autoComplete="off" className={inputClass} placeholder="Details (optional)" value={line.detail} onChange={(e) => setLine(index, "detail", e.target.value)} />
                <input aria-label={`Line ${index + 1}: amount in rupees`} inputMode="decimal" maxLength={12} autoComplete="off" className={`${inputClass} md:text-right`} placeholder="₹ Amount" value={line.amount} onChange={(e) => setLine(index, "amount", e.target.value)} />
                <Button variant="ghost" size="sm" disabled={lines.length === 1} aria-label={`Remove line ${index + 1}`} onClick={() => setLines((current) => current.filter((_, i) => i !== index))}>
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" className="mt-3" disabled={lines.length >= MAX_LINES} onClick={() => setLines((current) => [...current, emptyLine()])}>
            <Plus aria-hidden="true" /> Add line
          </Button>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Discount (₹, optional)" htmlFor="qt-discount">
              <input id="qt-discount" name="discount" inputMode="decimal" maxLength={12} autoComplete="off" className={inputClass} {...bind("discount")} />
            </Field>
            <Field label="Note on the quotation (optional)" htmlFor="qt-note" hint="For example: toll and parking extra, as per receipt.">
              <input id="qt-note" name="note" maxLength={200} autoComplete="off" className={inputClass} {...bind("note")} />
            </Field>
          </div>
        </Section>
      </div>

      <aside className="lg:sticky lg:top-6">
        <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-(family-name:--font-display) text-base font-bold">
            <IndianRupee className="size-4 text-brand-bright" aria-hidden="true" /> Quotation total
          </h2>
          <dl className="mt-3 grid gap-2 text-sm tabular-nums">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Lines</dt>
              <dd>{inr(subtotal)}</dd>
            </div>
            {discount > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Discount</dt>
                <dd className="text-emerald-300">-{inr(discount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-muted">GST ({gstPercent}%)</dt>
              <dd>{inr(gst)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
              <dt className="text-base font-bold">Total</dt>
              <dd className="font-(family-name:--font-display) text-2xl font-extrabold">{inr(total)}</dd>
            </div>
          </dl>
          <div className="mt-4 grid gap-3">
            <FormMessage state={state} />
            <SubmitButton pendingText="Saving..." disabled={!ready} className="w-full py-3">
              <FilePlus2 aria-hidden="true" /> Create quotation
            </SubmitButton>
            {!ready ? <p className="text-center text-xs text-muted">Fill the name, mobile, To, travel date, vehicle and an amount.</p> : null}
          </div>
        </section>
      </aside>
    </form>
  );
}
