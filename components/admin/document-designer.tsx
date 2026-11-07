"use client";

import {
  Check,
  CheckCircle2,
  Eye,
  ExternalLink,
  FileText,
  Layers,
  Loader2,
  MapPin,
  MessageCircle,
  Palette,
  Phone,
  QrCode,
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
type TabId = "look" | "invoice" | "ticket" | "terms" | "footer";

const TABS: { id: TabId; label: string; icon: LucideIcon; title: string; text: string; preview?: Kind }[] = [
  { id: "look", label: "Design & Branding", icon: Palette, title: "Look & Branding", text: "Colours and logo used on both the invoice and the ticket." },
  { id: "invoice", label: "Invoice Settings", icon: FileText, title: "Invoice Settings", text: "Title, sub-title, badge and payments list on the invoice.", preview: "invoice" },
  { id: "ticket", label: "E-ticket Settings", icon: Ticket, title: "E-ticket Settings", text: "Title, sub-title, QR code and the notes box on the ticket.", preview: "ticket" },
  { id: "terms", label: "Terms & Messages", icon: MessageCircle, title: "Terms & Messages", text: "Terms on the invoice and the \"Good to know\" points on the ticket." },
  { id: "footer", label: "Footer", icon: Layers, title: "Footer", text: "Thank-you line, support details and small print on both documents." },
];

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
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
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
      <div role="tablist" aria-label="Design sections" className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:grid lg:grid-cols-5">
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
                <h2 className="font-(family-name:--font-display) text-xl font-bold">{active.title}</h2>
                <p className="text-sm text-muted">{active.text}</p>
              </div>
            </div>

            {tab === "look" ? (
              <div className="grid gap-6">
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
                    {!customOk ? <p className="mt-1.5 text-xs text-red-300">Use the format #RRGGBB, for example #1473e0.</p> : null}
                  </div>
                </div>

                <ImageChooser
                  label="Logo (optional)"
                  hint="Leave empty to use the built-in logo. A PNG with a transparent background looks best."
                  value={look.logoImage}
                  fit="contain"
                  onChange={(url) => patch("look", "logoImage", url)}
                />

                <div className="grid divide-y divide-white/8 border-t border-white/10 pt-2">
                  <CheckRow checked={look.showVehiclePhoto} onChange={(v) => patch("look", "showVehiclePhoto", v)} icon={Car} title="Show the booked vehicle's photo in the header" />
                  <CheckRow checked={look.showContact} onChange={(v) => patch("look", "showContact", v)} icon={MapPin} title="Show address, phone and email in the header" />
                  <CheckRow checked={look.showGstin} onChange={(v) => patch("look", "showGstin", v)} icon={FileText} title="Print the GSTIN under the logo" hint="Set the GSTIN under Website > Contact & business." />
                </div>
              </div>
            ) : null}

            {tab === "invoice" ? (
              <div className="grid gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextInput id="dd-i-title" label="Title" value={draft.invoice.title} max={24} placeholder="TAX INVOICE" onChange={(v) => patch("invoice", "title", v)} />
                  <TextInput id="dd-i-sub" label="Sub-title" value={draft.invoice.subtitle} max={60} onChange={(v) => patch("invoice", "subtitle", v)} />
                </div>
                <div className="grid divide-y divide-white/8 border-t border-white/10 pt-2">
                  <CheckRow checked={draft.invoice.showStatus} onChange={(v) => patch("invoice", "showStatus", v)} icon={CheckCircle2} title="Show the Paid / Unpaid badge" />
                  <CheckRow checked={draft.invoice.showPayments} onChange={(v) => patch("invoice", "showPayments", v)} icon={CreditCard} title="List the payments received" />
                </div>
              </div>
            ) : null}

            {tab === "ticket" ? (
              <div className="grid gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextInput id="dd-t-title" label="Title" value={draft.ticket.title} max={24} placeholder="E-TICKET" onChange={(v) => patch("ticket", "title", v)} />
                  <TextInput id="dd-t-sub" label="Sub-title (confirmed bookings)" value={draft.ticket.subtitle} max={60} onChange={(v) => patch("ticket", "subtitle", v)} />
                </div>
                <div className="grid divide-y divide-white/8 border-t border-white/10 pt-2">
                  <CheckRow checked={draft.ticket.showQr} onChange={(v) => patch("ticket", "showQr", v)} icon={QrCode} title="Show the QR code" />
                  <CheckRow checked={draft.ticket.showNotes} onChange={(v) => patch("ticket", "showNotes", v)} icon={Info} title={'Show the "Good to know" box'} />
                </div>
              </div>
            ) : null}

            {tab === "terms" ? (
              <div className="grid gap-6">
                <div>
                  <Label
                    htmlFor="dd-terms"
                    hint="Optional. Payment terms, bank account for transfers or a GST note. Keep it short: about 2 lines fit when payments are listed, more if you hide the payments list."
                  >
                    Invoice: terms or bank details
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
                <StringsEditor
                  label={'Ticket: "Good to know" points'}
                  hint="Up to 4 short points. Use {freeCancel} and {balanceCutoff} to insert the times from Booking settings."
                  items={draft.ticket.notes}
                  max={150}
                  maxItems={4}
                  multiline
                  onChange={(items) => patch("ticket", "notes", items)}
                />
              </div>
            ) : null}

            {tab === "footer" ? (
              <div className="grid gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextInput id="dd-f-thanks" label="Thank-you line" value={draft.footer.thanks} max={40} hint="Your business name is added on the next line." onChange={(v) => patch("footer", "thanks", v)} />
                  <TextInput id="dd-f-support" label="Support label" value={draft.footer.supportLabel} max={30} onChange={(v) => patch("footer", "supportLabel", v)} />
                </div>
                <TextInput id="dd-f-note" label="Small print" value={draft.footer.note} max={120} onChange={(v) => patch("footer", "note", v)} />
                <div className="grid border-t border-white/10 pt-2">
                  <CheckRow checked={draft.footer.showSupport} onChange={(v) => patch("footer", "showSupport", v)} icon={Phone} title="Show the support phone numbers" />
                </div>
              </div>
            ) : null}
          </section>

          {/* Quick preview controls */}
          <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-linear-to-b from-[#0b1620] to-panel p-4 sm:p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/5 text-brand-bright ring-1 ring-white/10">
              <Eye className="size-6" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 basis-48">
              <h2 className="font-(family-name:--font-display) text-lg font-bold">Quick Preview Controls</h2>
              <p className="text-[13px] text-muted">Preview how your invoice and e-ticket will look.</p>
            </div>
            <div role="tablist" aria-label="Document" className="inline-grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/25 p-1">
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
              <a href={src} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold transition hover:bg-white/10">
                <ExternalLink className="size-4" aria-hidden="true" /> Open full size
              </a>
            ) : null}
          </section>
        </div>

        {/* Live preview */}
        <aside aria-label="Live preview" className="rounded-2xl border border-brand-bright/25 bg-linear-to-b from-[#0b1620] to-panel p-4 shadow-[0_0_44px_-20px_rgba(0,150,219,0.5)] sm:p-5 xl:sticky xl:top-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2.5 font-(family-name:--font-display) text-lg font-bold">
              <span className="size-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" aria-hidden="true" />
              Live Preview <span className="text-white/50">-</span> {kind === "invoice" ? "Invoice" : "E-ticket"}
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/25">
              <FileText className="size-3.5" aria-hidden="true" /> PDF Preview
            </span>
          </div>

          <div className="relative aspect-[595/842] w-full overflow-hidden rounded-xl border border-white/10 bg-white">
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
            <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-200">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> <span className="wrap-anywhere">{error}</span>
            </p>
          ) : (
            <p className="mt-3 text-xs text-muted">Sample booking details, with your changes shown before you save. Real invoices and tickets use this design once saved.</p>
          )}
        </aside>
      </div>

      {/* Action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0a0d0e]/95 px-4 py-3 backdrop-blur-xl lg:left-[264px]">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 sm:px-2">
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-linear-to-r from-brand to-brand-bright px-7 text-sm font-bold text-white shadow-[0_10px_28px_-10px_rgba(0,150,219,0.85)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
            {pending ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={discard}
            disabled={pending || !dirty}
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 text-sm font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCw className="size-4" aria-hidden="true" /> Discard
          </button>
          {customised && !confirmReset ? (
            <button type="button" onClick={() => setConfirmReset(true)} disabled={pending} className="inline-flex h-12 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-muted transition hover:bg-white/5 hover:text-white">
              <RotateCcw className="size-4" aria-hidden="true" /> Restore original
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

          <p className="ml-auto flex items-center gap-2 text-sm" aria-live="polite">
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
