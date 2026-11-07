"use client";

import { CheckCheck, Mail, XCircle } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { FormMessage, SubmitButton } from "@/components/admin/form-parts";
import { SelectMenu } from "@/components/admin/pickers";
import { Alert, Button, Card, Field, inputClass } from "@/components/admin/ui";
import { idle, type ActionState } from "@/lib/admin/action-state";
import {
  cancelBookingAdminAction,
  markCompletedAction,
  resendConfirmationAction,
  saveBookingNoteAction,
} from "@/lib/server/admin/actions/bookings";

type Props = {
  bookingId: string;
  status: string;
  note: string;
  hasPayments: boolean;
};

export function BookingAdminActions({ bookingId, status, note, hasPayments }: Props) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionState | null>(null);
  const [mode, setMode] = useState("policy");
  const [confirming, setConfirming] = useState(false);
  const [noteState, noteAction] = useActionState(saveBookingNoteAction.bind(null, bookingId), idle);

  const run = (task: () => Promise<ActionState>) =>
    startTransition(async () => {
      setResult(await task());
      setConfirming(false);
    });

  const canCancel = status === "confirmed" || status === "pending_payment";

  return (
    <div className="grid gap-6">
      <Card title="Actions">
        <div className="flex flex-wrap gap-2">
          {status === "confirmed" ? (
            <Button variant="secondary" disabled={pending} onClick={() => run(() => markCompletedAction(bookingId))}>
              <CheckCheck aria-hidden="true" /> Mark completed
            </Button>
          ) : null}
          {status === "confirmed" || status === "completed" ? (
            <Button variant="secondary" disabled={pending} onClick={() => run(() => resendConfirmationAction(bookingId))}>
              <Mail aria-hidden="true" /> Resend ticket by email
            </Button>
          ) : null}
          {canCancel && !confirming ? (
            <Button variant="danger" disabled={pending} onClick={() => setConfirming(true)}>
              <XCircle aria-hidden="true" /> Cancel booking
            </Button>
          ) : null}
        </div>

        {confirming ? (
          <div className="mt-4 grid gap-3 rounded-xl border border-red-400/40 bg-red-400/10 p-4">
            <Field label="How should the customer be refunded?" htmlFor="cancel-mode">
              <SelectMenu
                id="cancel-mode"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "policy", label: "Follow the cancellation policy (refund only if cancelled in time)" },
                  { value: "refund", label: "Refund everything paid (our cancellation)" },
                  { value: "no_refund", label: "No refund" },
                ]}
              />
            </Field>
            {!hasPayments ? <p className="text-sm text-muted">No payment has been received for this booking, so nothing will be refunded.</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button variant="danger" disabled={pending} onClick={() => run(() => cancelBookingAdminAction(bookingId, mode))}>
                {pending ? "Cancelling..." : "Confirm cancellation"}
              </Button>
              <Button variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>
                Keep booking
              </Button>
            </div>
          </div>
        ) : null}

        {result?.error ? <div className="mt-4"><Alert tone="danger">{result.error}</Alert></div> : null}
        {result?.ok && result.message ? <div className="mt-4"><Alert tone="success">{result.message}</Alert></div> : null}
      </Card>

      <Card title="Internal note" description="Only staff can see this. Customers never do.">
        <form action={noteAction} className="grid gap-3">
          <textarea name="note" defaultValue={note} rows={4} maxLength={1000} className={inputClass} aria-label="Internal note" />
          <FormMessage state={noteState} />
          <div>
            <SubmitButton variant="secondary">Save note</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
