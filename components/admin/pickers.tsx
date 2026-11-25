"use client";

import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/* Themed replacements for the browser's native <select> and date picker (their popups cannot be styled).
   Both work as plain form fields (a hidden input carries the value when `name` is set) or controlled via value/onChange. */

type Size = "md" | "lg";

const triggerBase =
  "group relative flex w-full items-center gap-2.5 rounded-xl border bg-black/30 text-left text-sm text-(--text) outline-none transition hover:border-white/20 focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-60";
const sizeClass: Record<Size, string> = { md: "min-h-[42px] px-3 py-2", lg: "min-h-12 px-3.5 py-2.5" };

const panelBase =
  "absolute z-50 rounded-2xl border border-white/10 bg-[#0b1217]/95 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85),0_0_0_1px_rgba(60,184,242,0.06)] backdrop-blur-xl";

function useField(value: string | undefined, defaultValue: string | undefined, onChange: ((value: string) => void) | undefined) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const current = value ?? inner;
  const update = (next: string) => {
    if (value === undefined) setInner(next);
    onChange?.(next);
  };
  return [current, update] as const;
}

/** Closes on outside pointer; reports whether there is more room above than below when opening. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const show = (needed: number) => {
    const box = root.current?.getBoundingClientRect();
    if (box) setUp(window.innerHeight - box.bottom < needed && box.top > window.innerHeight - box.bottom);
    setOpen(true);
  };
  return { open, setOpen, up, root, show };
}

/* -------------------------------- Select -------------------------------- */

export type SelectOption = { value: string; label: string; /** Optional colour dot (CSS colour) shown before the label. */ swatch?: string };

