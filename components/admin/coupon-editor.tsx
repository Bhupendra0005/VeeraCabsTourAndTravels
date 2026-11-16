"use client";

import { IndianRupee, Pencil, Percent, Plus, Power, TicketPercent, Trash2, X } from "lucide-react";
import { useId, useRef, useState, useTransition, type ReactNode } from "react";
import { Alert, Button, Field, inputClass } from "@/components/admin/ui";
import type { ActionState } from "@/lib/admin/action-state";
import { deleteCouponAction, saveCouponAction, setCouponActiveAction } from "@/lib/server/admin/actions/coupons";

export type CouponData = {
  code: string;
  description: string;
  kind: "percent" | "flat";
  value: number;
  maxDiscount: number;
  minFare: number;
  active: boolean;
  firstBookingOnly?: boolean;
  maxUsesPerCustomer?: number;
  maxUsesTotal?: number;
};

type Draft = {
  code: string;
  description: string;
  kind: "percent" | "flat";
  value: string;
  maxDiscount: string;
  minFare: string;
  maxUsesPerCustomer: string;
  maxUsesTotal: string;
  firstBookingOnly: boolean;
  active: boolean;
};

const blank: Draft = { code: "", description: "", kind: "percent", value: "10", maxDiscount: "0", minFare: "0", maxUsesPerCustomer: "0", maxUsesTotal: "0", firstBookingOnly: false, active: true };

const toDraft = (c: CouponData): Draft => ({
  code: c.code,
  description: c.description,
  kind: c.kind,
  value: String(c.value),
  maxDiscount: String(c.maxDiscount ?? 0),
  minFare: String(c.minFare ?? 0),
  maxUsesPerCustomer: String(c.maxUsesPerCustomer ?? 0),
  maxUsesTotal: String(c.maxUsesTotal ?? 0),
  firstBookingOnly: c.firstBookingOnly === true,
  active: c.active,
});

const digits = (value: string) => value.replace(/\D/g, "").slice(0, 7);

