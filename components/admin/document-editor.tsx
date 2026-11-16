"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Award,
  Building2,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  ImagePlus,
  ListFilter,
  Link2,
  Loader2,
  Mail,
  MapPin,
  Megaphone,
  Milestone,
  Pencil,
  Phone,
  Plane,
  Plus,
  Power,
  Receipt,
  Repeat2,
  RotateCcw,
  RotateCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tag,
  TicketPercent,
  Trash2,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { MediaLibrary } from "@/components/admin/media-library";
import { SelectMenu } from "@/components/admin/pickers";
import { Toggle } from "@/components/admin/toggle";
import { Alert, Button, Field as FormField, inputClass } from "@/components/admin/ui";
import type { ActionState } from "@/lib/admin/action-state";
import { ikUrl } from "@/lib/cms/images";
import { resolveIcon } from "@/lib/cms/icons";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import type { Field, ListField } from "@/lib/cms/types";
import { cn } from "@/lib/utils/cn";

type Value = Record<string, unknown>;
type Path = (string | number)[];

/* ----------------------------- value helpers ----------------------------- */

function blankFor(fields: Field[]): Value {
  const out: Value = {};
  for (const f of fields) {
    switch (f.type) {
      case "toggle":
        out[f.key] = f.defaultValue === true;
        break;
      case "number":
        out[f.key] = typeof f.defaultValue === "number" ? f.defaultValue : f.min;
        break;
      case "select":
        out[f.key] = typeof f.defaultValue === "string" ? f.defaultValue : (f.options[0]?.value ?? "");
        break;
      case "strings":
      case "list":
        out[f.key] = [];
        break;
      case "group":
        out[f.key] = blankFor(f.fields);
        break;
      default:
        out[f.key] = typeof f.defaultValue === "string" ? f.defaultValue : "";
    }
  }
  return out;
}

function setIn<T>(root: T, path: Path, value: unknown): T {
  if (path.length === 0) return value as T;
  const [head, ...rest] = path;
  if (Array.isArray(root)) {
    const copy = root.slice();
    copy[head as number] = setIn(copy[head as number], rest, value);
    return copy as T;
  }
  const obj = (root ?? {}) as Record<string, unknown>;
  return { ...obj, [head]: setIn(obj[head as string], rest, value) } as T;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** A small icon for an on/off setting, picked from its key so every switch looks like what it controls. */
const TOGGLE_ICONS: [RegExp, LucideIcon][] = [
  [/airport/i, Plane],
  [/hourly/i, Clock],
  [/round/i, Repeat2],
  [/return/i, CalendarPlus],
  [/stop/i, Milestone],
  [/address/i, MapPin],
  [/filter/i, ListFilter],
  [/sort/i, ArrowUpDown],
  [/coupon/i, TicketPercent],
  [/review/i, Star],
  [/gst/i, Receipt],
  [/best/i, Award],
  [/hero|banner/i, ImagePlus],
  [/^active$/i, Power],
];
/* Lucide has no brand icons, so these two are drawn here and follow the text colour. */
function FacebookGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.5 22v-8.2h2.8l.5-3.4h-3.3V8.3c0-1 .4-1.7 1.8-1.7H17V3.5c-.3 0-1.3-.2-2.5-.2-2.6 0-4.3 1.6-4.3 4.4v2.7H7.4v3.4h2.8V22h3.3z" />
    </svg>
  );
}
function InstagramGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Icon inside the box of a well-known contact field, picked from its key. */
const TEXT_ICONS: Record<string, LucideIcon | typeof WhatsAppIcon> = {
  name: Building2,
  shortName: Tag,
  tagline: Sparkles,
  hours: Clock,
  gstin: Receipt,
  email: Mail,
  whatsapp: WhatsAppIcon,
  "primaryPhone.display": Phone,
  "primaryPhone.raw": Phone,
  "secondaryPhone.display": Phone,
  "secondaryPhone.raw": Phone,
  "address.line1": MapPin,
  "address.line2": MapPin,
  mapQuery: Search,
  facebook: FacebookGlyph,
  instagram: InstagramGlyph,
};
/** Brand colour of the icon inside the Facebook and Instagram boxes. */
const BRAND_TINTS: Record<string, string> = { facebook: "text-[#5b9dff]", instagram: "text-[#f472b6]" };

/** Icon in the heading of a top-level group card, picked from the group's key. */
const GROUP_ICONS: Record<string, LucideIcon> = {
  announcement: Megaphone,
  hero: ImagePlus,
  primaryPhone: Phone,
  secondaryPhone: Phone,
  address: MapPin,
};
const toggleIcon = (key: string): LucideIcon => TOGGLE_ICONS.find(([pattern]) => pattern.test(key))?.[1] ?? SlidersHorizontal;

/* ------------------------------- the editor ------------------------------- */

type EditorProps = {
  docKey: string;
  fields: Field[];
  initial: Value;
  customised: boolean;
  save: (key: string, value: unknown) => Promise<ActionState>;
  reset?: (key: string) => Promise<ActionState>;
  /** Called with the current (possibly unsaved) value whenever it changes, e.g. to drive a live preview. */
  onValueChange?: (value: Value) => void;
  /** Where the "reload" link goes after a reset. Defaults to the content page for this key. */
  reloadHref?: string;
};

