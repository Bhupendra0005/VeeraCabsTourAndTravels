"use client";

import { ChevronDown, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  id: string;
  travellers: number;
  bags: number;
  onChange: (value: { travellers: number; bags: number }) => void;
};

const MAX_TRAVELLERS = 17;
const MAX_BAGS = 20;

function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const button =
    "grid size-9 place-items-center rounded-full border border-line text-brand-bright transition enabled:hover:border-brand enabled:hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className={button} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Fewer ${label.toLowerCase()}`}>
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <span className="w-6 text-center text-lg font-bold" aria-live="polite">
          {value}
        </span>
        <button type="button" className={button} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`More ${label.toLowerCase()}`}>
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** "Travellers & Bags" picker: one field that opens a small panel with two counters (like MakeMyTrip). */
export function TravellersField({ id, travellers, bags, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const people = `${travellers} ${travellers === 1 ? "Traveller" : "Travellers"}`;
  const luggage = `${bags} ${bags === 1 ? "Bag" : "Bags"}`;

  return (
    <div className="sf" ref={rootRef}>
      <button
        type="button"
        id={id}
        className={`sf-trigger${open ? " is-open" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {/* two lines when the column is narrow (desktop), one line on phones: it used to be cut to "2 Travellers, 0 B..." */}
        <span className="sf-value tf-summary">
          <span className="tf-people">{people}</span>
          <span className="tf-bags">
            <span className="tf-comma">, </span>
            {luggage}
          </span>
        </span>
        <ChevronDown className="sf-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div className="sf-panel tf-panel" role="dialog" aria-label="Travellers and bags">
          <Stepper
            label="Travellers"
            hint="Adults & children"
            value={travellers}
            min={1}
            max={MAX_TRAVELLERS}
            onChange={(value) => onChange({ travellers: value, bags })}
          />
          <Stepper label="Bags" hint="Suitcases & bags" value={bags} min={0} max={MAX_BAGS} onChange={(value) => onChange({ travellers, bags: value })} />
          <button type="button" className="btn btn-gold mt-3 w-full justify-center" onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      ) : null}
    </div>
  );
}