/** A titled group of fields inside the form. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="mb-3 flex w-full items-center gap-3 text-xs font-bold uppercase tracking-wider text-brand-bright">
        {title}
        <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
      </legend>
      {children}
    </fieldset>
  );
}

/** An input with a fixed mark (₹ or %) inside it. The input needs the matching padding. */
function Adorned({ mark, side, children }: { mark: string; side: "start" | "end"; children: ReactNode }) {
  return (
    <div className={`relative ${side === "start" ? "[&>input]:pl-8" : "[&>input]:pr-9"}`}>
      <span aria-hidden="true" className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-sm font-semibold text-white/50 ${side === "start" ? "left-3.5" : "right-3.5"}`}>
        {mark}
      </span>
      {children}
    </div>
  );
}

/** A proper on/off switch row (a real checkbox underneath, so keyboard and screen readers work). */
function Switch({ checked, onChange, title, text }: { checked: boolean; onChange: (on: boolean) => void; title: string; text: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/3 p-3.5 transition hover:border-white/20 has-focus-visible:outline-2 has-focus-visible:outline-brand">
      <span className="min-w-0 flex-1 text-sm">
        <b className="block">{title}</b>
        <span className="text-muted">{text}</span>
      </span>
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 shrink-0 rounded-full bg-white/15 transition peer-checked:bg-brand after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
      />
    </label>
  );
}

/** Dialog with the coupon form. `coupon` set = edit that coupon, otherwise add a new one. */
export function CouponDialogButton({ coupon }: { coupon?: CouponData }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [v, setV] = useState<Draft>(coupon ? toDraft(coupon) : blank);
  const [result, setResult] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  const editing = Boolean(coupon);
  const uid = useId();
  const preview = v.kind === "percent" ? `${v.value || 0}% OFF` : `₹${Number(v.value || 0).toLocaleString("en-IN")} OFF`;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setV((cur) => ({ ...cur, [key]: value }));
  const open = () => {
    setResult(null);
    setV(coupon ? toDraft(coupon) : blank);
    ref.current?.showModal();
  };
  const close = () => ref.current?.close();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    start(async () => {
      const res = await saveCouponAction(coupon?.code ?? null, {
        code: v.code,
        description: v.description,
        kind: v.kind,
        value: Number(v.value),
        maxDiscount: Number(v.maxDiscount || 0),
        minFare: Number(v.minFare || 0),
        maxUsesPerCustomer: Number(v.maxUsesPerCustomer || 0),
        maxUsesTotal: Number(v.maxUsesTotal || 0),
        firstBookingOnly: v.firstBookingOnly,
        active: v.active,
      });
      if (res.ok) close();
      else setResult(res);
    });
  };

  return (
    <>
      {editing ? (
        <Button variant="secondary" size="sm" onClick={open}>
          <Pencil aria-hidden="true" /> Edit
        </Button>
      ) : (
        <Button onClick={open}>
          <Plus aria-hidden="true" /> Add coupon
        </Button>
      )}
      <dialog
        ref={ref}
        aria-labelledby={`coupon-title-${uid}`}
        onClick={(e) => {
          if (e.target === ref.current) close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-2xl border border-brand-bright/30 bg-panel p-0 text-(--text) shadow-[0_0_60px_-10px_rgba(0,150,219,0.5)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      >
        <form onSubmit={submit} className="flex max-h-[88vh] flex-col">
          <div className="flex items-start gap-3 border-b border-white/10 p-5 sm:px-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-bright ring-1 ring-brand-bright/20">
              <TicketPercent className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={`coupon-title-${uid}`} className="font-(family-name:--font-display) text-lg font-bold">
                {editing ? `Edit ${coupon?.code}` : "Add a coupon"}
              </h2>
              <p className="text-sm text-muted">Customers type the code on the booking page. Changes go live straight away.</p>
            </div>
            <button type="button" onClick={close} aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-6 overflow-y-auto p-5 sm:p-6">
            {/* live preview of what the coupon will look like */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-brand-bright/25 bg-linear-to-br from-[#0c1a24] to-panel p-4">
              <span className="inline-flex max-w-full items-center gap-2 rounded-lg border border-dashed border-brand-bright/50 bg-brand/10 px-3 py-1.5 font-mono text-sm font-bold tracking-wider text-brand-bright wrap-anywhere">
                <TicketPercent className="size-4 shrink-0" aria-hidden="true" /> {v.code || "YOURCODE"}
              </span>
              <span className="font-(family-name:--font-display) text-2xl font-bold">{preview}</span>
              <span className="min-w-0 basis-full text-sm text-muted wrap-anywhere">{v.description || "Your offer text appears here."}</span>
            </div>

            <Section title="The coupon">
              <div className="grid gap-4">
                <Field label="Coupon code" htmlFor={`cp-code-${uid}`} hint="Capital letters and numbers, no spaces.">
                  <input
                    id={`cp-code-${uid}`}
                    className={`${inputClass} font-mono uppercase tracking-wider`}
                    value={v.code}
                    maxLength={20}
                    required
                    autoComplete="off"
                    placeholder="WELCOME10"
                    onChange={(e) => set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  />
                </Field>
                <Field label="Offer text shown to customers" htmlFor={`cp-desc-${uid}`}>
                  <input
                    id={`cp-desc-${uid}`}
                    className={inputClass}
                    value={v.description}
                    maxLength={120}
                    required
                    placeholder="Get 10% off on your first cab booking"
                    onChange={(e) => set("description", e.target.value)}
                  />
                </Field>
              </div>
            </Section>

            <Section title="The discount">
              <div className="grid gap-4">
                <div role="radiogroup" aria-label="Discount type" className="grid grid-cols-2 gap-1 rounded-xl border border-white/12 bg-black/30 p-1">
                  {(
                    [
                      ["percent", "Percent of fare", Percent],
                      ["flat", "Flat ₹ off", IndianRupee],
                    ] as const
                  ).map(([kind, label, Icon]) => (
                    <button
                      key={kind}
                      type="button"
                      role="radio"
                      aria-checked={v.kind === kind}
                      onClick={() => set("kind", kind)}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                        v.kind === kind ? "bg-brand text-white shadow-[0_6px_16px_-8px_rgba(0,150,219,0.9)]" : "text-white/70 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className="size-4" aria-hidden="true" /> {label}
                    </button>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={v.kind === "percent" ? "Discount" : "Discount amount"} htmlFor={`cp-value-${uid}`}>
                    <Adorned side={v.kind === "percent" ? "end" : "start"} mark={v.kind === "percent" ? "%" : "₹"}>
                      <input id={`cp-value-${uid}`} className={inputClass} inputMode="numeric" value={v.value} required onChange={(e) => set("value", digits(e.target.value))} />
                    </Adorned>
                  </Field>
                  {v.kind === "percent" ? (
                    <Field label="Maximum discount" htmlFor={`cp-max-${uid}`} hint="0 = no limit">
                      <Adorned side="start" mark="₹">
                        <input id={`cp-max-${uid}`} className={inputClass} inputMode="numeric" value={v.maxDiscount} onChange={(e) => set("maxDiscount", digits(e.target.value))} />
                      </Adorned>
                    </Field>
                  ) : null}
                </div>
              </div>
            </Section>

            <Section title="Rules and limits">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Minimum fare" htmlFor={`cp-min-${uid}`} hint="0 = no minimum">
                  <Adorned side="start" mark="₹">
                    <input id={`cp-min-${uid}`} className={inputClass} inputMode="numeric" value={v.minFare} onChange={(e) => set("minFare", digits(e.target.value))} />
                  </Adorned>
                </Field>
                <Field label="Uses per customer" htmlFor={`cp-per-${uid}`} hint="0 = no limit">
                  <input id={`cp-per-${uid}`} className={inputClass} inputMode="numeric" value={v.maxUsesPerCustomer} onChange={(e) => set("maxUsesPerCustomer", digits(e.target.value))} />
                </Field>
                <Field label="Total uses" htmlFor={`cp-total-${uid}`} hint="0 = no limit">
                  <input id={`cp-total-${uid}`} className={inputClass} inputMode="numeric" value={v.maxUsesTotal} onChange={(e) => set("maxUsesTotal", digits(e.target.value))} />
                </Field>
              </div>
              <div className="mt-4 grid gap-2.5">
                <Switch
                  checked={v.firstBookingOnly}
                  onChange={(on) => set("firstBookingOnly", on)}
                  title="First booking only"
                  text="Customers who already have a booking cannot use it."
                />
                <Switch checked={v.active} onChange={(on) => set("active", on)} title="Coupon is running" text="Switch off to stop it working without deleting it." />
              </div>
            </Section>

            {result?.error ? <Alert tone="danger">{result.error}</Alert> : null}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 bg-panel p-4 sm:px-6">
            <Button variant="secondary" onClick={close} className="max-sm:flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="max-sm:flex-1">
              {pending ? "Saving..." : editing ? "Save coupon" : "Add coupon"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

/** Switch a coupon on or off, or delete it (asks once before deleting). */
export function CouponQuickActions({ code, active }: { code: string; active: boolean }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = (task: () => Promise<ActionState>) =>
    start(async () => {
      setError(null);
      const res = await task();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      setConfirming(false);
    });

  return (
    // `contents`: the two buttons sit in the card footer's grid row next to Edit; the confirm line and errors span the full row below
    <div className="contents">
      <Button variant="secondary" size="sm" className="min-h-10 max-sm:[&>svg]:hidden" disabled={pending} onClick={() => run(() => setCouponActiveAction(code, !active))}>
        <Power aria-hidden="true" /> {active ? "Switch off" : "Switch on"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="min-h-10 border border-red-400/20 text-red-300 hover:bg-red-400/10 hover:text-red-200"
        disabled={pending || confirming}
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${code}`}
      >
        <Trash2 aria-hidden="true" /> Delete
      </Button>
      {confirming ? (
        <div className="col-span-3 flex flex-wrap items-center gap-2 rounded-xl border border-red-400/25 bg-red-400/10 p-3">
          <span className="min-w-0 flex-1 text-sm text-red-200">Delete {code}? This cannot be undone.</span>
          <Button variant="danger" size="sm" disabled={pending} onClick={() => run(() => deleteCouponAction(code))}>
            <Trash2 aria-hidden="true" /> Yes, delete
          </Button>
          <Button variant="secondary" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
            Keep
          </Button>
        </div>
      ) : null}
      {error ? (
        <div className="col-span-3">
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}
    </div>
  );
}
