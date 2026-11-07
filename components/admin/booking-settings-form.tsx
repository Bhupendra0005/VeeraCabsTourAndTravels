"use client";

import { AlertCircle, CalendarClock, Check, CheckCircle2, CircleX, Coins, CreditCard, Info, Loader2, Percent, Pencil, RotateCw, ShieldCheck, Umbrella, Wallet } from "lucide-react";
import { useEffect, useId, useMemo, useState, useTransition, type ReactNode } from "react";
import { Toggle } from "@/components/admin/toggle";
import type { ActionState } from "@/lib/admin/action-state";
import { BOOKING_SETTINGS_FIELDS, BOOKING_SETTINGS_KEY, type BookingSettings } from "@/lib/booking/settings";
import type { NumberField } from "@/lib/cms/types";
import { saveDocAction } from "@/lib/server/admin/actions/content";
import { cn } from "@/lib/utils/cn";

/** Numbers may be empty while the owner is typing. */
type Draft = { [K in keyof BookingSettings]: BookingSettings[K] extends number ? number | "" : BookingSettings[K] };
type NumKey = "gstPercent" | "partPayPercent" | "balanceCutoffHours" | "insuranceRupees" | "freeCancelMinutes" | "minLeadMinutes";

/** Limits come from the same schema the server validates against. */
const limits = (key: NumKey) => BOOKING_SETTINGS_FIELDS.find((f): f is NumberField => f.type === "number" && f.key === key)!;

