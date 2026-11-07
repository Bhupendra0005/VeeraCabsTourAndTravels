"use client";

import { ArrowDown, ArrowUp, Check, CheckCircle2, ChevronDown, Copy, ImagePlus, Loader2, Plus, RotateCcw, RotateCw, Trash2, TriangleAlert, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState, useTransition } from "react";
import { MediaLibrary } from "@/components/admin/media-library";
import { SelectMenu } from "@/components/admin/pickers";
import { Toggle } from "@/components/admin/toggle";
import { Alert, Button, Field as FormField, inputClass } from "@/components/admin/ui";
import type { ActionState } from "@/lib/admin/action-state";
import { ikUrl } from "@/lib/cms/images";
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
      <div key={generation} className="grid gap-5">
        {fields.map((field) => (
          <FieldView key={field.key} field={field} value={value[field.key]} path={[field.key]} onChange={onChange} />
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0a0d0e]/95 px-4 py-3 backdrop-blur-xl lg:left-[264px]">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 sm:px-2">
          <Button disabled={pending || !dirty} onClick={onSave} className="h-11 rounded-xl bg-linear-to-r from-brand to-brand-bright px-6 shadow-[0_10px_28px_-10px_rgba(0,150,219,0.85)] hover:brightness-110 disabled:shadow-none">
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
            {pending ? "Saving..." : "Save changes"}
          </Button>
          <Button variant="secondary" disabled={pending || !dirty} onClick={onDiscard} className="h-11 rounded-xl px-5">
            <RotateCw aria-hidden="true" /> Discard
          </Button>
          {reset && customised && !confirmReset ? (
            <Button variant="ghost" disabled={pending} onClick={() => setConfirmReset(true)} className="h-11 rounded-xl">
              <RotateCcw aria-hidden="true" /> Restore original
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
          <p className="ml-auto flex items-center gap-2 text-sm" aria-live="polite">
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
              <span className="flex items-center gap-2 text-white/55">
                <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" /> All changes are saved
              </span>
            )}
          </p>
        </div>
      </div>
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
    case "link":
      return (
        <FormField label={field.label} htmlFor={id} hint={field.hint}>
          <input
            id={id}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(path, e.target.value)}
            maxLength={field.type === "text" ? (field.max ?? 200) : (field.max ?? 500)}
            placeholder={field.type === "text" ? field.placeholder : "https://..."}
            className={inputClass}
          />
        </FormField>
      );
    case "textarea":
      return (
        <FormField label={field.label} htmlFor={id} hint={field.hint}>
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
    case "number":
      return (
        <FormField label={field.label} htmlFor={id} hint={field.hint}>
          <input
            id={id}
            type="number"
            value={typeof value === "number" ? value : ""}
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            onChange={(e) => onChange(path, e.target.value === "" ? "" : Number(e.target.value))}
            className={inputClass}
          />
        </FormField>
      );
    case "toggle":
      return (
        <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-white/10 bg-white/3 p-4 transition hover:border-white/20">
          <Toggle checked={value === true} onChange={(next) => onChange(path, next)} label={field.label} />
          <span className="min-w-0 text-sm">
            <b className="block font-semibold">{field.label}</b>
            {field.hint ? <span className="block text-[13px] text-muted">{field.hint}</span> : null}
          </span>
        </label>
      );
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
      return <ImageChooser label={field.label} hint={field.hint} aspect={field.aspect} value={typeof value === "string" ? value : ""} onChange={(next) => onChange(path, next)} />;
    case "strings":
      return (
        <StringsEditor
          label={field.label}
          hint={field.hint}
          items={Array.isArray(value) ? (value as string[]) : []}
          max={field.max ?? 400}
          maxItems={field.maxItems ?? 40}
          multiline={field.multiline}
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
              <span className="h-6 w-1 rounded-full bg-brand-bright shadow-[0_0_12px_rgba(60,184,242,0.7)]" aria-hidden="true" />
              <h3 className="font-(family-name:--font-display) text-lg font-bold">{field.label}</h3>
            </div>
            {field.hint ? <p className="mt-1.5 pl-4 text-sm text-muted">{field.hint}</p> : null}
          </div>
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
  onChange,
}: {
  label: string;
  hint?: string;
  items: string[];
  max: number;
  maxItems: number;
  multiline?: boolean;
  onChange: (items: string[]) => void;
}) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = items.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div className="grid gap-2">
      <p className="text-[13px] font-semibold">{label}</p>
      {hint ? <p className="-mt-1 text-xs text-muted">{hint}</p> : null}
      <ul className="grid gap-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2">
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
      <div>
        <Button variant="secondary" size="sm" disabled={items.length >= maxItems} onClick={() => onChange([...items, ""])}>
          <Plus aria-hidden="true" /> Add
        </Button>
      </div>
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

function ListEditor({ field, items, path, onChange }: { field: ListField; items: Value[]; path: Path; onChange: ViewProps["onChange"] }) {
  const [open, setOpen] = useState<Set<number>>(new Set(items.length === 1 ? [0] : []));
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const max = field.maxItems ?? 100;

  const titleOf = (item: Value) => {
    const value = item[field.itemTitle];
    return typeof value === "string" && value.trim() ? value : "Untitled";
  };

  const subtitleOf = (item: Value) => {
    const value = field.itemSubtitle ? item[field.itemSubtitle] : "";
    return typeof value === "string" ? value.trim() : "";
  };
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

  const toggle = (index: number) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const needle = query.trim().toLowerCase();
  const visible = items.map((item, index) => ({ item, index })).filter(({ item }) => !needle || titleOf(item).toLowerCase().includes(needle));

  return (
    <div className="grid gap-4 rounded-2xl border border-brand-bright/20 bg-linear-to-b from-[#0c1a24] to-panel p-5 shadow-[0_0_44px_-24px_rgba(0,150,219,0.5)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-3 font-(family-name:--font-display) text-lg font-bold">
          <span className="h-6 w-1 rounded-full bg-brand-bright shadow-[0_0_12px_rgba(60,184,242,0.7)]" aria-hidden="true" />
          {field.label} <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-white/70">{items.length}</span>
        </h3>
        <Button size="sm" disabled={items.length >= max} onClick={() => replace([...items, blankFor(field.fields)], [...open, items.length])}>
          <Plus aria-hidden="true" /> {field.addLabel ?? "Add"}
        </Button>
      </div>

      {items.length > 6 ? (
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${field.label.toLowerCase()}...`} aria-label={`Search ${field.label}`} className={inputClass} />
      ) : null}

      {items.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-muted">Nothing here yet. Use the add button above to create the first one.</p> : null}

      <ul className="grid gap-2">
        {visible.map(({ item, index }) => {
          const isOpen = open.has(index);
          return (
            <li key={index} className="rounded-xl border border-white/10 bg-white/3 transition hover:border-white/20">
              <div className="flex flex-wrap items-center gap-2 p-2 sm:p-3">
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  aria-expanded={isOpen}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1.5 text-left hover:bg-white/5"
                >
                  <ChevronDown className={cn("size-4 shrink-0 text-muted transition", isOpen && "rotate-180")} aria-hidden="true" />
                  <span className="grid h-6 min-w-8 shrink-0 place-items-center rounded-md bg-brand/15 px-1.5 text-xs font-bold text-brand-bright">{index + 1}</span>
                  {field.itemImage ? (
                    <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-black/30 text-white/30">
                      {imageOf(item) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ikUrl(imageOf(item), 120)} alt="" loading="lazy" className="size-full object-cover" />
                      ) : (
                        <ImagePlus className="size-4" aria-hidden="true" />
                      )}
                    </span>
                  ) : null}
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold [overflow-wrap:anywhere]">{titleOf(item)}</span>
                    {subtitleOf(item) ? <span className="block text-xs text-muted [overflow-wrap:anywhere]">{subtitleOf(item)}</span> : null}
                  </span>
                </button>
                <div className="flex shrink-0 gap-1">
                  <IconButton label="Move up" onClick={() => move(index, index - 1)} disabled={index === 0}>
                    <ArrowUp />
                  </IconButton>
                  <IconButton label="Move down" onClick={() => move(index, index + 1)} disabled={index === items.length - 1}>
                    <ArrowDown />
                  </IconButton>
                  <IconButton label="Duplicate" onClick={() => replace([...items.slice(0, index + 1), structuredClone(item), ...items.slice(index + 1)], [index + 1])} disabled={items.length >= max}>
                    <Copy />
                  </IconButton>
                  <IconButton label="Delete" onClick={() => setConfirmDelete(index)}>
                    <Trash2 />
                  </IconButton>
                </div>
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
                <div className="grid gap-4 border-t border-line p-3 sm:grid-cols-2 sm:p-4">
                  {field.fields.map((sub) => (
                    <div key={sub.key} className={cn(sub.type === "textarea" || sub.type === "strings" || sub.type === "list" || sub.type === "group" || sub.type === "image" ? "sm:col-span-2" : undefined)}>
                      <FieldView field={sub} value={item[sub.key]} path={[...path, index, sub.key]} onChange={onChange} />
                    </div>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {needle && visible.length === 0 ? <p className="text-sm text-muted">No match for &quot;{query}&quot;.</p> : null}
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
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
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
          className={cn("grid shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-black/30 text-xs text-muted", aspect ? (wide ? "w-56" : "w-28") : "size-24")}
          style={aspect ? { aspectRatio: `${aw} / ${ah}` } : undefined}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.includes("imagekit.io") ? `${value}${value.includes("?") ? "&" : "?"}tr=w-240,h-240,c-at_max` : value} alt="" className={cn("size-full", fit === "contain" ? "object-contain p-1.5" : "object-cover")} />
          ) : (
            "No image"
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setPicking(true)}>
            <ImagePlus aria-hidden="true" /> {value ? "Change image" : "Choose image"}
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
