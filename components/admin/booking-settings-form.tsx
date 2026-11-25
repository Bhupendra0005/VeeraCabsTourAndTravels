"use client";

import { AlertCircle, BellRing, CalendarClock, Mail, Plus, Trash2, Check, CheckCircle2, CircleX, Coins, CreditCard, Info, Loader2, Percent, Pencil, RotateCw, ShieldCheck, Umbrella, Wallet } from "lucide-react";
import { useEffect, useId, useMemo, useState, useTransition, type ReactNode } from "react";
import { Toggle } from "@/components/admin/toggle";
import type { ActionState } from "@/lib/admin/action-state";
import { BOOKING_SETTINGS_FIELDS, BOOKING_SETTINGS_KEY, type BookingSettings } from "@/lib/booking/settings";
import { usableRefundSlabs } from "@/lib/booking/config";
import { refundSentence } from "@/lib/booking/refund";
import type { ListField, NumberField } from "@/lib/cms/types";
import { saveDocAction } from "@/lib/server/admin/actions/content";
import { cn } from "@/lib/utils/cn";

/** Numbers may be empty while the owner is typing. */
type SlabDraft = { hoursBefore: number | ""; percent: number | "" };
type Draft = { [K in Exclude<keyof BookingSettings, "refundSlabs">]: BookingSettings[K] extends number ? number | "" : BookingSettings[K] } & { refundSlabs: SlabDraft[] };
type NumKey = "gstPercent" | "partPayPercent" | "balanceCutoffHours" | "insuranceRupees" | "freeCancelMinutes" | "minLeadMinutes" | "oneWayReturnPercent";

/** Limits come from the same schema the server validates against. */
const limits = (key: NumKey) => BOOKING_SETTINGS_FIELDS.find((f): f is NumberField => f.type === "number" && f.key === key)!;

const slabFields = (BOOKING_SETTINGS_FIELDS.find((f): f is ListField => f.type === "list" && f.key === "refundSlabs")!).fields as NumberField[];
const slabLimit = (key: "hoursBefore" | "percent") => slabFields.find((f) => f.key === key)!;

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

const span = (minutes: number) => (minutes < 60 ? `${minutes} min` : `${Number((minutes / 60).toFixed(1))} hrs`);