export function DocumentEditor({ docKey, fields, initial, customised, save, reset, onValueChange, reloadHref }: EditorProps) {
  const [value, setValue] = useState<Value>(initial);
  const [baseline, setBaseline] = useState<Value>(initial);
  const [result, setResult] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [generation, setGeneration] = useState(0);
  const dirty = useMemo(() => !same(value, baseline), [value, baseline]);
  // consecutive short fields (text, number, dropdown) are grouped so they can share one card
  const blocks = useMemo(() => {
    const out: (Field | Field[])[] = [];
    for (const field of fields) {
      const short = field.type === "number" || field.type === "select" || (field.type === "text" && (field.max ?? 200) <= 80) || field.key === "facebook" || field.key === "instagram";
      const last = out[out.length - 1];
      if (short && Array.isArray(last)) last.push(field);
      else out.push(short ? [field] : field);
    }
    return out;
  }, [fields]);

  useEffect(() => {
    onValueChange?.(value);
  }, [value, onValueChange]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    // links inside the app (tabs, sidebar) do not trigger beforeunload, so ask before following them
    const guard = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.origin !== window.location.origin || event.defaultPrevented) return;
      if (link.pathname === window.location.pathname && link.search === window.location.search) return;
      if (!window.confirm("You have unsaved changes. Leave this page without saving?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guard, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guard, true);
    };
  }, [dirty]);

  const onChange = useCallback((path: Path, next: unknown) => {
    setResult(null);
    setValue((current) => setIn(current, path, next));
  }, []);

  const onSave = () =>
    start(async () => {
      const outcome = await save(docKey, value);
      setResult(outcome);
      if (outcome.ok) setBaseline(value);
    });

  const onDiscard = () => {
    setValue(baseline);
    setResult(null);
    setGeneration((g) => g + 1);
  };

  const onReset = () =>
    start(async () => {
      if (!reset) return;
      const outcome = await reset(docKey);
      setResult(outcome);
      setConfirmReset(false);
      if (outcome.ok) setResetting(true);
    });

  if (resetting) {
    return (
      <Alert tone="success">
        Original content restored. <a className="underline" href={reloadHref ?? `/admin/content/${docKey}`}>Reload this page</a> to see it.
      </Alert>
    );
  }

  return (
    <div className="grid gap-5 pb-24">
      {/* switches and short fields sit two to a row on wide screens; long text, lists, images and groups take the full row */}
      <div key={generation} className="grid items-start gap-5 lg:grid-cols-2">
        {blocks.map((block) => {
          // two or more short fields in a row are drawn together in one card
          if (Array.isArray(block) && block.length > 1) {
            return (
              <div key={block[0].key} className="grid gap-5 rounded-2xl border border-white/10 bg-white/3 p-5 sm:grid-cols-2 sm:p-6 lg:col-span-2">
                {block.map((field) => (
                  <div key={field.key} className="min-w-0">
                    <FieldView field={field} value={value[field.key]} path={[field.key]} onChange={onChange} />
                  </div>
                ))}
              </div>
            );
          }
          const field = Array.isArray(block) ? block[0] : block;
          return (
            <div key={field.key} className={cn("min-w-0", field.type !== "toggle" && "lg:col-span-2")}>
              <FieldView field={field} value={value[field.key]} path={[field.key]} onChange={onChange} />
            </div>
          );
        })}
        {docKey === "site_info" && fields.some((f) => f.key === "mapQuery") ? (
          <div className="min-w-0 lg:col-span-2">
            <MapPreview value={value} onChange={onChange} />
          </div>
        ) : null}
        {docKey === "seo" && fields.some((f) => f.key === "title") ? (
          <div className="min-w-0 lg:col-span-2">
            <SeoPreview value={value} />
          </div>
        ) : null}
        {docKey === "site_info" && fields.some((f) => f.key === "shortName") ? (
          <div className="min-w-0 lg:col-span-2">
            <BusinessPreview value={value} />
          </div>
        ) : null}
        {docKey === "site_info" && fields.some((f) => f.key === "primaryPhone") ? (
          <div className="min-w-0 lg:col-span-2">
            <ContactPreview value={value} onChange={onChange} />
          </div>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0a0d0e]/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:left-66">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 sm:gap-3 sm:px-2">
          <Button disabled={pending || !dirty} onClick={onSave} className="h-11 rounded-xl bg-linear-to-r from-brand to-brand-bright px-6 shadow-[0_10px_28px_-10px_rgba(0,150,219,0.85)] hover:brightness-110 disabled:shadow-none max-sm:flex-1 max-sm:px-3">
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
            {pending ? "Saving..." : "Save changes"}
          </Button>
          <Button variant="secondary" disabled={pending || !dirty} onClick={onDiscard} className="h-11 rounded-xl px-5 max-sm:flex-1 max-sm:px-3">
            <RotateCw aria-hidden="true" /> Discard
          </Button>
          {reset && customised && !confirmReset ? (
            <Button variant="ghost" disabled={pending} onClick={() => setConfirmReset(true)} aria-label="Restore original" title="Restore original" className="h-11 rounded-xl max-sm:px-3">
              <RotateCcw aria-hidden="true" /> <span className="max-sm:sr-only">Restore original</span>
            </Button>
          ) : null}
          {confirmReset ? (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              Replace your edits with the original content?
              <Button size="sm" variant="danger" disabled={pending} onClick={onReset}>
                Yes, restore
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
            </span>
          ) : null}
          <p className="ml-auto flex items-center gap-2 text-sm max-sm:order-last max-sm:m-0 max-sm:basis-full max-sm:text-xs max-sm:empty:hidden" aria-live="polite">
            {result?.error ? (
              <span className="flex items-start gap-2 text-red-300">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> <span className="wrap-anywhere">{result.error}</span>
              </span>
            ) : result?.ok && result.message ? (
              <span className="flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" /> {result.message}
              </span>
            ) : dirty ? (
              <span className="text-amber-300">You have unsaved changes.</span>
            ) : (
              <span className="flex items-center gap-2 text-white/55 max-sm:hidden">
                <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" /> All changes are saved
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- map preview ------------------------------- */

/** Shows the map the way the Contact page will, so a wrong search text or link is seen before saving. */
function MapPreview({ value, onChange }: { value: Value; onChange: (path: Path, next: unknown) => void }) {
  const query = String(value.mapQuery ?? "").trim();
  const embed = String(value.mapEmbedSrc ?? "").trim();
  const address = (value.address ?? {}) as { line1?: unknown; line2?: unknown };
  const fromAddress = [address.line1, address.line2].map((part) => String(part ?? "").trim()).filter(Boolean).join(", ");
  const trusted = /^https:\/\/(www\.google\.com|maps\.google\.com)\/maps/i.test(embed);
  const wanted = trusted ? embed : query ? `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed` : "";

  // wait for a pause in typing so the map is not reloaded on every key
  const [src, setSrc] = useState(wanted);
  useEffect(() => {
    const timer = window.setTimeout(() => setSrc(wanted), 700);
    return () => window.clearTimeout(timer);
  }, [wanted]);

  return (
    <div className="grid gap-4 rounded-2xl border border-brand-bright/20 bg-linear-to-b from-[#0c1a24] to-panel p-5 shadow-[0_0_44px_-24px_rgba(0,150,219,0.5)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-3 font-(family-name:--font-display) text-lg font-bold">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-bright ring-1 ring-brand-bright/20 [&>svg]:size-5">
            <MapPin aria-hidden="true" />
          </span>
          Map preview
        </h3>
        {fromAddress && fromAddress !== query ? (
          <Button size="sm" variant="secondary" onClick={() => onChange(["mapQuery"], fromAddress.slice(0, 200))}>
            <MapPin aria-hidden="true" /> Use my address as the search text
          </Button>
        ) : null}
      </div>

      {src ? (
        <iframe
          title="Map preview"
          src={src}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-64 w-full rounded-xl border border-white/10 bg-black/30 sm:h-80"
        />
      ) : (
        <div className="grid h-40 place-items-center rounded-xl border border-dashed border-white/15 px-4 text-center text-sm text-muted">Type the map search text above (or use the button) to see your shop on the map.</div>
      )}

      <div className="text-sm text-muted">
        {embed && !trusted ? (
          <span className="text-amber-300">The embed link is not a Google Maps link, so it is not shown here. Copy the src link from Google Maps &gt; Share &gt; Embed a map.</span>
        ) : trusted ? (
          "Showing your Google Maps embed link, exactly as visitors will see it."
        ) : query ? (
          "Showing the place Google finds for the search text. Add an embed link for a more exact pin."
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------- seo preview ------------------------------- */

/** Live character count with the length that works best (green = good, amber = too short or likely to be cut off). */
function Counter({ length, ideal }: { length: number; ideal: [number, number] }) {
  const [lo, hi] = ideal;
  const tone = length === 0 ? "text-muted" : length < lo ? "text-amber-300" : length > hi ? "text-amber-300" : "text-emerald-300";
  const note = length === 0 ? "" : length < lo ? " · a little short" : length > hi ? " · may be cut off in Google" : " · good length";
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 text-xs" aria-live="polite">
      <span className={cn("font-semibold", tone)}>
        {length} characters{note}
      </span>
      <span className="text-muted">Best: {lo} to {hi}</span>
    </div>
  );
}

const cut = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** How the site looks in a Google result and in a WhatsApp / social share, so the title and description can be judged before saving. */
function SeoPreview({ value }: { value: Value }) {
  const title = String(value.title ?? "").trim();
  const description = String(value.description ?? "").trim();
  const image = String(value.shareImage ?? "").trim();
  const [host, setHost] = useState("your-website.com");
  useEffect(() => setHost(window.location.host), []);

  return (
    <div className="grid gap-5 rounded-2xl border border-brand-bright/20 bg-linear-to-b from-[#0c1a24] to-panel p-5 shadow-[0_0_44px_-24px_rgba(0,150,219,0.5)] sm:p-6">
      <h3 className="flex items-center gap-3 font-(family-name:--font-display) text-lg font-bold">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-bright ring-1 ring-brand-bright/20 [&>svg]:size-5">
          <Search aria-hidden="true" />
        </span>
        Preview
      </h3>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="grid content-start gap-2">
          <div className="text-[11px] font-bold tracking-[0.16em] text-muted uppercase">On Google</div>
          <div className="rounded-xl bg-white p-4 text-left shadow-sm">
            <div className="flex items-center gap-2 text-xs text-[#4d5156]">
              <span className="grid size-6 place-items-center rounded-full bg-[#f1f3f4] text-[10px] font-bold text-[#5f6368]">{host.charAt(0).toUpperCase()}</span>
              <span className="truncate">{host}</span>
            </div>
            <div className="mt-1.5 text-[19px] leading-snug text-[#1a0dab] wrap-anywhere">{title ? cut(title, 60) : <span className="text-[#9aa0a6]">Your page title</span>}</div>
            <div className="mt-1 text-sm leading-snug text-[#4d5156] wrap-anywhere">{description ? cut(description, 160) : <span className="text-[#9aa0a6]">Your description appears here.</span>}</div>
          </div>
        </div>

        <div className="grid content-start gap-2">
          <div className="text-[11px] font-bold tracking-[0.16em] text-muted uppercase">When shared on WhatsApp</div>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1f2c34] text-left">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ikUrl(image, 600)} alt="" className="aspect-1200/630 w-full bg-black/30 object-cover" />
            ) : (
              <div className="grid aspect-1200/630 w-full place-items-center bg-black/30 px-4 text-center text-xs text-white/40">No share image yet. A picture makes the link stand out.</div>
            )}
            <div className="grid gap-0.5 p-3">
              <div className="truncate text-xs text-white/55">{host}</div>
              <div className="line-clamp-2 text-sm font-semibold wrap-anywhere">{title || "Your page title"}</div>
              <div className="line-clamp-2 text-xs text-white/65 wrap-anywhere">{description || "Your description appears here."}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="text-xs text-muted">Google decides what it shows. This is a close guess: long titles and descriptions are cut off with &quot;…&quot;.</div>
    </div>
  );
}

/* ---------------------------- business preview ---------------------------- */

/** An Indian GSTIN: 2 digits (state), 5 letters, 4 digits, 1 letter (PAN), then entity digit, "Z" and a check character. */
const GSTIN_FORMAT = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;

/** The business name block as it appears on invoices and in the footer, with a check of the GSTIN. */
function BusinessPreview({ value }: { value: Value }) {
  const name = String(value.name ?? "").trim();
  const shortName = String(value.shortName ?? "").trim();
  const tagline = String(value.tagline ?? "").trim();
  const hours = String(value.hours ?? "").trim();
  const gstin = String(value.gstin ?? "").trim();
  const gst = !gstin ? "none" : GSTIN_FORMAT.test(gstin) ? "ok" : "bad";

  return (
    <div className="relative grid gap-4 overflow-hidden rounded-2xl border border-brand-bright/20 bg-linear-to-br from-[#0c1a24] via-panel to-panel p-5 shadow-[0_0_44px_-24px_rgba(0,150,219,0.5)] sm:p-6">
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-brand opacity-[0.12] blur-3xl" />
      <div className="relative text-[11px] font-bold tracking-[0.18em] text-brand-bright uppercase">Preview: invoice and footer</div>
      <div className="relative grid gap-1">
        <div className="font-(family-name:--font-display) text-2xl font-extrabold wrap-anywhere sm:text-3xl">{name || <span className="text-white/25">Business name</span>}</div>
        <div className="text-sm text-muted wrap-anywhere">{tagline || "Your tagline appears here."}</div>
      </div>
      <div className="relative flex flex-wrap gap-2 text-sm">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3.5 py-1.5">
          <Tag className="size-4 text-brand-bright" aria-hidden="true" /> {shortName || "Short name"}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3.5 py-1.5">
          <Clock className="size-4 text-brand-bright" aria-hidden="true" /> {hours || "Opening hours not set"}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5",
            gst === "ok" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : gst === "bad" ? "border-amber-400/40 bg-amber-400/10 text-amber-300" : "border-white/10 bg-black/25 text-white/55",
          )}
        >
          <Receipt className="size-4" aria-hidden="true" />
          {gst === "none" ? "No GSTIN on invoices" : gst === "ok" ? `GSTIN ${gstin}` : `GSTIN ${gstin} (check it)`}
        </span>
      </div>
      {gst === "bad" ? <div className="relative text-xs text-amber-300">A GSTIN has 15 letters and numbers, for example 27ABCDE1234F1Z5. Please check it before saving, as it is printed on every invoice.</div> : null}
    </div>
  );
}

/* ----------------------------- contact preview ----------------------------- */

/** A 10-digit Indian number from whatever was typed ("+91 96968 88585" -> "9696888585"). */
const tenDigits = (text: string) => {
  const d = text.replace(/\D/g, "");
  return d.length > 10 ? d.slice(-10) : d;
};

/** The call, WhatsApp and email buttons as visitors see them, plus one-click fixes when the numbers do not agree. */
function ContactPreview({ value, onChange }: { value: Value; onChange: (path: Path, next: unknown) => void }) {
  const phone = (key: "primaryPhone" | "secondaryPhone") => {
    const group = (value[key] ?? {}) as { display?: unknown; raw?: unknown };
    return { display: String(group.display ?? "").trim(), raw: String(group.raw ?? "").trim() };
  };
  const primary = phone("primaryPhone");
  const secondary = phone("secondaryPhone");
  const whatsapp = String(value.whatsapp ?? "").replace(/\D/g, "");
  const email = String(value.email ?? "").trim();

  // the number behind the call link should be the number shown on the button
  const fixes: { label: string; run: () => void }[] = [];
  for (const [key, label, p] of [["primaryPhone", "primary", primary], ["secondaryPhone", "secondary", secondary]] as const) {
    const shown = tenDigits(p.display);
    if (shown.length === 10 && shown !== p.raw) fixes.push({ label: `Use the ${label} number shown as the call number (${shown})`, run: () => onChange([key, "raw"], shown) });
  }
  if (primary.raw.length === 10 && whatsapp !== `91${primary.raw}`) fixes.push({ label: "Use the primary phone for WhatsApp too", run: () => onChange(["whatsapp"], `91${primary.raw}`) });

  const chip = "inline-flex max-w-full items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold wrap-anywhere";
  return (
    <div className="grid gap-4 rounded-2xl border border-brand-bright/20 bg-linear-to-b from-[#0c1a24] to-panel p-5 shadow-[0_0_44px_-24px_rgba(0,150,219,0.5)] sm:p-6">
      <h3 className="flex items-center gap-3 font-(family-name:--font-display) text-lg font-bold">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-bright ring-1 ring-brand-bright/20 [&>svg]:size-5">
          <Phone aria-hidden="true" />
        </span>
        How visitors reach you
      </h3>
      <div className="flex flex-wrap gap-2.5" aria-label="Preview">
        <span className={cn(chip, "border-brand-bright/30 bg-brand/10 text-brand-bright")}>
          <Phone className="size-4 shrink-0" aria-hidden="true" /> {primary.display || "Primary phone"}
        </span>
        {secondary.display ? (
          <span className={cn(chip, "border-white/12 bg-white/5")}>
            <Phone className="size-4 shrink-0 text-white/60" aria-hidden="true" /> {secondary.display}
          </span>
        ) : null}
        <span className={cn(chip, whatsapp ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-dashed border-white/15 text-white/45")}>
          <WhatsAppIcon className="size-4 shrink-0" aria-hidden="true" /> {whatsapp ? `+${whatsapp}` : "WhatsApp not set"}
        </span>
        <span className={cn(chip, email ? "border-white/12 bg-white/5" : "border-dashed border-white/15 text-white/45")}>
          <Mail className="size-4 shrink-0 text-white/60" aria-hidden="true" /> {email || "Email not set"}
        </span>
      </div>
      {fixes.length ? (
        <div className="grid gap-2 rounded-xl border border-amber-400/25 bg-amber-400/8 p-3.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
            <TriangleAlert className="size-4 shrink-0" aria-hidden="true" /> These numbers do not match
          </div>
          <div className="flex flex-wrap gap-2">
            {fixes.map((fix) => (
              <Button key={fix.label} size="sm" variant="secondary" onClick={fix.run}>
                {fix.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------------- fields --------------------------------- */

type ViewProps = { field: Field; value: unknown; path: Path; onChange: (path: Path, value: unknown) => void };

function FieldView({ field, value, path, onChange }: ViewProps) {
  const id = useId();
  if (field.hidden) return null;

  switch (field.type) {
    case "text":
    case "link": {
      // a small icon inside the box for the well-known contact fields, matched by their full path (so a "line1" in another document is not affected)
      const inList = path.some((part) => typeof part === "number");
      const Adorn = inList ? undefined : (TEXT_ICONS[path.join(".")] ?? (field.type === "link" ? Link2 : undefined));
      const digitsOnly = field.type === "text" && field.digits === true;
      const upper = field.type === "text" && field.upper === true;
      const text = typeof value === "string" ? value : "";
      const isLink = field.type === "link";
      // a link that already works can be tested with one click; one that cannot open gets a gentle warning
      const opens = isLink && /^https?:\/\//i.test(text.trim());
      const badLink = isLink && text.trim() !== "" && !/^(https?:\/\/|tel:|mailto:|\/)/i.test(text.trim());
      const brandTint = BRAND_TINTS[path.join(".")];
      return (
        <FormField label={field.label} htmlFor={id} hint={badLink ? "Start the link with https:// so that it opens correctly." : field.hint}>
          {field.type === "text" && field.ideal ? <Counter length={text.length} ideal={field.ideal} /> : null}
          <div className="relative">
            {Adorn ? (
              <span aria-hidden="true" className={cn("pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 [&>svg]:size-4", brandTint ?? "text-white/45")}>
                <Adorn />
              </span>
            ) : null}
            <input
              id={id}
              value={text}
              onChange={(e) => onChange(path, digitsOnly ? e.target.value.replace(/\D/g, "") : upper ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") : e.target.value)}
              maxLength={field.type === "text" ? (field.max ?? 200) : (field.max ?? 500)}
              placeholder={field.type === "text" ? field.placeholder : "https://..."}
              inputMode={digitsOnly ? "numeric" : field.key === "email" ? "email" : undefined}
              aria-invalid={badLink ? true : undefined}
              className={cn(inputClass, Adorn && "pl-10", opens && "pr-12", badLink && "border-amber-400/60")}
            />
            {opens ? (
              <a
                href={text.trim()}
                target="_blank"
                rel="noopener noreferrer"
                title="Open this link in a new tab"
                aria-label={`Open ${field.label} in a new tab`}
                className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-white/55 transition hover:bg-white/10 hover:text-white"
              >
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </FormField>
      );
    }
    case "textarea":
      return (
        <FormField label={field.label} htmlFor={id} hint={field.hint}>
          {field.ideal ? <Counter length={typeof value === "string" ? value.length : 0} ideal={field.ideal} /> : null}
          <textarea
            id={id}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(path, e.target.value)}
            maxLength={field.max ?? 4000}
            rows={field.rows ?? 4}
            className={cn(inputClass, "resize-y")}
          />
        </FormField>
      );
    case "number": {
      // a label ending in "(₹)" becomes a plain label with a ₹ sign inside the box
      const rupee = /\s*\(₹\)\s*$/.test(field.label);
      return (
        <FormField label={rupee ? field.label.replace(/\s*\(₹\)\s*$/, "") : field.label} htmlFor={id} hint={field.hint}>
          <div className="relative">
            {rupee ? <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm font-semibold text-white/50">₹</span> : null}
            <input
              id={id}
              type="number"
              value={typeof value === "number" ? value : ""}
              min={field.min}
              max={field.max}
              step={field.step ?? 1}
              onChange={(e) => onChange(path, e.target.value === "" ? "" : Number(e.target.value))}
              className={cn(inputClass, rupee && "pl-8")}
            />
          </div>
        </FormField>
      );
    }
    case "toggle": {
      const on = value === true;
      const Icon = toggleIcon(String(path[path.length - 1]));
      return (
        <label
          className={cn(
            "flex cursor-pointer items-center gap-3.5 rounded-xl border p-4 transition",
            on ? "border-brand-bright/35 bg-brand/8 hover:border-brand-bright/55" : "border-white/10 bg-white/3 hover:border-white/20",
          )}
        >
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl transition [&>svg]:size-5", on ? "bg-brand/20 text-brand-bright" : "bg-white/6 text-white/50")}>
            <Icon aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 text-sm">
            <b className="block font-semibold">{field.label}</b>
            {field.hint ? <span className="mt-0.5 block text-[13px] text-muted">{field.hint}</span> : null}
          </span>
          <Toggle checked={on} onChange={(next) => onChange(path, next)} label={field.label} />
        </label>
      );
    }
    case "select":
      return (
        <FormField label={field.label} htmlFor={id} hint={field.hint}>
          <SelectMenu
            id={id}
            value={typeof value === "string" ? value : ""}
            onChange={(next) => onChange(path, next)}
            options={field.options.map((option) => ({ value: option.value, label: option.label }))}
          />
        </FormField>
      );
    case "image":
      return <ImageChooser label={field.label} hint={field.hint} aspect={field.aspect} fit={field.fit} value={typeof value === "string" ? value : ""} onChange={(next) => onChange(path, next)} />;
    case "strings":
      return (
        <StringsEditor
          label={field.label}
          hint={field.hint}
          items={Array.isArray(value) ? (value as string[]) : []}
          max={field.max ?? 400}
          maxItems={field.maxItems ?? 40}
          multiline={field.multiline}
          framed={path.length === 1 ? true : "soft"}
          onChange={(next) => onChange(path, next)}
        />
      );
    case "group": {
      const group = (value ?? {}) as Value;
      const nested = path.length > 1;
      return (
        <div
          role="group"
          aria-label={field.label}
          className={cn(
            "grid gap-5 rounded-2xl p-5 sm:p-6",
            nested ? "border border-white/10 bg-white/3" : "border border-brand-bright/20 bg-linear-to-b from-[#0c1a24] to-panel shadow-[0_0_44px_-24px_rgba(0,150,219,0.5)]",
          )}
        >
          <div>
            <div className="flex items-center gap-3">
              {nested ? (
                <span className="h-6 w-1 rounded-full bg-brand-bright shadow-[0_0_12px_rgba(60,184,242,0.7)]" aria-hidden="true" />
              ) : (
                (() => {
                  const GroupIcon = GROUP_ICONS[field.key] ?? SlidersHorizontal;
                  return (
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-bright ring-1 ring-brand-bright/20 [&>svg]:size-5">
                      <GroupIcon aria-hidden="true" />
                    </span>
                  );
                })()
              )}
              <h3 className="font-(family-name:--font-display) text-lg font-bold">{field.label}</h3>
            </div>
            {field.hint ? <div className="mt-2 text-sm text-muted">{field.hint}</div> : null}
          </div>
          {field.key === "announcement" && !nested ? (
            <div aria-label="Preview" className={cn("flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition", group.enabled === true ? "bg-linear-to-r from-brand to-brand-bright text-white" : "border border-dashed border-white/15 bg-white/3 text-white/45")}>
              <Megaphone className="size-4 shrink-0" aria-hidden="true" />
              <span className="wrap-anywhere">{group.enabled === true ? String(group.text || "Your message appears here") : "The bar is switched off"}</span>
              {group.enabled === true && group.linkLabel ? <span className="underline underline-offset-2">{String(group.linkLabel)}</span> : null}
            </div>
          ) : null}
          <div className="grid gap-5 sm:grid-cols-2 [&>*:is(div[role=group],[data-wide])]:sm:col-span-2">
            {field.fields.map((sub) => (
              <div key={sub.key} data-wide={sub.type === "textarea" || sub.type === "strings" || sub.type === "list" || sub.type === "image" || sub.type === "toggle" ? "" : undefined} className={sub.type === "group" ? "sm:col-span-2" : undefined}>
                <FieldView field={sub} value={group[sub.key]} path={[...path, sub.key]} onChange={onChange} />
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "list":
      return <ListEditor field={field} items={Array.isArray(value) ? (value as Value[]) : []} path={path} onChange={onChange} />;
  }
}

/* ------------------------------ list of strings ------------------------------ */

export function StringsEditor({
  label,
  hint,
  items,
  max,
  maxItems,
  multiline,
  framed,
  onChange,
}: {
  label: string;
  hint?: string;
  items: string[];
  max: number;
  maxItems: number;
  multiline?: boolean;
  /** Draw it as a card with a heading, a count and a top "Add" button: true = the big page card, "soft" = a light box inside an opened list item. */
  framed?: boolean | "soft";
  onChange: (items: string[]) => void;
}) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = items.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };
  const full = items.length >= maxItems;
  const add = () => onChange([...items, ""]);
  const soft = framed === "soft";
  const big = framed === true;

  return (
    <div
      className={cn(
        "grid gap-3",
        big && "rounded-2xl border border-brand-bright/20 bg-linear-to-b from-[#0c1a24] to-panel p-5 shadow-[0_0_44px_-24px_rgba(0,150,219,0.5)] sm:p-6",
        soft && "rounded-xl border border-white/10 bg-white/3 p-4",
      )}
    >
      {soft ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[13px] font-semibold">
            {label} <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-white/70">{items.length}</span>
          </p>
          <Button size="sm" variant="secondary" disabled={full} onClick={add}>
            <Plus aria-hidden="true" /> Add
          </Button>
        </div>
      ) : big ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-3 font-(family-name:--font-display) text-lg font-bold">
            <span className="h-6 w-1 rounded-full bg-brand-bright shadow-[0_0_12px_rgba(60,184,242,0.7)]" aria-hidden="true" />
            {label} <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-white/70">{items.length}</span>
          </h3>
          <Button size="sm" disabled={full} onClick={add}>
            <Plus aria-hidden="true" /> Add
          </Button>
        </div>
      ) : (
        <p className="text-[13px] font-semibold">{label}</p>
      )}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}

      {(big || soft) && items.length === 0 ? <div className="rounded-xl border border-dashed border-white/15 px-4 py-5 text-center text-sm text-muted">Nothing here yet. Use Add to create the first one.</div> : null}

      <ul className={cn("grid gap-2", big && !multiline && "md:grid-cols-2")}>
        {items.map((item, index) => (
          <li key={index} className={cn("flex items-start gap-2", big && "rounded-xl border border-white/10 bg-white/3 p-2 transition focus-within:border-brand-bright/40")}>
            {big || soft ? <span className="mt-2 grid h-6 min-w-6 shrink-0 place-items-center rounded-md bg-brand/15 px-1 text-xs font-bold text-brand-bright">{index + 1}</span> : null}
            {multiline ? (
              <textarea value={item} onChange={(e) => onChange(items.map((v, i) => (i === index ? e.target.value : v)))} maxLength={max} rows={3} aria-label={`${label} ${index + 1}`} className={cn(inputClass, "resize-y")} />
            ) : (
              <input value={item} onChange={(e) => onChange(items.map((v, i) => (i === index ? e.target.value : v)))} maxLength={max} aria-label={`${label} ${index + 1}`} className={inputClass} />
            )}
            <div className="flex shrink-0 gap-1">
              <IconButton label="Move up" onClick={() => move(index, index - 1)} disabled={index === 0}>
                <ArrowUp />
              </IconButton>
              <IconButton label="Move down" onClick={() => move(index, index + 1)} disabled={index === items.length - 1}>
                <ArrowDown />
              </IconButton>
              <IconButton label="Remove" onClick={() => onChange(items.filter((_, i) => i !== index))}>
                <X />
              </IconButton>
            </div>
          </li>
        ))}
      </ul>
      {big || soft ? null : (
        <div>
          <Button variant="secondary" size="sm" disabled={full} onClick={add}>
            <Plus aria-hidden="true" /> Add
          </Button>
        </div>
      )}
    </div>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-9 place-items-center rounded-lg border border-white/15 text-muted transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 [&>svg]:size-4"
    >
      {children}
    </button>
  );
}

/* ------------------------------ list of items ------------------------------ */

/** True inside the item popup: a list nested in an item then opens its rows inline instead of in another popup. */
const InPopup = createContext(false);

type FieldGroup = { title: string; fields: Field[] };

/** "Lonavala & Khandala" -> "lonavala-khandala": lowercase letters, numbers and single dashes. */
const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

/**
 * One list item in a popup, for adding a new item or editing an existing one. It works on a copy (the draft),
 * so Cancel leaves the page untouched; Save puts the item into the list.
 */
function ItemModal({ field, path, groups, title, initial, isNew, onSave, onClose }: { field: ListField; path: Path; groups: FieldGroup[]; title: string; initial: Value; isNew: boolean; onSave: (item: Value) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Value>(initial);
  const [error, setError] = useState("");
  const base = path.length + 1;

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const link = field.slugFrom;
  const photo = field.itemImage && typeof draft[field.itemImage] === "string" ? (draft[field.itemImage] as string) : "";
  const onDraft = useCallback(
    (p: Path, next: unknown) => {
      setError("");
      setDraft((current) => {
        let out = setIn(current, p.slice(base), next);
        // while the page address is empty or still the automatic one, keep it in step with the name
        if (link && p.length === base + 1 && p[base] === link.from) {
          const automatic = slugify(String(current[link.from] ?? ""));
          const now = String(current[link.slug] ?? "");
          // an existing item keeps its address (changing it would change the page URL), unless it has none yet
          if (now === "" || (isNew && now === automatic)) out = { ...out, [link.slug]: slugify(String(next ?? "")) };
        }
        return out;
      });
    },
    [base, link, isNew],
  );

  const save = () => {
    const missing = field.fields.find((f) => f.required && (f.type === "text" || f.type === "textarea" || f.type === "link") && String(draft[f.key] ?? "").trim() === "");
    if (missing) {
      setError(`Please fill in "${missing.label}".`);
      return;
    }
    onSave(draft);
  };

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      className="m-auto flex max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-3xl flex-col overflow-hidden rounded-2xl border border-brand-bright/30 bg-panel p-0 text-(--text) shadow-[0_0_60px_-10px_rgba(0,150,219,0.5)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
        {photo ? (
          // the item's own photo, whole and uncropped, so it is clear which one is being edited
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ikUrl(photo, 240)} alt="" className="h-12 w-auto max-w-24 shrink-0 rounded-lg border border-white/10 bg-white object-contain" />
        ) : (
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-bright ring-1 ring-brand-bright/20">
            <Pencil className="size-5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-(family-name:--font-display) text-lg font-bold wrap-anywhere">{title}</h2>
          <div className="text-sm text-muted">Press Save item, then Save changes on the page.</div>
        </div>
        <button type="button" onClick={() => ref.current?.close()} aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white">
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-6 overflow-y-auto px-5 py-5 pb-24 sm:px-6">
        <InPopup.Provider value={true}>
          {groups.map((group, g) => (
            <div key={g} className="grid gap-3">
              {group.title ? (
                <div className="flex items-center gap-3 text-xs font-bold tracking-wider text-brand-bright uppercase">
                  {group.title}
                  <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
                </div>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                {group.fields.map((sub) => (
                  <div key={sub.key} className={cn("min-w-0", sub.type === "textarea" || sub.type === "strings" || sub.type === "list" || sub.type === "group" || sub.type === "image" ? "sm:col-span-2" : undefined)}>
                    <FieldView field={sub} value={draft[sub.key]} path={[...path, 0, sub.key]} onChange={onDraft} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </InPopup.Provider>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 bg-black/20 px-5 py-4 sm:px-6">
        {error ? (
          <span className="mr-auto flex items-center gap-2 text-sm text-red-300" role="alert">
            <TriangleAlert className="size-4 shrink-0" aria-hidden="true" /> {error}
          </span>
        ) : null}
        <Button variant="secondary" onClick={() => ref.current?.close()}>
          Cancel
        </Button>
        <Button onClick={save}>
          <Check aria-hidden="true" /> Save item
        </Button>
      </div>
    </dialog>
  );
}

function ListEditor({ field, items, path, onChange }: { field: ListField; items: Value[]; path: Path; onChange: ViewProps["onChange"] }) {
  const nested = useContext(InPopup);
  // On the page, an item is added and edited in a popup (no scrolling). Inside a popup, a nested list keeps rows that open inline.
  const [editing, setEditing] = useState<{ index: number | null; draft: Value } | null>(null);
  const [open, setOpen] = useState<Set<number>>(new Set(items.length === 1 ? [0] : []));
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const max = field.maxItems ?? 100;

  // A new (or duplicated) item is added at the bottom, often out of sight: scroll to it, flash it and focus its first box
  const listRef = useRef<HTMLUListElement>(null);
  const wanted = useRef<number | null>(null);
  const [fresh, setFresh] = useState<number | null>(null);
  useEffect(() => {
    const index = wanted.current;
    if (index === null) return;
    wanted.current = null;
    const row = listRef.current?.querySelector<HTMLElement>(`[data-item="${index}"]`);
    if (!row) return;
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    row.querySelector<HTMLElement>("input, textarea")?.focus({ preventScroll: true });
    setFresh(index);
    window.setTimeout(() => setFresh((current) => (current === index ? null : current)), 2200);
  }, [items]);
  const reveal = (index: number) => {
    wanted.current = index;
    setQuery("");
    setOnly("");
  };

  const titleOf = (item: Value) => {
    const value = item[field.itemTitle];
    return typeof value === "string" && value.trim() ? value : "Untitled";
  };

  const subtitleOf = (item: Value) => {
    const value = field.itemSubtitle ? item[field.itemSubtitle] : "";
    return typeof value === "string" ? value.trim() : "";
  };
  /** The small chips (fare, distance, type...) shown in a collapsed row. Zero and empty values are left out. */
  const metaOf = (item: Value) =>
    (field.itemMeta ?? []).flatMap(({ key, prefix = "", suffix = "" }) => {
      const v = item[key];
      if (Array.isArray(v)) return v.length > 0 ? [`${prefix}${v.length}${suffix}`] : [];
      if (typeof v === "number") return v > 0 ? [`${prefix}${v.toLocaleString("en-IN")}${suffix}`] : [];
      if (typeof v !== "string" || !v.trim()) return [];
      // a dropdown shows its readable label ("Hill station"), not the stored value ("hill-station")
      const sub = field.fields.find((f) => f.key === key);
      const label = sub?.type === "select" ? (sub.options.find((o) => o.value === v)?.label ?? v) : v.trim();
      return [`${prefix}${label}${suffix}`];
    });
  /** The item's own page on the website, when the list names one and the item has a usable address (e.g. a slug). */
  const hrefOf = (item: Value) => {
    if (!field.itemHref) return "";
    let ok = true;
    const href = field.itemHref.replace(/\{(\w+)\}/g, (_, key: string) => {
      const part = String(item[key] ?? "").trim();
      if (!/^[a-z0-9][a-z0-9-]*$/i.test(part)) ok = false;
      return part;
    });
    return ok ? href : "";
  };
  /** The fields of an opened item, in titled blocks when the list defines `sections` (anything not named goes last). */
  const groups = (() => {
    if (!field.sections) return [{ title: "", fields: field.fields }];
    const named = new Set(field.sections.flatMap((s) => s.keys));
    return [
      ...field.sections.map((s) => ({ title: s.title, fields: s.keys.map((key) => field.fields.find((f) => f.key === key)).filter((f): f is Field => Boolean(f)) })),
      { title: "", fields: field.fields.filter((f) => !named.has(f.key)) },
    ].filter((g) => g.fields.some((f) => !f.hidden));
  })();
  const imageOf = (item: Value) => {
    const value = field.itemImage ? item[field.itemImage] : "";
    return typeof value === "string" ? value : "";
  };

  const replace = (next: Value[], opened?: number[]) => {
    onChange(path, next);
    if (opened) setOpen(new Set(opened));
  };

  const move = (index: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = items.slice();
    const [moved] = next.splice(index, 1);
    next.splice(to, 0, moved);
    const reopened = new Set<number>();
    open.forEach((i) => reopened.add(i === index ? to : i === to ? index : i));
    onChange(path, next);
    setOpen(reopened);
  };

  const addNew = () => {
    if (nested) {
      reveal(items.length);
      replace([...items, blankFor(field.fields)], [...open, items.length]);
    } else {
      setEditing({ index: null, draft: blankFor(field.fields) });
    }
  };

  const toggle = (index: number) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  /** View page, move up, move down, duplicate and delete: the same buttons on a row and on a card. */
  const actionButtons = (item: Value, index: number) => (
    <>
      {hrefOf(item) ? (
        <a
          href={hrefOf(item)}
          target="_blank"
          rel="noopener noreferrer"
          title="View this page on the website (saved version)"
          aria-label="View this page on the website"
          className="grid size-9 place-items-center rounded-lg border border-white/15 text-muted transition hover:bg-white/10 hover:text-white [&>svg]:size-4"
        >
          <ExternalLink aria-hidden="true" />
        </a>
      ) : null}
      <IconButton label="Move up" onClick={() => move(index, index - 1)} disabled={index === 0}>
        <ArrowUp />
      </IconButton>
      <IconButton label="Move down" onClick={() => move(index, index + 1)} disabled={index === items.length - 1}>
        <ArrowDown />
      </IconButton>
      <IconButton
        label="Duplicate"
        onClick={() => {
          reveal(index + 1);
          replace([...items.slice(0, index + 1), structuredClone(item), ...items.slice(index + 1)], [index + 1]);
        }}
        disabled={items.length >= max}
      >
        <Copy />
      </IconButton>
      <IconButton label="Delete" onClick={() => setConfirmDelete(index)}>
        <Trash2 />
      </IconButton>
    </>
  );
  const cards = field.layout === "cards" && !nested;
  const editItem = (item: Value, index: number) => setEditing({ index, draft: structuredClone(item) });

  const needle = query.trim().toLowerCase();
  // In a long list, a row of buttons filters by the small line under the title (e.g. the vehicle), if it has only a few different values
  const [only, setOnly] = useState("");
  const kinds = useMemo(() => {
    if (items.length <= 6 || !field.itemSubtitle) return [];
    const seen = new Set(items.map((item) => subtitleOf(item)).filter(Boolean));
    return seen.size >= 2 && seen.size <= 8 ? [...seen] : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, field.itemSubtitle]);
  const activeKind = kinds.includes(only) ? only : "";
  const visible = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !activeKind || subtitleOf(item) === activeKind)
    .filter(({ item }) => !needle || `${titleOf(item)} ${subtitleOf(item)}`.toLowerCase().includes(needle));

  return (
    <div className="grid gap-4 rounded-2xl border border-brand-bright/20 bg-linear-to-b from-[#0c1a24] to-panel p-5 shadow-[0_0_44px_-24px_rgba(0,150,219,0.5)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-3 font-(family-name:--font-display) text-lg font-bold">
          <span className="h-6 w-1 rounded-full bg-brand-bright shadow-[0_0_12px_rgba(60,184,242,0.7)]" aria-hidden="true" />
          {field.label} <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-white/70">{items.length}</span>
        </h3>
        <Button size="sm" disabled={items.length >= max} onClick={addNew}>
          <Plus aria-hidden="true" /> {field.addLabel ?? "Add"}
        </Button>
      </div>

      {items.length > 6 ? (
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${field.label.toLowerCase()}...`} aria-label={`Search ${field.label}`} className={inputClass} />
      ) : null}
      {kinds.length ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter the list">
          {["", ...kinds].map((kind) => {
            const on = activeKind === kind;
            const n = kind ? items.filter((item) => subtitleOf(item) === kind).length : items.length;
            return (
              <button
                key={kind || "all"}
                type="button"
                aria-pressed={on}
                onClick={() => setOnly(kind)}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition",
                  on ? "border-transparent bg-brand text-white" : "border-white/10 bg-white/4 text-white/75 hover:border-white/25 hover:text-white",
                )}
              >
                {kind || "All"}
                <span className={cn("rounded-full px-1.5 text-xs font-bold", on ? "bg-white/20" : "bg-white/10 text-white/60")}>{n}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-muted">
          <span>Nothing here yet.</span>
          <Button size="sm" onClick={addNew}>
            <Plus aria-hidden="true" /> {field.addLabel ?? "Add"}
          </Button>
        </div>
      ) : null}

      <ul ref={listRef} className={cn("grid gap-2", cards && "gap-4 sm:grid-cols-2 xl:grid-cols-3")}>
        {visible.map(({ item, index }) => {
          const isOpen = nested && open.has(index);
          if (cards) {
            const photo = imageOf(item);
            return (
              <li
                key={index}
                data-item={index}
                className={cn("scroll-mt-24 flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white/3 transition hover:border-white/25", fresh === index ? "border-brand-bright/70 ring-4 ring-brand/20" : "border-white/10")}
              >
                <button type="button" onClick={() => editItem(item, index)} aria-label={`Edit ${titleOf(item)}`} className="group relative block aspect-16/10 w-full overflow-hidden bg-black/30 text-left">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ikUrl(photo, 480)}
                      alt=""
                      loading="lazy"
                      className={cn("size-full transition duration-300 group-hover:scale-105", field.imageFit === "contain" ? "bg-white object-contain p-2" : "object-cover")}
                    />
                  ) : (
                    <span className="grid size-full place-items-center text-white/30">
                      <ImagePlus className="size-8" aria-hidden="true" />
                    </span>
                  )}
                  <span className="absolute top-2.5 left-2.5 grid h-6 min-w-7 place-items-center rounded-md bg-black/60 px-1.5 text-xs font-bold text-white backdrop-blur">{index + 1}</span>
                  {item.active === false ? <span className="absolute top-2.5 right-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white/80 uppercase backdrop-blur">Off</span> : null}
                </button>
                <div className="grid flex-1 content-start gap-2.5 p-3.5">
                  <button type="button" onClick={() => editItem(item, index)} className="min-w-0 text-left">
                    <span className="block font-(family-name:--font-display) text-base font-bold wrap-anywhere">{titleOf(item)}</span>
                    {subtitleOf(item) ? <span className="mt-0.5 line-clamp-2 block text-xs text-muted wrap-anywhere">{subtitleOf(item)}</span> : null}
                  </button>
                  {metaOf(item).length ? (
                    <span className="flex flex-wrap gap-1.5">
                      {metaOf(item).map((chip, i) => (
                        <span key={i} className={cn("rounded-md px-2 py-0.5 text-xs font-bold ring-1", i === 0 ? "bg-brand/10 text-brand-bright ring-brand-bright/20" : "bg-white/5 text-white/70 ring-white/10")}>
                          {chip}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </div>
                {confirmDelete === index ? (
                  <div className="mx-3.5 mb-3.5 flex flex-wrap items-center gap-2 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm">
                    Delete &quot;{titleOf(item)}&quot;?
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        replace(items.filter((_, i) => i !== index), []);
                        setConfirmDelete(null);
                      }}
                    >
                      Yes, delete
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : null}
                <div className="flex items-center gap-1 border-t border-white/10 p-2.5">
                  <Button size="sm" variant="secondary" className="mr-auto min-h-9" onClick={() => editItem(item, index)}>
                    <Pencil aria-hidden="true" /> Edit
                  </Button>
                  {actionButtons(item, index)}
                </div>
              </li>
            );
          }
          return (
            <li
              key={index}
              data-item={index}
              className={cn("scroll-mt-24 rounded-xl border bg-white/3 transition hover:border-white/20", fresh === index ? "border-brand-bright/70 ring-4 ring-brand/20" : "border-white/10")}
            >
              <div className="flex flex-wrap items-center gap-2 p-2 sm:p-3">
                <button
                  type="button"
                  onClick={() => (nested ? toggle(index) : setEditing({ index, draft: structuredClone(item) }))}
                  aria-expanded={nested ? isOpen : undefined}
                  aria-haspopup={nested ? undefined : "dialog"}
                  title={nested ? undefined : "Edit"}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1.5 text-left hover:bg-white/5 max-sm:basis-full"
                >
                  {nested ? <ChevronDown className={cn("size-4 shrink-0 text-muted transition", isOpen && "rotate-180")} aria-hidden="true" /> : <Pencil className="size-4 shrink-0 text-muted max-sm:hidden" aria-hidden="true" />}
                  <span className="grid h-6 min-w-8 shrink-0 place-items-center rounded-md bg-brand/15 px-1.5 text-xs font-bold text-brand-bright max-sm:hidden">{index + 1}</span>
                  {field.itemInitial && !field.itemImage && !field.itemIcon ? (
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-linear-to-br from-brand/30 to-brand/5 font-(family-name:--font-display) text-lg font-bold text-brand-bright ring-1 ring-brand-bright/20">
                      {titleOf(item).charAt(0).toUpperCase()}
                    </span>
                  ) : null}
                  {field.itemIcon && !field.itemImage ? (
                    (() => {
                      const RowIcon = resolveIcon(typeof item[field.itemIcon] === "string" ? (item[field.itemIcon] as string) : "");
                      return (
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-linear-to-br from-brand/25 to-brand/5 text-brand-bright ring-1 ring-brand-bright/20 [&>svg]:size-5">
                          <RowIcon aria-hidden="true" />
                        </span>
                      );
                    })()
                  ) : null}
                  {field.itemImage ? (
                    imageOf(item) ? (
                      // the photo keeps its own ratio (fixed height, width follows): nothing is cropped and there is no extra frame
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ikUrl(imageOf(item), 240)} alt="" loading="lazy" className="h-12 w-auto max-w-32 shrink-0 rounded-lg border border-white/10 bg-white object-contain" />
                    ) : (
                      <span className="grid h-12 w-18 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/30 text-white/30">
                        <ImagePlus className="size-4" aria-hidden="true" />
                      </span>
                    )
                  ) : null}
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-brand-bright sm:hidden">#{index + 1}</span>
                      <span className="text-sm font-semibold wrap-anywhere">{titleOf(item)}</span>
                      {item.active === false ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white/60 uppercase">Off</span> : null}
                    </span>
                    {subtitleOf(item) ? <span className="line-clamp-2 block text-xs text-muted wrap-anywhere">{subtitleOf(item)}</span> : null}
                    {metaOf(item).length ? (
                      <span className="mt-1.5 flex flex-wrap gap-1.5">
                        {metaOf(item).map((chip, i) => (
                          <span key={i} className={cn("rounded-md px-2 py-0.5 text-xs font-bold ring-1", i === 0 ? "bg-brand/10 text-brand-bright ring-brand-bright/20" : "bg-white/5 text-white/70 ring-white/10")}>
                            {chip}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </span>
                </button>
                <div className="flex shrink-0 gap-1 max-sm:w-full max-sm:justify-end max-sm:border-t max-sm:border-line max-sm:pt-2.5">{actionButtons(item, index)}</div>
              </div>

              {confirmDelete === index ? (
                <div className="mx-3 mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm">
                  Delete &quot;{titleOf(item)}&quot;?
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      replace(items.filter((_, i) => i !== index), []);
                      setConfirmDelete(null);
                    }}
                  >
                    Yes, delete
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(null)}>
                    Cancel
                  </Button>
                </div>
              ) : null}

              {isOpen ? (
                <div className="grid gap-6 border-t border-line p-3 sm:p-4">
                  {groups.map((group, g) => (
                    <div key={g} className="grid gap-3">
                      {group.title ? (
                        <div className="flex items-center gap-3 text-xs font-bold tracking-wider text-brand-bright uppercase">
                          {group.title}
                          <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
                        </div>
                      ) : null}
                      <div className="grid gap-4 sm:grid-cols-2">
                        {group.fields.map((sub) => (
                          <div key={sub.key} className={cn(sub.type === "textarea" || sub.type === "strings" || sub.type === "list" || sub.type === "group" || sub.type === "image" ? "sm:col-span-2" : undefined)}>
                            <FieldView field={sub} value={item[sub.key]} path={[...path, index, sub.key]} onChange={onChange} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {(needle || activeKind) && visible.length === 0 ? <p className="text-sm text-muted">Nothing matches{needle ? <> &quot;{query}&quot;</> : null}{activeKind ? <> in {activeKind}</> : null}.</p> : null}

      {editing ? (
        <ItemModal
          field={field}
          path={path}
          groups={groups}
          title={editing.index === null ? (field.addLabel ?? "Add") : `Edit ${titleOf(items[editing.index] ?? {})}`}
          initial={editing.draft}
          isNew={editing.index === null}
          onClose={() => setEditing(null)}
          onSave={(saved) => {
            const index = editing.index;
            if (index === null) {
              reveal(items.length);
              replace([...items, saved]);
            } else {
              replace(items.map((current, i) => (i === index ? saved : current)));
            }
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------ image chooser ------------------------------ */

export function ImageChooser({
  label,
  hint,
  value,
  onChange,
  fit = "cover",
  aspect,
  fallback,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  /** The picture that is used while no image is chosen (e.g. the built-in logo), shown dimmed with a label instead of "No image". */
  fallback?: string;
  /** "contain" shows the whole image (logos), "cover" fills the box (photos). */
  fit?: "cover" | "contain";
  /** Ratio of the preview box, e.g. "16:9". Photos with another ratio are cropped, as they would be on the website. */
  aspect?: string;
}) {
  const [aw, ah] = aspect ? aspect.split(":").map(Number) : [1, 1];
  const wide = aw > ah;
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (!picking) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPicking(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [picking]);

  return (
    <div className="grid gap-2">
      <p className="text-[13px] font-semibold">{label}</p>
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={cn("grid shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-black/30 text-xs text-muted", aspect ? (wide ? "w-56" : "w-28") : fit === "contain" ? "h-28 w-44 bg-white" : "size-24")}
          style={aspect ? { aspectRatio: `${aw} / ${ah}` } : undefined}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.includes("imagekit.io") ? `${value}${value.includes("?") ? "&" : "?"}tr=w-240,h-240,c-at_max` : value} alt="" className={cn("size-full", fit === "contain" ? "object-contain p-1.5" : "object-cover")} />
          ) : fallback ? (
            <div className="relative size-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fallback} alt="Built-in picture" className={cn("size-full", fit === "contain" ? "object-contain p-2" : "object-cover")} />
              <span className="absolute inset-x-1.5 bottom-1.5 rounded-md bg-black/70 px-2 py-0.5 text-center text-[10px] font-bold tracking-wide text-white uppercase">Built-in, in use</span>
            </div>
          ) : (
            "No image"
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setPicking(true)}>
            <ImagePlus aria-hidden="true" /> {value ? "Change image" : fallback ? "Use my own image" : "Choose image"}
          </Button>
          {value ? (
            <Button variant="ghost" size="sm" onClick={() => onChange("")}>
              <X aria-hidden="true" /> Remove
            </Button>
          ) : null}
        </div>
      </div>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}

      {picking ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Choose an image">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/75" onClick={() => setPicking(false)} />
          <div className="relative flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-[#0b0f10] shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <h2 className="font-(family-name:--font-display) text-lg font-bold">Choose an image</h2>
              <button type="button" onClick={() => setPicking(false)} aria-label="Close" className="rounded-lg p-2 text-muted hover:bg-white/5 hover:text-white">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              <MediaLibrary
                mode="pick"
                onPick={(url) => {
                  onChange(url);
                  setPicking(false);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
