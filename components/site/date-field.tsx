"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

type DateFieldProps = {
  id: string;
  /** ISO date (YYYY-MM-DD) or an empty string. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d: Date, days: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

const monthLabel = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
});
const dayLabel = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const fullLabel = new Intl.DateTimeFormat("en-IN", { dateStyle: "full" });

/**
 * Custom calendar popover that replaces the browser's native date picker.
 * Past dates are disabled. Works with mouse, touch and keyboard
 * (arrows move by day/week, PageUp/PageDown by month, Enter selects, Esc closes).
 */
export function DateField({
  id,
  value,
  onChange,
  placeholder = "Select date",
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => new Date(2000, 0, 1)); // set properly on open
  const [focused, setFocused] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [today, setToday] = useState<Date | null>(null);

  const openPicker = () => {
    const now = new Date();
    const start = value ? fromIso(value) : now;
    setToday(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    setView(new Date(start.getFullYear(), start.getMonth(), 1));
    setFocused(toIso(start));
    setOpen(true);
  };

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  const choose = (iso: string) => {
    onChange(iso);
    close();
  };

  // Close on outside click or tap
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Move keyboard focus to the highlighted day
  useEffect(() => {
    if (!open || !focused) return;
    panelRef.current
      ?.querySelector<HTMLElement>(`[data-iso="${focused}"]`)
      ?.focus({ preventScroll: true });
  }, [open, focused, view]);

  const minIso = today ? toIso(today) : "";
  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const canGoPrev =
    today !== null &&
    (year > today.getFullYear() ||
      (year === today.getFullYear() && month > today.getMonth()));

  const shiftMonth = (delta: number) =>
    setView(new Date(year, month + delta, 1));

  const moveFocus = (target: Date) => {
    if (today && target < today) return;
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
    if (!focused) return;
    const current = fromIso(focused);
    let next: Date | null = null;
    switch (event.key) {
      case "ArrowLeft":
        next = addDays(current, -1);
        break;
      case "ArrowRight":
        next = addDays(current, 1);
        break;
      case "ArrowUp":
        next = addDays(current, -7);
        break;
      case "ArrowDown":
        next = addDays(current, 7);
        break;
      case "PageUp":
        next = new Date(current.getFullYear(), current.getMonth() - 1, current.getDate());
        break;
      case "PageDown":
        next = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
        break;
      default:
        return;
    }
    event.preventDefault();
    moveFocus(next);
  };

  return (
    <div className="dp" ref={rootRef}>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={`dp-trigger${open ? " is-open" : ""}${value ? "" : " is-empty"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close(false) : openPicker())}
      >
        {value ? dayLabel.format(fromIso(value)) : placeholder}
      </button>

      {open && today ? (
        <div
          className="dp-panel"
          role="dialog"
          aria-label="Choose travel date"
          ref={panelRef}
          onKeyDown={onPanelKeyDown}
        >
          <div className="dp-head">
            <button
              type="button"
              className="dp-nav"
              onClick={() => shiftMonth(-1)}
              disabled={!canGoPrev}
              aria-label="Previous month"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <b aria-live="polite">{monthLabel.format(view)}</b>
            <button
              type="button"
              className="dp-nav"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>

          <div className="dp-weekdays" aria-hidden="true">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="dp-grid" role="grid">
            {cells.map((day, index) => {
              if (day === null) return <span key={`blank-${index}`} />;
              const date = new Date(year, month, day);
              const iso = toIso(date);
              const disabled = iso < minIso;
              const selected = iso === value;
              const isToday = iso === minIso;
              return (
                <button
                  type="button"
                  key={iso}
                  data-iso={iso}
                  className={`dp-day${selected ? " is-selected" : ""}${
                    isToday ? " is-today" : ""
                  }`}
                  disabled={disabled}
                  tabIndex={iso === focused ? 0 : -1}
                  aria-label={fullLabel.format(date)}
                  aria-pressed={selected}
                  aria-current={isToday ? "date" : undefined}
                  onClick={() => choose(iso)}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="dp-foot">
            <button type="button" onClick={() => choose(minIso)}>
              Today
            </button>
            <button type="button" onClick={() => choose(toIso(addDays(today, 1)))}>
              Tomorrow
            </button>
            {value ? (
              <button
                type="button"
                className="dp-clear"
                onClick={() => {
                  onChange("");
                  close();
                }}
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
