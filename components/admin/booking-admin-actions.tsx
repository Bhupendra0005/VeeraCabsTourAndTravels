"use client";

import { CheckCheck, HandCoins, Mail, Trash2, UserRound, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { FormMessage, SubmitButton } from "@/components/admin/form-parts";
import { SelectMenu } from "@/components/admin/pickers";
import { Alert, Button, Card, Field, inputClass } from "@/components/admin/ui";
import { idle, type ActionState } from "@/lib/admin/action-state";
import {
  assignDriverAction,
  cancelBookingAdminAction,
  deleteBookingAdminAction,
  markCompletedAction,
  recordBalanceAction,
  resendConfirmationAction,
  saveBookingNoteAction,
} from "@/lib/server/admin/actions/bookings";

type Props = {
  bookingId: string;
  status: string;
  note: string;
  hasPayments: boolean;
  driver: { id: string; name: string; phone: string; cab: string; model: string };
  /** Saved drivers to choose from. */
  drivers: { id: string; name: string; phone: string; cab: string; model: string }[];
  /** What the customer still owes, in paise (0 when fully paid). */
  due: number;
  /** What the cancellation policy would refund if the booking were cancelled right now (0-100). */
  policyPercent: number;
  /** Booking ID shown to the admin and typed back to confirm a delete. */
  bookingRef: string;
  /** Only the owner sees the delete option (the server checks again). */
  canDelete: boolean;
  /** True when money has been received: the server refuses to delete such a booking. */
  hasPaidMoney: boolean;
};

export function BookingAdminActions({ bookingId, status, note, hasPayments, driver, drivers, due, policyPercent, bookingRef, canDelete, hasPaidMoney }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleteResult, setDeleteResult] = useState<ActionState | null>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionState | null>(null);
  const [mode, setMode] = useState("policy");
  const [confirming, setConfirming] = useState(false);
  const [noteState, noteAction] = useActionState(saveBookingNoteAction.bind(null, bookingId), idle);
  const [noteText, setNoteText] = useState(note);
  const [driverState, driverAction] = useActionState(assignDriverAction.bind(null, bookingId), idle);
  // controlled fields: a form action resets plain inputs, which would wipe what the owner typed when a check fails
  const [drv, setDrv] = useState({ id: driver.id, name: driver.name, phone: driver.phone, cab: driver.cab, model: driver.model, notify: true, save: false });
  const [balanceState, balanceAction] = useActionState(recordBalanceAction.bind(null, bookingId), idle);
  const [bal, setBal] = useState({ amount: due > 0 ? String(due / 100) : "", method: "cash" });
  const pick = (id: string) => {
    const saved = drivers.find((d) => d.id === id);
    setDrv(saved ? { ...drv, id, name: saved.name, phone: saved.phone, cab: saved.cab, model: saved.model, save: false } : { ...drv, id: "" });
  };

  const run = (task: () => Promise<ActionState>) =>
    startTransition(async () => {
      setResult(await task());
      setConfirming(false);
    });

  const canCancel = status === "confirmed" || status === "pending_payment";

  return (
    <div className="grid gap-6">
      <Card title="Actions">
        {!canCancel && status !== "confirmed" && status !== "completed" ? (
          <p className="text-sm text-muted">No actions are available for a {status === "cancelled" ? "cancelled" : "closed"} booking. You can still add an internal note below.</p>
        ) : null}
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
                  { value: "policy", label: `Follow the cancellation policy (right now: ${policyPercent === 0 ? "no refund" : `${policyPercent}% refund`})` },
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

      {canDelete ? (
        <Card title="Delete booking" description="Permanently removes this booking, its payment attempts and its review. This cannot be undone.">
          {!deleting ? (
            <Button variant="danger" disabled={pending} onClick={() => { setResult(null); setDeleting(true); }}>
              <Trash2 aria-hidden="true" /> Delete booking
            </Button>
          ) : (
            <div className="grid gap-3 rounded-xl border border-red-400/40 bg-red-400/10 p-4">
              <p className="text-sm">
                Are you sure? To confirm, type the booking ID <b className="font-mono">{bookingRef}</b> below.
              </p>
              <input
                aria-label="Type the booking ID to confirm"
                value={deleteText}
                onChange={(event) => setDeleteText(event.target.value)}
                autoComplete="off"
                maxLength={20}
                className={`${inputClass} font-mono uppercase`}
                placeholder={bookingRef}
              />
              {hasPaidMoney ? <Alert tone="warning">This booking has received money. Cancel and refund it first: a booking with a payment cannot be deleted.</Alert> : null}
              {deleteResult?.error ? <Alert tone="danger">{deleteResult.error}</Alert> : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="danger"
                  disabled={pending || deleteText.trim().toUpperCase() !== bookingRef.toUpperCase()}
                  onClick={() =>
                    startTransition(async () => {
                      const outcome = await deleteBookingAdminAction(bookingId, deleteText);
                      setDeleteResult(outcome);
                      if (outcome.ok) router.push("/admin/bookings");
                    })
                  }
                >
                  {pending ? "Deleting..." : "Yes, delete permanently"}
                </Button>
                <Button variant="secondary" disabled={pending} onClick={() => { setDeleting(false); setDeleteText(""); setDeleteResult(null); }}>
                  Keep booking
                </Button>
              </div>
            </div>
          )}
        </Card>
      ) : null}

      {(status === "confirmed" || status === "completed") && (due > 0 || balanceState.ok) ? (
        <Card title="Collect the balance" description={due > 0 ? `The customer still owes ${(due / 100).toLocaleString("en-IN", { style: "currency", currency: "INR" })}. When the driver (or you) receives it, record it here so the booking shows fully paid.` : "Nothing is left to collect."}>
          {due <= 0 ? <FormMessage state={balanceState} /> : null}
          <form action={balanceAction} className={due <= 0 ? "hidden" : "grid gap-4"}>
            <div className="grid grid-cols-[1fr_130px] gap-3">
              <Field label="Amount received (₹)" htmlFor="bal-amount">
                <input id="bal-amount" name="amount" inputMode="decimal" maxLength={12} autoComplete="off" className={inputClass} value={bal.amount} onChange={(e) => setBal({ ...bal, amount: e.target.value })} />
              </Field>
              <Field label="Paid by" htmlFor="bal-method">
                <SelectMenu
                  id="bal-method"
                  name="method"
                  size="lg"
                  value={bal.method}
                  onChange={(method) => setBal({ ...bal, method })}
                  options={[
                    { value: "cash", label: "Cash" },
                    { value: "upi", label: "UPI" },
                    { value: "bank", label: "Bank" },
                  ]}
                />
              </Field>
            </div>
            {due > 0 ? <FormMessage state={balanceState} /> : null}
            <div>
              <SubmitButton pendingText="Saving...">
                <HandCoins aria-hidden="true" /> Record payment received
              </SubmitButton>
            </div>
          </form>
        </Card>
      ) : null}

      {status === "confirmed" ? (
        <Card title="Driver & cab" description="The customer sees these on their ticket page and e-ticket, and is emailed when you save. Leave every field empty and save to remove them.">
          <form action={driverAction} className="grid gap-4">
            <input type="hidden" name="driverId" value={drv.id} />
            {drivers.length > 0 ? (
              <Field label="Choose from your drivers" htmlFor="drv-pick" hint="Picking one fills the fields below. You can still change them for this trip.">
                <SelectMenu
                  id="drv-pick"
                  size="lg"
                  value={drv.id}
                  onChange={pick}
                  options={[{ value: "", label: "Type a new driver below" }, ...drivers.map((d) => ({ value: d.id, label: `${d.name} · ${d.cab || "no cab number"} · +91 ${d.phone}` }))]}
                />
              </Field>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Driver name" htmlFor="drv-name">
                <input id="drv-name" name="driverName" value={drv.name} onChange={(e) => setDrv({ ...drv, name: e.target.value })} maxLength={80} autoComplete="off" className={inputClass} placeholder="e.g. Ramesh Patil" />
              </Field>
              <Field label="Driver mobile" htmlFor="drv-phone" hint="10 digits. The customer can call this number.">
                <input id="drv-phone" name="driverPhone" value={drv.phone} onChange={(e) => setDrv({ ...drv, phone: e.target.value })} inputMode="numeric" maxLength={20} autoComplete="off" className={inputClass} placeholder="98765 43210" />
              </Field>
              <Field label="Cab number" htmlFor="drv-cab">
                <input id="drv-cab" name="cabNumber" value={drv.cab} onChange={(e) => setDrv({ ...drv, cab: e.target.value })} maxLength={20} autoComplete="off" className={`${inputClass} uppercase`} placeholder="MH12 AB 1234" />
              </Field>
              <Field label="Cab model and colour (optional)" htmlFor="drv-model">
                <input id="drv-model" name="cabModel" value={drv.model} onChange={(e) => setDrv({ ...drv, model: e.target.value })} maxLength={60} autoComplete="off" className={inputClass} placeholder="Swift Dzire, white" />
              </Field>
            </div>
            {!drv.id ? (
              <label className="flex items-center gap-2.5 text-sm">
                <input type="checkbox" name="saveDriver" checked={drv.save} onChange={(e) => setDrv({ ...drv, save: e.target.checked })} className="size-4 accent-brand" /> Save this driver to my drivers list
              </label>
            ) : null}
            <label className="flex items-center gap-2.5 text-sm">
              <input type="checkbox" name="notify" checked={drv.notify} onChange={(e) => setDrv({ ...drv, notify: e.target.checked })} className="size-4 accent-brand" /> Email these details to the customer
            </label>
            <FormMessage state={driverState} />
            <div>
              <SubmitButton pendingText="Saving...">
                <UserRound aria-hidden="true" /> {driver.name ? "Update driver & cab" : "Assign driver & cab"}
              </SubmitButton>
            </div>
          </form>
        </Card>
      ) : null}

      <Card title="Internal note" description="Only staff can see this. Customers never do.">
        <form action={noteAction} className="grid gap-3">
          <textarea name="note" value={noteText} onChange={(event) => setNoteText(event.target.value)} rows={4} maxLength={1000} className={inputClass} aria-label="Internal note" />
          <FormMessage state={noteState} />
          <div>
            <SubmitButton variant="secondary">Save note</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