function Panel({ icon, title, text, children, className }: { icon: ReactNode; title: string; text: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-brand-bright/25 bg-linear-to-b from-[#0c1a24] to-panel p-4 shadow-[0_0_44px_-20px_rgba(0,150,219,0.5)] sm:p-6", className)}>
      <div className="mb-5 flex items-center gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-brand/25 to-brand/5 text-brand-bright ring-1 ring-brand-bright/25 [&>svg]:size-6">{icon}</span>
        <div className="min-w-0">
          <h2 className="font-(family-name:--font-display) text-xl font-bold">{title}</h2>
          <p className="text-sm text-muted">{text}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Row({ icon, title, hint, children }: { icon: ReactNode; title: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4 first:pt-0 last:pb-0 sm:flex-nowrap">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/5 text-brand-bright ring-1 ring-white/10 [&>svg]:size-5">{icon}</span>
      <div className="min-w-0 flex-1 basis-48">
        <p className="font-semibold">{title}</p>
        <p className="text-[13px] text-muted">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function NumberBox({ id, label, unit, value, onChange, field }: { id: string; label: string; unit: string; value: number | ""; onChange: (v: number | "") => void; field: NumberField }) {
  return (
    <div className="flex h-11 w-36 shrink-0 overflow-hidden rounded-xl border border-white/12 bg-black/30 transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15">
      <input
        id={id}
        type="number"
        inputMode="decimal"
        aria-label={label}
        value={value}
        min={field.min}
        max={field.max}
        step={field.step ?? 1}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        className="min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="grid min-w-11 place-items-center border-l border-white/10 bg-white/5 px-2 text-sm font-semibold text-white/70">{unit}</span>
    </div>
  );
}

export function BookingSettingsForm({ initial }: { initial: BookingSettings }) {
  const base = useId();
  const [draft, setDraft] = useState<Draft>(initial);
  const [baseline, setBaseline] = useState<Draft>(initial);
  const [result, setResult] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(baseline), [draft, baseline]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof BookingSettings>(key: K, value: BookingSettings[K] | "") => {
    setResult(null);
    setDraft((current) => ({ ...current, [key]: value }) as Draft);
  };
  const num = (key: NumKey, label: string, unit: string) => (
    <NumberBox id={`${base}-${key}`} label={label} unit={unit} field={limits(key)} value={draft[key]} onChange={(v) => set(key, v as never)} />
  );

  const save = () =>
    start(async () => {
      const keys: NumKey[] = ["gstPercent", "partPayPercent", "balanceCutoffHours", "insuranceRupees", "freeCancelMinutes", "minLeadMinutes"];
      if (keys.some((k) => draft[k] === "")) {
        setResult({ ok: false, error: "Please fill in every number before saving." });
        return;
      }
      const outcome = await saveDocAction(BOOKING_SETTINGS_KEY, draft);
      setResult(outcome);
      if (outcome.ok) setBaseline(draft);
    });

  const discard = () => {
    setDraft(baseline);
    setResult(null);
  };

  return (
    <div className="grid gap-6 pb-28">
      {/* Accept bookings */}
      <section className="grid gap-5 rounded-2xl border border-brand-bright/30 bg-linear-to-b from-[#0c1a24] to-panel p-5 shadow-[0_0_44px_-18px_rgba(0,150,219,0.55)] sm:p-6 lg:grid-cols-[1fr_1.1fr] lg:gap-0">
        <div className="flex items-center gap-5 lg:border-r lg:border-white/10 lg:pr-8">
          <Toggle checked={draft.onlineBookingEnabled} onChange={(v) => set("onlineBookingEnabled", v)} label="Accept online bookings" />
          <div>
            <p className="font-(family-name:--font-display) text-lg font-bold">Accept online bookings</p>
            <p className="text-sm text-muted">Turn off to pause new online bookings (for example during a holiday). Existing bookings are not affected.</p>
          </div>
        </div>
        <div className="lg:pl-8">
          <label htmlFor={`${base}-msg`} className="mb-2 flex items-center gap-2 font-semibold">
            <Info className="size-4 text-brand-bright" aria-hidden="true" /> Message shown while paused
          </label>
          <div className="group relative">
            <input
              id={`${base}-msg`}
              value={draft.maintenanceMessage}
              maxLength={200}
              onChange={(e) => set("maintenanceMessage", e.target.value)}
              className="h-12 w-full rounded-xl border border-white/12 bg-black/30 pl-4 pr-11 text-sm outline-none transition hover:border-white/20 focus:border-brand focus:ring-4 focus:ring-brand/15"
            />
            <Pencil className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-brand-bright" aria-hidden="true" />
          </div>
          {!draft.onlineBookingEnabled ? <p className="mt-2 text-xs text-amber-300">Online booking is paused. Customers see this message.</p> : null}
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Panel icon={<Coins />} title="Pricing & Payments" text="Configure taxes and payment requirements.">
          <div className="divide-y divide-white/8 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
            <Row icon={<Percent />} title="GST on fare (%)" hint="Tax applied on the total fare. Confirm the right rate with your accountant.">
              {num("gstPercent", "GST on fare", "%")}
            </Row>
            <Row icon={<Wallet />} title="Advance for part payment (%)" hint="Share of the total paid online to reserve the cab.">
              {num("partPayPercent", "Advance for part payment", "%")}
            </Row>
            <Row icon={<CreditCard />} title="Online balance payment closes" hint="Hours before pickup by which the remaining amount must be paid online.">
              {num("balanceCutoffHours", "Online balance payment closes", "hrs")}
            </Row>
          </div>
        </Panel>

        <Panel icon={<ShieldCheck />} title="Booking Rules" text="Configure trip protection, cancellation and booking windows.">
          <div className="divide-y divide-white/8 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
            <div className="flex items-center gap-4 pb-4">
              <Toggle checked={draft.insuranceEnabled} onChange={(v) => set("insuranceEnabled", v)} label="Offer optional trip protection" />
              <div>
                <p className="font-semibold">Offer optional trip protection</p>
                <p className="text-[13px] text-muted">Let customers add trip protection at the time of booking.</p>
              </div>
            </div>
            <Row icon={<Umbrella />} title="Trip protection price (₹)" hint="Additional amount for trip protection.">
              {num("insuranceRupees", "Trip protection price", "₹")}
            </Row>
            <Row icon={<CircleX />} title="Free cancellation until (minutes before pickup)" hint="Customers can cancel for a full refund within this time. 60 means until 1 hour before pickup.">
              {num("freeCancelMinutes", "Free cancellation until", "min")}
            </Row>
            <Row icon={<CalendarClock />} title="Earliest bookable pickup (minutes from now)" hint="Minimum time from now to allow a new booking.">
              {num("minLeadMinutes", "Earliest bookable pickup", "min")}
            </Row>
          </div>
        </Panel>
      </div>

      {/* Action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0a0d0e]/95 px-4 py-3 backdrop-blur-xl lg:left-[264px]">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 sm:px-2">
          <span className="hidden size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-bright ring-1 ring-brand-bright/20 sm:grid">
            <Info className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 basis-60" aria-live="polite">
            {result?.error ? (
              <p className="flex items-start gap-2 text-sm text-red-300">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> <span className="wrap-anywhere">{result.error}</span>
              </p>
            ) : result?.ok ? (
              <p className="flex items-center gap-2 text-sm text-emerald-300">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" /> Saved. Online booking, invoices, emails and the Terms page use these settings.
              </p>
            ) : (
              <>
                <p className="text-sm font-semibold">Note</p>
                <p className="text-[13px] text-muted">{dirty ? "You have unsaved changes." : "These settings affect online bookings, invoices, emails and the Terms page."}</p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={discard}
            disabled={pending || !dirty}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCw className="size-4" aria-hidden="true" /> Discard
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-linear-to-r from-brand to-brand-bright px-6 text-sm font-bold text-white shadow-[0_10px_28px_-10px_rgba(0,150,219,0.85)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
            {pending ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
