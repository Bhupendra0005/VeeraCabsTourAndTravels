"use client";

import {
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  Layers,
  Loader2,
  MapPin,
  MessageCircle,
  Palette,
  Phone,
  RotateCcw,
  RotateCw,
  Ticket,
  TriangleAlert,
  Car,
  Info,
  CreditCard,
  Pipette,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { ImageChooser, StringsEditor } from "@/components/admin/document-editor";
import { SelectMenu } from "@/components/admin/pickers";
import type { ActionState } from "@/lib/admin/action-state";
import { DOCUMENT_LAYOUT_KEY, HEX_COLOR, THEME_OPTIONS, type DocumentLayout } from "@/lib/booking/document-layout";
import { resetDocAction, saveDocAction } from "@/lib/server/admin/actions/content";
import { cn } from "@/lib/utils/cn";

type Kind = "invoice" | "ticket";
type TabId = "look" | "invoice" | "ticket";

/** Three tabs, by what they change: both documents, the invoice only, the e-ticket only. */
const TABS: { id: TabId; label: string; icon: LucideIcon; title: string; text: string; applies: string; preview?: Kind }[] = [
  { id: "look", label: "Both documents", icon: Palette, title: "Look, header and footer", text: "Colours, logo, the header details and the footer. Whatever you set here appears on the invoice and on the e-ticket.", applies: "Invoice and e-ticket" },
  { id: "invoice", label: "Invoice only", icon: FileText, title: "Invoice", text: "The title, badge, payments list and terms that appear only on the invoice.", applies: "Invoice only", preview: "invoice" },
  { id: "ticket", label: "E-ticket only", icon: Ticket, title: "E-ticket", text: "The title and the \"Good to know\" points that appear only on the e-ticket.", applies: "E-ticket only", preview: "ticket" },
];

/** A small heading that splits a long tab into clear parts. */
function SubHeading({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text?: string }) {
  return (
    <div className="flex items-start gap-3 border-t border-white/10 pt-6 first:border-t-0 first:pt-0">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/5 text-brand-bright ring-1 ring-white/10 [&>svg]:size-4">
        <Icon aria-hidden="true" />
      </span>
      <div>
        <h3 className="font-(family-name:--font-display) text-base font-bold">{title}</h3>
        {text ? <div className="text-[13px] text-muted">{text}</div> : null}
      </div>
    </div>
  );
}

const themeOptions = THEME_OPTIONS.map((o) => ({ value: o.value, label: o.label, swatch: o.hex || "conic-gradient(#e8660c,#12945a,#1473e0,#7242d6,#e8660c)" }));

/* ------------------------------- small controls ------------------------------ */

const inputCls =
  "h-12 w-full rounded-xl border border-white/12 bg-black/30 px-3.5 text-sm text-(--text) outline-none transition placeholder:text-white/35 hover:border-white/20 focus:border-brand focus:ring-4 focus:ring-brand/15";

function Label({ htmlFor, children, hint }: { htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <div className="mb-2">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold">
        {children}
      </label>
      {hint ? <div className="mt-0.5 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

function TextInput({ id, label, value, onChange, max, placeholder, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; max: number; placeholder?: string; hint?: string }) {
  return (
    <div>
      <Label htmlFor={id} hint={hint}>
        {label}
      </Label>
      <input id={id} value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </div>
  );
}

function CheckRow({ checked, onChange, icon: Icon, title, hint }: { checked: boolean; onChange: (v: boolean) => void; icon: LucideIcon; title: string; hint?: string }) {
  return (
    <label className="group flex cursor-pointer items-center gap-4 rounded-xl px-1 py-2.5 transition hover:bg-white/3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="grid size-6 shrink-0 place-items-center rounded-md border border-white/25 bg-black/30 text-transparent transition peer-checked:border-transparent peer-checked:bg-brand peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-brand/30"
      >
        <Check className="size-4" strokeWidth={3} />
      </span>
      <Icon className="size-5 shrink-0 text-white/55" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

/* --------------------------------- designer --------------------------------- */

export function DocumentDesigner({ initial, customised }: { initial: DocumentLayout; customised: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<DocumentLayout>(initial);
  const [baseline, setBaseline] = useState<DocumentLayout>(initial);
  const [tab, setTab] = useState<TabId>("look");
  const [kind, setKind] = useState<Kind>("invoice");
  const [result, setResult] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  const [confirmReset, setConfirmReset] = useState(false);

  const [src, setSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(baseline), [draft, baseline]);
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  const patch = <S extends keyof DocumentLayout, K extends keyof DocumentLayout[S]>(section: S, key: K, value: DocumentLayout[S][K]) => {
    setResult(null);
    setDraft((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));
  };

  const openTab = (id: TabId) => {
    setTab(id);
    const preview = TABS.find((t) => t.id === id)?.preview;
    if (preview) setKind(preview);
  };

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // rebuild the preview shortly after the last change
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const response = await fetch("/api/admin/documents/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: kind, layout: draft }),
          signal: controller.signal,
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Could not build the preview.");
        }
        const url = URL.createObjectURL(await response.blob());
        setError("");
        setSrc((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return url;
        });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 650);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [draft, kind]);

  useEffect(
    () => () => {
      setSrc((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      });
    },
    [],
  );

  const save = () =>
    start(async () => {
      const outcome = await saveDocAction(DOCUMENT_LAYOUT_KEY, draft);
      setResult(outcome);
      if (outcome.ok) setBaseline(draft);
    });

  const discard = () => {
    setDraft(baseline);
    setResult(null);
  };

  const restore = () =>
    start(async () => {
      const outcome = await resetDocAction(DOCUMENT_LAYOUT_KEY);
      setConfirmReset(false);
      setResult(outcome);
      if (outcome.ok) router.refresh();
    });

  const look = draft.look;
  const customOk = HEX_COLOR.test(look.customColor);

  return (
    <div className="grid gap-6 pb-28">
      {/* Section tabs */}
      <div role="tablist" aria-label="Design sections" className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:grid lg:grid-cols-3">
        {TABS.map(({ id, label, icon: Icon }) => {
          const on = id === tab;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => openTab(id)}
              className={cn(
                "inline-flex h-12 shrink-0 items-center justify-center gap-2.5 rounded-xl border px-5 text-sm font-bold transition [&>svg]:size-5",
                on
                  ? "border-transparent bg-linear-to-r from-brand to-brand-bright text-white shadow-[0_10px_28px_-10px_rgba(0,150,219,0.85)]"
                  : "border-white/10 bg-white/4 text-white/80 hover:border-white/25 hover:text-white",
              )}
            >
              <Icon aria-hidden="true" /> {label}
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
        <div className="grid gap-5">
          {/* Active section */}
          <section role="tabpanel" aria-label={active.title} className="rounded-2xl border border-brand-bright/25 bg-linear-to-b from-[#0c1a24] to-panel p-5 shadow-[0_0_44px_-20px_rgba(0,150,219,0.5)] sm:p-6">
            <div className="mb-6 flex items-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-brand/25 to-brand/5 text-brand-bright ring-1 ring-brand-bright/25">
                <active.icon className="size-6" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="font-(family-name:--font-display) text-xl font-bold">{active.title}</h2>
                  <span className="rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-bold text-brand-bright ring-1 ring-brand-bright/25">Appears on: {active.applies}</span>
                </div>
                <div className="text-sm text-muted">{active.text}</div>
              </div>
            </div>

            {tab === "look" ? (
              <div className="grid gap-6">
                <SubHeading icon={Palette} title="Colours and logo" text="The accent colour and the logo at the top of the page." />
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="dd-theme">Colour theme</Label>
                    <SelectMenu id="dd-theme" size="lg" value={look.theme} options={themeOptions} onChange={(v) => patch("look", "theme", v)} />
                  </div>
                  <div>
                    <Label htmlFor="dd-custom" hint={look.theme !== "custom" ? "Picking a colour here switches the theme to Custom." : undefined}>
                      Custom colour
                    </Label>
                    <div className={cn("flex h-12 items-center gap-3 rounded-xl border bg-black/30 px-3 transition focus-within:ring-4 focus-within:ring-brand/15", customOk ? "border-white/12 focus-within:border-brand" : "border-red-400/50")}>
                      <label className="relative size-7 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 ring-white/25" title="Pick a colour">
                        <span className="absolute inset-0" style={{ background: customOk ? look.customColor : "#444" }} />
                        <input
                          type="color"
                          aria-label="Pick a custom colour"
                          value={customOk ? look.customColor : "#1473e0"}
                          onChange={(e) => {
                            patch("look", "customColor", e.target.value);
                            patch("look", "theme", "custom");
                          }}
                          className="absolute inset-0 cursor-pointer opacity-0"
                        />
                      </label>
                      <input
                        id="dd-custom"
                        value={look.customColor}
                        maxLength={7}
                        spellCheck={false}
                        onChange={(e) => {
                          patch("look", "customColor", e.target.value);
                          if (HEX_COLOR.test(e.target.value)) patch("look", "theme", "custom");
                        }}
                        className="min-w-0 flex-1 bg-transparent text-sm font-semibold uppercase outline-none"
                        placeholder="#1473E0"
                      />
                      <Pipette className="size-4 shrink-0 text-white/45" aria-hidden="true" />
                    </div>
                    {!customOk ? <div className="mt-1.5 text-xs text-red-300">Use the format #RRGGBB, for example #1473e0.</div> : null}
                  </div>
                </div>

                <ImageChooser
                  label="Logo (optional)"
                  hint="Leave empty to use the built-in logo. A PNG with a transparent background looks best."
                  value={look.logoImage}
                  fit="contain"
                  fallback="/logoNavbar.png"
                  onChange={(url) => patch("look", "logoImage", url)}
                />

                <SubHeading icon={MapPin} title="Header details" text="What is printed next to the logo at the top." />
                <div className="grid divide-y divide-white/8">
                  <CheckRow checked={look.showVehiclePhoto} onChange={(v) => patch("look", "showVehiclePhoto", v)} icon={Car} title="Show the booked vehicle's photo on the e-ticket" />
                  <CheckRow checked={look.showContact} onChange={(v) => patch("look", "showContact", v)} icon={MapPin} title="Show address, phone and email in the header" />
                  <CheckRow checked={look.showGstin} onChange={(v) => patch("look", "showGstin", v)} icon={FileText} title="Print the GSTIN under the logo" hint="Set the GSTIN under Website > Contact & business." />
                </div>

                <SubHeading icon={Layers} title="Footer" text="The thank-you line and support details at the bottom of the page." />
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextInput id="dd-f-thanks" label="Thank-you line" value={draft.footer.thanks} max={40} hint="Your business name is added on the next line." onChange={(v) => patch("footer", "thanks", v)} />
                  <TextInput id="dd-f-support" label="Support label" value={draft.footer.supportLabel} max={30} onChange={(v) => patch("footer", "supportLabel", v)} />
                </div>
                <TextInput id="dd-f-note" label="Small print" value={draft.footer.note} max={120} onChange={(v) => patch("footer", "note", v)} />
                <div className="grid">
                  <CheckRow checked={draft.footer.showSupport} onChange={(v) => patch("footer", "showSupport", v)} icon={Phone} title="Show the support phone numbers" />
                </div>
              </div>
            ) : null}

            {tab === "invoice" ? (
              <div className="grid gap-6">
                <SubHeading icon={FileText} title="Title and badge" />
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextInput id="dd-i-title" label="Title" value={draft.invoice.title} max={24} placeholder="TAX INVOICE" onChange={(v) => patch("invoice", "title", v)} />
                  <TextInput id="dd-i-sub" label="Sub-title" value={draft.invoice.subtitle} max={60} onChange={(v) => patch("invoice", "subtitle", v)} />
                </div>
                <div className="grid divide-y divide-white/8">
                  <CheckRow checked={draft.invoice.showStatus} onChange={(v) => patch("invoice", "showStatus", v)} icon={CheckCircle2} title="Show the Paid / Unpaid badge" />
                  <CheckRow checked={draft.invoice.showPayments} onChange={(v) => patch("invoice", "showPayments", v)} icon={CreditCard} title="List the payments received" />
                </div>

                <SubHeading icon={MessageCircle} title="Terms or bank details" text="An optional note printed at the bottom of the invoice." />
                <div>
                  <Label
                    htmlFor="dd-terms"
                    hint="Payment terms, bank account for transfers or a GST note. Keep it short: about 2 lines fit when payments are listed, more if you hide the payments list."
                  >
                    Text on the invoice
                  </Label>
                  <textarea
                    id="dd-terms"
                    value={draft.invoice.terms}
                    maxLength={500}
                    rows={5}
                    onChange={(e) => patch("invoice", "terms", e.target.value)}
                    className={cn(inputCls, "h-auto resize-y py-3 leading-relaxed")}
                  />
                </div>
              </div>
            ) : null}

            {tab === "ticket" ? (
              <div className="grid gap-6">
                <SubHeading icon={Ticket} title="Title" />
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextInput id="dd-t-title" label="Title" value={draft.ticket.title} max={24} placeholder="E-TICKET" onChange={(v) => patch("ticket", "title", v)} />
                  <TextInput id="dd-t-sub" label="Sub-title (confirmed bookings)" value={draft.ticket.subtitle} max={60} onChange={(v) => patch("ticket", "subtitle", v)} />
                </div>

                <SubHeading icon={Info} title={'"Good to know" box'} text="Short reminders for the traveller, shown on the e-ticket." />
                <div className="grid">
                  <CheckRow checked={draft.ticket.showNotes} onChange={(v) => patch("ticket", "showNotes", v)} icon={Info} title={'Show the "Good to know" box'} />
                </div>
                <StringsEditor
                  label="Points in the box"
                  hint="Up to 4 short points. Use {freeCancel} and {balanceCutoff} to insert the times from Booking settings."
                  items={draft.ticket.notes}
                  max={150}
                  maxItems={4}
                  multiline
                  onChange={(items) => patch("ticket", "notes", items)}
                />
              </div>
            ) : null}
          </section>

        </div>

        {/* Live preview */}
        <aside aria-label="Live preview" className="rounded-2xl border border-brand-bright/25 bg-linear-to-b from-[#0b1620] to-panel p-4 shadow-[0_0_44px_-20px_rgba(0,150,219,0.5)] sm:p-5 xl:sticky xl:top-6">
          <div className="mb-4 grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2.5 font-(family-name:--font-display) text-lg font-bold">
                <span className="size-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" aria-hidden="true" />
                Live Preview
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/25">
                <FileText className="size-3.5" aria-hidden="true" /> PDF Preview
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div role="tablist" aria-label="Document" className="inline-grid flex-1 grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/25 p-1 sm:max-w-xs">
                {([["invoice", "Invoice", FileText], ["ticket", "E-ticket", Ticket]] as const).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={kind === id}
                    onClick={() => setKind(id)}
                    className={cn(
                      "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition [&>svg]:size-4",
                      kind === id ? "border border-brand-bright/40 bg-brand/20 text-white" : "text-white/70 hover:text-white",
                    )}
                  >
                    <Icon aria-hidden="true" /> {label}
                  </button>
                ))}
              </div>
              {src ? (
                <a href={src} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold transition hover:bg-white/10">
                  <ExternalLink className="size-4" aria-hidden="true" /> Open full size
                </a>
              ) : null}
            </div>
          </div>

          <div className="relative aspect-595/842 w-full overflow-hidden rounded-xl border border-white/10 bg-white">
            {src ? (
              <iframe title={`${kind === "invoice" ? "Invoice" : "E-ticket"} preview`} src={`${src}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`} className="absolute inset-0 size-full border-0" />
            ) : null}
            {busy ? (
              <div className="absolute inset-0 grid place-items-center bg-[#07101a]/70 backdrop-blur-[2px]">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-sm font-semibold text-white">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Updating preview...
                </span>
              </div>
            ) : null}
          </div>

          {error ? (
            <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-200">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> <span className="wrap-anywhere">{error}</span>
            </div>
          ) : (
            <div className="mt-5 px-1 pb-1 text-xs leading-relaxed text-muted">Sample booking details, with your changes shown before you save. Real invoices and tickets use this design once saved.</div>
          )}
        </aside>
      </div>

      {/* Action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0a0d0e]/95 px-4 py-3 backdrop-blur-xl lg:left-66">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 sm:gap-3 sm:px-2">
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-brand to-brand-bright px-7 text-sm font-bold text-white shadow-[0_10px_28px_-10px_rgba(0,150,219,0.85)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none max-sm:h-11 max-sm:flex-1 max-sm:px-3"
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
            {pending ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={discard}
            disabled={pending || !dirty}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 text-sm font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 max-sm:h-11 max-sm:flex-1 max-sm:px-3"
          >
            <RotateCw className="size-4" aria-hidden="true" /> Discard
          </button>
          {customised && !confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              disabled={pending}
              aria-label="Restore original"
              title="Restore original"
              className="inline-flex h-12 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-muted transition hover:bg-white/5 hover:text-white max-sm:h-11 max-sm:px-3"
            >
              <RotateCcw className="size-4" aria-hidden="true" /> <span className="max-sm:sr-only">Restore original</span>
            </button>
          ) : null}
          {confirmReset ? (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              Replace your design with the original?
              <button type="button" onClick={restore} disabled={pending} className="rounded-lg bg-red-600 px-3 py-1.5 text-[13px] font-semibold hover:bg-red-500">
                Yes, restore
              </button>
              <button type="button" onClick={() => setConfirmReset(false)} className="rounded-lg border border-white/15 px-3 py-1.5 text-[13px] font-semibold hover:bg-white/10">
                Cancel
              </button>
            </span>
          ) : null}

          <p className="ml-auto flex items-center gap-2 text-sm max-sm:order-last max-sm:m-0 max-sm:basis-full max-sm:text-xs" aria-live="polite">
            {result?.error ? (
              <span className="flex items-start gap-2 text-red-300">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> <span className="wrap-anywhere">{result.error}</span>
              </span>
            ) : dirty ? (
              <span className="text-amber-300">You have unsaved changes.</span>
            ) : (
              <span className="flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="size-5" aria-hidden="true" /> {result?.ok ? "Saved. New invoices and tickets use this design." : "All changes are saved"}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
