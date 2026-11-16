"use client";

import { Ban, ShieldCheck } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { FormMessage, SubmitButton } from "@/components/admin/form-parts";
import { Alert, Button, Field, inputClass } from "@/components/admin/ui";
import { idle, type ActionState } from "@/lib/admin/action-state";
import { saveCustomerNoteAction, setCustomerBlockedAction } from "@/lib/server/admin/actions/customers";

/** Private note about a customer (staff only). */
export function CustomerNoteForm({ id, note }: { id: string; note: string }) {
  const [state, action] = useActionState(saveCustomerNoteAction.bind(null, id), idle);
  const [value, setValue] = useState(note);
  return (
    <form action={action} className="grid gap-3">
      <textarea name="note" rows={4} maxLength={1000} value={value} onChange={(e) => setValue(e.target.value)} className={inputClass} aria-label="Private note about this customer" placeholder="For example: always late, prefers a female driver, VIP, pays cash." />
      <FormMessage state={state} />
      <div>
        <SubmitButton variant="secondary">Save note</SubmitButton>
      </div>
    </form>
  );
}

/** Block or unblock a customer from new online bookings. Only an owner can press it (the server checks again). */
export function CustomerBlockControl({ id, blocked, reason, allowed }: { id: string; blocked: boolean; reason: string; allowed: boolean }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionState | null>(null);
  const [why, setWhy] = useState("");
  const [asking, setAsking] = useState(false);

  if (!allowed) {
    return <p className="text-sm text-muted">{blocked ? "This customer is blocked." : "Only the owner can block or unblock a customer."}</p>;
  }
  const run = (next: boolean) =>
    start(async () => {
      const r = await setCustomerBlockedAction(id, next, why);
      setResult(r);
      if (r.ok) setAsking(false);
    });

  return (
    <div className="grid gap-3">
      {blocked ? (
        <>
          <p className="text-sm text-muted">Blocked. Reason: {reason || "-"}</p>
          <div>
            <Button variant="secondary" disabled={pending} onClick={() => run(false)}>
              <ShieldCheck aria-hidden="true" /> Unblock this customer
            </Button>
          </div>
        </>
      ) : asking ? (
        <>
          <Field label="Why are you blocking this customer?" htmlFor="blk-why" hint="Only you can see this. They will be told to call you if they try to book.">
            <input id="blk-why" value={why} onChange={(e) => setWhy(e.target.value)} maxLength={300} autoComplete="off" className={inputClass} placeholder="e.g. fake bookings, abusive to drivers" />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" disabled={pending} onClick={() => run(true)}>
              <Ban aria-hidden="true" /> Yes, block
            </Button>
            <Button variant="secondary" disabled={pending} onClick={() => setAsking(false)}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <div>
          <Button variant="secondary" onClick={() => setAsking(true)}>
            <Ban aria-hidden="true" /> Block this customer
          </Button>
        </div>
      )}
      {result?.error ? <Alert tone="danger">{result.error}</Alert> : null}
      {result?.ok && result.message ? <Alert tone="success">{result.message}</Alert> : null}
    </div>
  );
}