/** The refund policy as a row of stages, from "far ahead" (everything back) to "last minute" (nothing back). */
function RefundTimeline({ freeMinutes, steps }: { freeMinutes: number; steps: { minutes: number; percent: number }[] }) {
  const stages: { label: string; percent: number }[] = [{ label: `${span(freeMinutes)} or more before pickup`, percent: 100 }];
  steps.forEach((step, i) => stages.push({ label: `${span(step.minutes)} to ${span(i === 0 ? freeMinutes : steps[i - 1].minutes)} before`, percent: step.percent }));
  stages.push({ label: `Less than ${span(steps.length ? steps[steps.length - 1].minutes : freeMinutes)} before`, percent: 0 });

  return (
    <ol className="grid gap-2 sm:grid-flow-col sm:auto-cols-fr" aria-label="Refund by time left before pickup">
      {stages.map((stage, i) => (
        <li
          key={i}
          className={cn(
            "rounded-xl border px-3.5 py-3",
            stage.percent === 100 ? "border-emerald-400/30 bg-emerald-400/10" : stage.percent === 0 ? "border-red-400/30 bg-red-400/10" : "border-amber-400/30 bg-amber-400/10",
          )}
        >
          <div className={cn("font-(family-name:--font-display) text-2xl leading-none font-extrabold", stage.percent === 100 ? "text-emerald-300" : stage.percent === 0 ? "text-red-300" : "text-amber-300")}>{stage.percent}%</div>
          <div className="mt-1.5 text-xs text-white/70">{stage.label}</div>
        </li>
      ))}
    </ol>
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

  const setSlab = (index: number, patch: Partial<SlabDraft>) => {
    setResult(null);
    setDraft((current) => ({ ...current, refundSlabs: current.refundSlabs.map((row, i) => (i === index ? { ...row, ...patch } : row)) }));
  };
  const addSlab = () => {
    setResult(null);
    setDraft((current) => ({ ...current, refundSlabs: [...current.refundSlabs, { hoursBefore: Number(slabLimit("hoursBefore").defaultValue ?? 6), percent: Number(slabLimit("percent").defaultValue ?? 50) }] }));
  };
  const removeSlab = (index: number) => {
    setResult(null);
    setDraft((current) => ({ ...current, refundSlabs: current.refundSlabs.filter((_, i) => i !== index) }));
  };
  const livePolicy = refundSentence(
    Number(draft.freeCancelMinutes) || 0,
    draft.refundSlabs.filter((row): row is { hoursBefore: number; percent: number } => row.hoursBefore !== "" && row.percent !== ""),
  );
  const usableSteps = usableRefundSlabs(Number(draft.freeCancelMinutes) || 0, draft.refundSlabs.filter((row): row is { hoursBefore: number; percent: number } => row.hoursBefore !== "" && row.percent !== ""));
  const ignoredSteps = draft.refundSlabs.length - usableSteps.length;

  const save = () =>
    start(async () => {
      const keys: NumKey[] = ["gstPercent", "partPayPercent", "balanceCutoffHours", "insuranceRupees", "freeCancelMinutes", "minLeadMinutes", "oneWayReturnPercent"];
      if (keys.some((k) => draft[k] === "")) {
        setResult({ ok: false, error: "Please fill in every number before saving." });
        return;
      }
      const freeMinutes = Number(draft.freeCancelMinutes);
      const slabs: { hoursBefore: number; percent: number }[] = [];
      for (const [index, row] of draft.refundSlabs.entries()) {
        if (row.hoursBefore === "" || row.percent === "") {
          setResult({ ok: false, error: `Refund step ${index + 1}: fill in both the hours and the percentage, or remove the step.` });
          return;
        }
        if (row.hoursBefore * 60 >= freeMinutes) {
          setResult({ ok: false, error: `Refund step ${index + 1}: it must be shorter than the full-refund time (${freeMinutes} minutes), because it applies after it.` });
          return;
        }
        if (!Number.isInteger(row.percent) || row.percent < 1 || row.percent > 99) {
          setResult({ ok: false, error: `Refund step ${index + 1}: the refund must be a whole number from 1 to 99.` });
          return;
        }
        slabs.push({ hoursBefore: row.hoursBefore, percent: row.percent });
      }
      if (new Set(slabs.map((x) => x.hoursBefore)).size !== slabs.length) {
        setResult({ ok: false, error: "Two refund steps use the same hours. Each step needs a different time." });
        return;
      }
      const outcome = await saveDocAction(BOOKING_SETTINGS_KEY, { ...draft, refundSlabs: slabs.sort((a, b) => b.hoursBefore - a.hoursBefore) });
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
          {!draft.onlineBookingEnabled ? <div className="mt-2 text-xs text-amber-300">Online booking is paused. Customers see this message.</div> : null}
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Panel icon={<Coins />} title="Pricing & Payments" text="Configure taxes and payment requirements.">
          <div className="divide-y divide-white/8 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
            <Row icon={<Percent />} title="GST on fare (%)" hint="Tax applied on the total fare. Confirm the right rate with your accountant.">
              {num("gstPercent", "GST on fare", "%")}
            </Row>
            <Row icon={<Percent />} title="One-way return charge (%)" hint="A one-way trip also counts the driver's drive back: this share of the one-way fare is added on top. 80 turns a ₹5,000 fare into ₹9,000. 0 = off.">
              {num("oneWayReturnPercent", "One-way return charge", "%")}
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
            <Row icon={<CircleX />} title="Full refund until (minutes before pickup)" hint="Customers get a full refund if they cancel at least this long before pickup. 60 means until 1 hour before pickup. Partial refunds can follow (see Partial refund steps below).">
              {num("freeCancelMinutes", "Full refund until", "min")}
            </Row>
            <Row icon={<CalendarClock />} title="Earliest bookable pickup (minutes from now)" hint="Minimum time from now to allow a new booking.">
              {num("minLeadMinutes", "Earliest bookable pickup", "min")}
            </Row>
          </div>
        </Panel>
      </div>

      <Panel icon={<CircleX />} title="Partial refund steps" text="Return part of the money when a customer cancels after the full-refund time. Leave empty to refund either everything or nothing.">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
          <p className="text-sm text-muted">
            Full refund until <b className="text-foreground">{Number(draft.freeCancelMinutes) || 0} minutes</b> before pickup (set above under Booking Rules). After that, these steps apply:
          </p>
          {draft.refundSlabs.length === 0 ? <div className="mt-3 text-sm text-muted">No steps yet: after the full-refund time customers get no refund.</div> : null}
          <ul className="mt-3 grid gap-3">
            {draft.refundSlabs.map((row, index) => (
              <li key={index} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-white/10 bg-white/4 p-3">
                <span className="text-sm font-semibold">Cancelled at least</span>
                <NumberBox id={`${base}-slab-h-${index}`} label={`Refund step ${index + 1}: hours before pickup`} unit="hrs" field={slabLimit("hoursBefore")} value={row.hoursBefore} onChange={(v) => setSlab(index, { hoursBefore: v })} />
                <span className="text-sm font-semibold">before pickup: refund</span>
                <NumberBox id={`${base}-slab-p-${index}`} label={`Refund step ${index + 1}: refund percent`} unit="%" field={slabLimit("percent")} value={row.percent} onChange={(v) => setSlab(index, { percent: v })} />
                <button
                  type="button"
                  onClick={() => removeSlab(index)}
                  aria-label={`Remove refund step ${index + 1}`}
                  className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-lg border border-white/12 px-3 text-sm font-semibold text-red-300 transition hover:bg-red-400/10"
                >
                  <Trash2 className="size-4" aria-hidden="true" /> Remove
                </button>
              </li>
            ))}
          </ul>
          {ignoredSteps > 0 ? <div className="mt-3 text-xs text-amber-300">A step must be shorter than the full-refund time; steps that are not will be ignored (and cannot be saved).</div> : null}
          {draft.refundSlabs.length < 6 ? (
            <button type="button" onClick={addSlab} className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg border border-brand-bright/40 px-4 text-sm font-semibold text-brand-bright transition hover:bg-brand/10">
              <Plus className="size-4" aria-hidden="true" /> Add a refund step
            </button>
          ) : null}
          <div className="mt-5 grid gap-3">
            <div className="text-[11px] font-bold tracking-[0.16em] text-muted uppercase">Refund by time left before pickup</div>
            <RefundTimeline freeMinutes={Number(draft.freeCancelMinutes) || 0} steps={usableSteps} />
          </div>
          <div className="mt-4 rounded-xl bg-white/5 p-3 text-sm" aria-live="polite">
            <span className="font-semibold">Customers will see:</span> {livePolicy}
          </div>
        </div>
      </Panel>

      <Panel icon={<BellRing />} title="Booking alerts" text="Get an email when a customer books and pays online, or cancels a booking.">
        <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <Toggle checked={draft.ownerAlerts} onChange={(v) => set("ownerAlerts", v)} label="Email me about new bookings and cancellations" />
            <div>
              <p className="font-semibold">Email me about new bookings and cancellations</p>
              <p className="text-[13px] text-muted">Phone bookings you enter yourself are not emailed.</p>
            </div>
          </div>
          <div>
            <label htmlFor={`${base}-alerts`} className="mb-2 flex items-center gap-2 font-semibold">
              <Mail className="size-4 text-brand-bright" aria-hidden="true" /> Send booking alerts to
            </label>
            <input
              id={`${base}-alerts`}
              type="text"
              inputMode="email"
              autoComplete="off"
              value={draft.ownerAlertEmails}
              maxLength={400}
              disabled={!draft.ownerAlerts}
              placeholder="owner@example.com, manager@example.com"
              onChange={(e) => set("ownerAlertEmails", e.target.value)}
              className="h-12 w-full rounded-xl border border-white/12 bg-black/30 px-4 text-sm outline-none transition hover:border-white/20 focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:opacity-50"
            />
            <p className="mt-2 text-[13px] text-muted">Up to 5 addresses, separated by commas. Leave empty to use the email address shown on your website.</p>
          </div>
        </div>
      </Panel>

      {/* Action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0a0d0e]/95 px-4 py-3 backdrop-blur-xl lg:left-66">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 sm:gap-3 sm:px-2">
          <span className="hidden size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-bright ring-1 ring-brand-bright/20 sm:grid">
            <Info className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 basis-60 max-sm:order-last max-sm:basis-full" aria-live="polite">
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
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 max-sm:flex-1 max-sm:px-3"
          >
            <RotateCw className="size-4" aria-hidden="true" /> Discard
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-brand to-brand-bright px-6 text-sm font-bold text-white shadow-[0_10px_28px_-10px_rgba(0,150,219,0.85)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none max-sm:flex-1 max-sm:px-3"
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
            {pending ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
