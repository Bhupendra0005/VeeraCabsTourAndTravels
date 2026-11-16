"use client";

import { PhoneCall } from "lucide-react";
import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/admin/form-parts";
import { Card, Field, inputClass } from "@/components/admin/ui";
import { idle } from "@/lib/admin/action-state";
import { cleanMobile } from "@/lib/utils/phone";
import { createPhoneBookingAction } from "@/lib/server/admin/actions/phone-booking";

/** Today in India, as yyyy-mm-dd, for the date inputs. */
const today = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);

export function PhoneBookingForm({ cities, vehicles }: { cities: string[]; vehicles: { title: string; capacity: number }[] }) {
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
    fare: "",
    received: "",
    method: "cash",
    note: "",
    sendEmail: true,
    allowFull: false,
  });
  // controlled fields: a form action resets plain inputs, which would wipe the whole form when a check fails
  const bind = (key: keyof typeof v) => ({
    value: v[key] as string,
    onChange: (e: { target: { value: string } }) => setV((current) => ({ ...current, [key]: e.target.value })),
  });
  const tripType = v.tripType;

  return (
    <form action={action} className="grid gap-6">
      <Card title="Trip" description="Pick a listed city to use its fare, or type any place and enter the fare you agreed.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Trip type" htmlFor="pb-type">
            <select id="pb-type" name="tripType" {...bind("tripType")} className={inputClass}>
              <option value="one_way">Outstation one-way</option>
              <option value="round_trip">Outstation round trip</option>
            </select>
          </Field>
          <Field label="Vehicle" htmlFor="pb-vehicle">
            <select id="pb-vehicle" name="vehicle" required className={inputClass} {...bind("vehicle")}>
              <option value="" disabled>
                Choose a vehicle
              </option>
              {vehicles.map((v) => (
                <option key={v.title} value={v.title}>
                  {v.title} (up to {v.capacity})
                </option>
              ))}
            </select>
          </Field>
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
          <Field label="Travel date" htmlFor="pb-date">
            <input id="pb-date" name="date" type="date" required min={today()} className={inputClass} {...bind("date")} />
          </Field>
          <Field label="Pickup time" htmlFor="pb-time">
            <input id="pb-time" name="time" type="time" required className={inputClass} {...bind("time")} />
          </Field>
          {tripType === "round_trip" ? (
            <Field label="Return date" htmlFor="pb-return">
              <input id="pb-return" name="returnDate" type="date" required min={today()} className={inputClass} {...bind("returnDate")} />
            </Field>
          ) : null}
          <Field label="Passengers" htmlFor="pb-pax">
            <input id="pb-pax" name="passengers" type="number" min={1} max={60} required className={inputClass} {...bind("passengers")} />
          </Field>
          <Field label="Bags" htmlFor="pb-bags">
            <input id="pb-bags" name="bags" type="number" min={0} max={40} required className={inputClass} {...bind("bags")} />
          </Field>
          <Field label="Pickup address" htmlFor="pb-pickup" className="sm:col-span-2">
            <input id="pb-pickup" name="pickupAddress" required maxLength={200} autoComplete="off" className={inputClass} placeholder="House / landmark, area, Pune" {...bind("pickupAddress")} />
          </Field>
          <Field label="Drop address (optional)" htmlFor="pb-drop" className="sm:col-span-2">
            <input id="pb-drop" name="dropAddress" maxLength={200} autoComplete="off" className={inputClass} {...bind("dropAddress")} />
          </Field>
        </div>
      </Card>

      <Card title="Customer">
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
              onChange={(e) => setV((cur) => ({ ...cur, phone: cleanMobile(e.target.value) }))}
            />
          </Field>
          <Field label="Email (optional)" htmlFor="pb-email" hint="With an email the customer gets the ticket and can log in to see it. Without one, tell them by call or WhatsApp." className="sm:col-span-2">
            <input id="pb-email" name="email" type="email" maxLength={254} autoComplete="off" className={inputClass} {...bind("email")} />
          </Field>
        </div>
      </Card>

      <Card title="Fare and payment" description="GST is added to the fare, the same as online bookings.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fare before GST (₹)" htmlFor="pb-fare" hint="Leave empty to use the listed fare. Required for a route that is not listed.">
            <input id="pb-fare" name="fare" inputMode="decimal" maxLength={12} autoComplete="off" className={inputClass} placeholder="e.g. 4500" {...bind("fare")} />
          </Field>
          <div className="grid grid-cols-[1fr_130px] gap-3">
            <Field label="Amount received now (₹)" htmlFor="pb-received" hint="0 if nothing is collected yet.">
              <input id="pb-received" name="received" inputMode="decimal" maxLength={12} autoComplete="off" className={inputClass} placeholder="0" {...bind("received")} />
            </Field>
            <Field label="Paid by" htmlFor="pb-method">
              <select id="pb-method" name="method" className={inputClass} {...bind("method")}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank">Bank</option>
              </select>
            </Field>
          </div>
          <Field label="Internal note (optional)" htmlFor="pb-note" className="sm:col-span-2">
            <textarea id="pb-note" name="note" rows={3} maxLength={1000} className={inputClass} placeholder="Only staff can see this." {...bind("note")} />
          </Field>
        </div>
        <div className="mt-4 grid gap-2.5 text-sm">
          <label className="flex items-center gap-2.5">
            <input type="checkbox" name="sendEmail" checked={v.sendEmail} onChange={(e) => setV({ ...v, sendEmail: e.target.checked })} className="size-4 accent-brand" /> Email the ticket and invoice to the customer (only if an email is given)
          </label>
          <label className="flex items-center gap-2.5">
            <input type="checkbox" name="allowFull" checked={v.allowFull} onChange={(e) => setV({ ...v, allowFull: e.target.checked })} className="size-4 accent-brand" /> Book anyway, even if all vehicles of this type are already booked
          </label>
        </div>
      </Card>

      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Creating booking...">
          <PhoneCall aria-hidden="true" /> Create booking
        </SubmitButton>
      </div>
    </form>
  );
}