export function SelectMenu({
  id,
  name,
  value,
  defaultValue,
  onChange,
  options,
  icon,
  placeholder = "Select",
  disabled,
  size = "md",
  className,
}: {
  id: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: readonly SelectOption[];
  /** Pass an element (for example `<Layers />`), not a component. */
  icon?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  size?: Size;
  className?: string;
}) {
  const [current, update] = useField(value, defaultValue, onChange);
  const { open, setOpen, up, root, show } = usePopover();
  const [active, setActive] = useState(0);
  const list = useRef<HTMLUListElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const selected = options.findIndex((o) => o.value === current);
  const label = selected >= 0 ? options[selected].label : "";

  const openList = () => {
    setActive(Math.max(0, selected));
    show(options.length * 44 + 24);
  };
  const choose = (index: number) => {
    update(options[index].value);
    setOpen(false);
    trigger.current?.focus();
  };

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) openList();
        else setActive((i) => Math.min(last, i + 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) openList();
        else setActive((i) => Math.max(0, i - 1));
        break;
      case "Home":
        if (open) {
          event.preventDefault();
          setActive(0);
        }
        break;
      case "End":
        if (open) {
          event.preventDefault();
          setActive(last);
        }
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (open) choose(active);
        else openList();
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        }
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={root} className={cn("relative", className)}>
      {name ? <input type="hidden" name={name} value={current} /> : null}
      <button
        ref={trigger}
        type="button"
        id={id}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cn(triggerBase, sizeClass[size], open ? "border-brand ring-4 ring-brand/15" : "border-white/10")}
      >
        {icon ? (
          <span className={cn("shrink-0 text-white/45 transition-colors group-focus-visible:text-brand-bright [&>svg]:size-4", open && "text-brand-bright")}>
            {icon}
          </span>
        ) : null}
        {selected >= 0 && options[selected].swatch ? (
          <span className="size-5 shrink-0 rounded-md ring-1 ring-white/25" style={{ background: options[selected].swatch }} aria-hidden="true" />
        ) : null}
        {/* one line: a long choice ends in "..." (full text on hover) instead of breaking mid-word inside the box */}
        <span className={cn("min-w-0 flex-1 truncate text-left", !label && "text-white/35")} title={label || placeholder}>
          {label || placeholder}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-white/50 transition-transform duration-200", open && "rotate-180 text-brand-bright")} aria-hidden="true" />
      </button>

      {open ? (
        <ul
          ref={list}
          id={`${id}-list`}
          role="listbox"
          tabIndex={-1}
          className={cn(panelBase, "left-0 right-0 max-h-72 overflow-auto p-1.5 [scrollbar-width:thin]", up ? "bottom-full mb-2" : "top-full mt-2")}
        >
          {options.map((option, index) => {
            const isSelected = index === selected;
            return (
              <li
                key={option.value}
                id={`${id}-opt-${index}`}
                data-index={index}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  index === active ? "bg-white/[0.07]" : "",
                  isSelected ? "font-semibold text-brand-bright" : "text-white/85",
                )}
              >
                {option.swatch ? <span className="size-4 shrink-0 rounded ring-1 ring-white/25" style={{ background: option.swatch }} aria-hidden="true" /> : null}
                <span className="min-w-0 flex-1 wrap-anywhere">{option.label}</span>
                {isSelected ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/* ------------------------------- Date picker ------------------------------ */

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthTitle = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });
const shown = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const longDay = new Intl.DateTimeFormat("en-IN", { dateStyle: "full" });

const navBtn =
  "grid size-8 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30 [&>svg]:size-4";

export function DatePicker({
  id,
  name,
  value,
  defaultValue,
  onChange,
  placeholder = "Select date",
  min,
  max,
  align = "left",
  size = "lg",
  disabled,
  className,
}: {
  id: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  /** ISO dates (YYYY-MM-DD). Past dates are allowed unless `min` is set. */
  min?: string;
  max?: string;
  align?: "left" | "right";
  size?: Size;
  disabled?: boolean;
  className?: string;
}) {
  const [current, update] = useField(value, defaultValue, onChange);
  const { open, setOpen, up, root, show } = usePopover();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(() => new Date(2000, 0, 1));
  const [mode, setMode] = useState<"days" | "months">("days");
  const [focused, setFocused] = useState("");
  const [today, setToday] = useState("");

  const openPicker = () => {
    const now = new Date();
    const start = current ? fromIso(current) : now;
    setToday(toIso(now));
    setView(new Date(start.getFullYear(), start.getMonth(), 1));
    setFocused(toIso(start));
    setMode("days");
    show(430);
  };

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) trigger.current?.focus();
  };
  const choose = (iso: string) => {
    update(iso);
    close();
  };
  const blocked = (iso: string) => Boolean((min && iso < min) || (max && iso > max));

  useEffect(() => {
    if (open && mode === "days" && focused) {
      panel.current?.querySelector<HTMLElement>(`[data-iso="${focused}"]`)?.focus({ preventScroll: true });
    }
  }, [open, mode, focused, view]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const cells: (number | null)[] = [
    ...Array.from({ length: new Date(year, month, 1).getDay() }, () => null),
    ...Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1),
  ];

  const moveFocus = (target: Date) => {
    if (blocked(toIso(target))) return;
    setView(new Date(target.getFullYear(), target.getMonth(), 1));
    setFocused(toIso(target));
  };

  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (mode !== "days" || !focused) return;
    const cur = fromIso(focused);
    const moves: Record<string, Date> = {
      ArrowLeft: addDays(cur, -1),
      ArrowRight: addDays(cur, 1),
      ArrowUp: addDays(cur, -7),
      ArrowDown: addDays(cur, 7),
      PageUp: new Date(cur.getFullYear(), cur.getMonth() - 1, cur.getDate()),
      PageDown: new Date(cur.getFullYear(), cur.getMonth() + 1, cur.getDate()),
    };
    const next = moves[event.key];
    if (!next) return;
    event.preventDefault();
    moveFocus(next);
  };

  return (
    <div ref={root} className={cn("relative", className)}>
      {name ? <input type="hidden" name={name} value={current} /> : null}
      <button
        ref={trigger}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close(false) : openPicker())}
        className={cn(triggerBase, sizeClass[size], current ? "pr-10" : "", open ? "border-brand ring-4 ring-brand/15" : "border-white/10")}
      >
        <CalendarDays className={cn("size-4 shrink-0 text-white/45 transition-colors group-focus-visible:text-brand-bright", open && "text-brand-bright")} aria-hidden="true" />
        <span className={cn("min-w-0 flex-1 truncate text-left", !current && "text-white/35")}>{current ? shown.format(fromIso(current)) : placeholder}</span>
      </button>
      {current && !disabled ? (
        <button
          type="button"
          onClick={() => update("")}
          aria-label="Clear date"
          className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}

      {open ? (
        <div
          ref={panel}
          role="dialog"
          aria-label="Choose a date"
          onKeyDown={onPanelKeyDown}
          className={cn(panelBase, "w-[19.5rem] max-w-[calc(100vw-2rem)] p-4", align === "right" ? "right-0" : "left-0", up ? "bottom-full mb-2" : "top-full mt-2")}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              className={navBtn}
              aria-label={mode === "days" ? "Previous month" : "Previous year"}
              onClick={() => setView(new Date(year + (mode === "months" ? -1 : 0), month + (mode === "days" ? -1 : 0), 1))}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setMode((m) => (m === "days" ? "months" : "days"))}
              aria-live="polite"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition hover:bg-white/8"
            >
              {mode === "days" ? monthTitle.format(view) : year}
              <ChevronDown className={cn("size-3.5 text-white/50 transition-transform", mode === "months" && "rotate-180")} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={navBtn}
              aria-label={mode === "days" ? "Next month" : "Next year"}
              onClick={() => setView(new Date(year + (mode === "months" ? 1 : 0), month + (mode === "days" ? 1 : 0), 1))}
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>

          {mode === "months" ? (
            <div className="grid grid-cols-3 gap-2">
              {MONTHS.map((label, index) => {
                const on = index === month;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setView(new Date(year, index, 1));
                      setFocused(toIso(new Date(year, index, 1)));
                      setMode("days");
                    }}
                    className={cn(
                      "rounded-xl py-2.5 text-sm font-semibold transition",
                      on ? "bg-linear-to-br from-brand-bright to-brand text-white shadow-[0_6px_18px_-6px_rgba(0,150,219,0.9)]" : "text-white/80 hover:bg-white/8",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-bold tracking-wide text-white/35 uppercase" aria-hidden="true">
                {WEEKDAYS.map((d) => (
                  <span key={d} className="py-1">
                    {d}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1" role="grid">
                {cells.map((day, index) => {
                  if (day === null) return <span key={`b-${index}`} />;
                  const date = new Date(year, month, day);
                  const iso = toIso(date);
                  const isSelected = iso === current;
                  const isToday = iso === today;
                  return (
                    <button
                      key={iso}
                      type="button"
                      data-iso={iso}
                      disabled={blocked(iso)}
                      tabIndex={iso === focused ? 0 : -1}
                      aria-label={longDay.format(date)}
                      aria-pressed={isSelected}
                      aria-current={isToday ? "date" : undefined}
                      onClick={() => choose(iso)}
                      className={cn(
                        "mx-auto grid size-9 place-items-center rounded-full text-sm tabular-nums transition outline-none focus-visible:ring-2 focus-visible:ring-brand-bright disabled:pointer-events-none disabled:opacity-25",
                        isSelected
                          ? "bg-linear-to-br from-brand-bright to-brand font-bold text-white shadow-[0_6px_18px_-6px_rgba(0,150,219,0.95)]"
                          : isToday
                            ? "font-bold text-brand-bright ring-1 ring-brand-bright/60 hover:bg-white/8"
                            : "text-white/85 hover:bg-white/10",
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-sm font-semibold">
            <button type="button" onClick={() => (blocked(today) ? undefined : choose(today))} disabled={blocked(today)} className="rounded-lg px-2.5 py-1.5 text-brand-bright transition hover:bg-brand/15 disabled:opacity-30">
              Today
            </button>
            {current ? (
              <button
                type="button"
                onClick={() => {
                  update("");
                  close();
                }}
                className="rounded-lg px-2.5 py-1.5 text-white/60 transition hover:bg-white/8 hover:text-white"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
