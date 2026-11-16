"use client";

import { Power, UserRoundPlus, UserRoundCheck } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { FormMessage, SubmitButton } from "@/components/admin/form-parts";
import { Alert, Button, Field, inputClass } from "@/components/admin/ui";
import { idle, type ActionState } from "@/lib/admin/action-state";
import { createDriverAction, setDriverActiveAction, updateDriverAction } from "@/lib/server/admin/actions/drivers";

type Initial = { name: string; phone: string; cabNumber: string; cabModel: string; note: string };
const empty: Initial = { name: "", phone: "", cabNumber: "", cabModel: "", note: "" };

/** Add or edit a driver. Fields are controlled so a failed check does not wipe what was typed. */
export function DriverForm({ id, initial = empty, onDone }: { id?: string; initial?: Initial; onDone?: () => void }) {
  const [state, action] = useActionState(id ? updateDriverAction.bind(null, id) : createDriverAction, idle);
  const [v, setV] = useState(initial);
  // lets a popup close itself once the driver is saved
  useEffect(() => {
    if (state.ok) onDone?.();
  }, [state, onDone]);
  const bind = (key: keyof Initial) => ({ value: v[key], onChange: (e: { target: { value: string } }) => setV((cur) => ({ ...cur, [key]: e.target.value })) });
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Driver name" htmlFor="dr-name">
          <input id="dr-name" name="name" maxLength={80} autoComplete="off" required className={inputClass} placeholder="e.g. Ramesh Patil" {...bind("name")} />
        </Field>
        <Field label="Mobile" htmlFor="dr-phone" hint="10 digits. Each driver needs a different number.">
          <input
            id="dr-phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            pattern="[6-9][0-9]{9}"
            title="Enter a 10-digit mobile number starting with 6, 7, 8 or 9."
            autoComplete="off"
            required
            className={inputClass}
            placeholder="9876543210"
            value={v.phone}
            onChange={(e) => {
              // digits only; a pasted "+91 98765 43210" is trimmed to the 10-digit number
              let d = e.target.value.replace(/\D/g, "");
              if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
              setV((cur) => ({ ...cur, phone: d.slice(0, 10) }));
            }}
          />
        </Field>
        <Field label="Cab number (usual cab)" htmlFor="dr-cab">
          <input id="dr-cab" name="cabNumber" maxLength={20} autoComplete="off" className={`${inputClass} uppercase`} placeholder="MH12 AB 1234" {...bind("cabNumber")} />
        </Field>
        <Field label="Cab model and colour (optional)" htmlFor="dr-model">
          <input id="dr-model" name="cabModel" maxLength={60} autoComplete="off" className={inputClass} placeholder="Swift Dzire, white" {...bind("cabModel")} />
        </Field>
        <Field label="Private note (optional)" htmlFor="dr-note" className="sm:col-span-2">
          <textarea id="dr-note" name="note" rows={2} maxLength={500} className={inputClass} placeholder="Only staff can see this. For example: speaks Marathi and Hindi, no night trips." {...bind("note")} />
        </Field>
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Saving...">
          <UserRoundPlus aria-hidden="true" /> {id ? "Save driver" : "Add driver"}
        </SubmitButton>
      </div>
    </form>
  );
}

/** Switches a driver off (they stop appearing when assigning) or back on. Past trips keep their history. */
export function DriverActiveButton({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionState | null>(null);
  return (
    <div className="grid justify-items-start gap-2">
      <Button
        variant={active ? "secondary" : "primary"}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setResult(await setDriverActiveAction(id, !active));
          })
        }
      >
        {active ? <Power aria-hidden="true" /> : <UserRoundCheck aria-hidden="true" />} {active ? "Switch off this driver" : "Switch on again"}
      </Button>
      {result?.error ? <Alert tone="danger">{result.error}</Alert> : null}
      {result?.ok && result.message ? <Alert tone="success">{result.message}</Alert> : null}
    </div>
  );
}
