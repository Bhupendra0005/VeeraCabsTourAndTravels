"use client";

import { ArrowLeft, CalendarDays, Pencil } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Phones, after a search: the big form folds into one slim bar (route, date, "Edit") like the MakeMyTrip app.
 * On larger screens the form is always shown and the bar is hidden.
 */
export function SearchCollapse({ from, to, subtitle, enabled, children }: { from: string; to: string; subtitle: string; enabled: boolean; children: ReactNode }) {
  // a long typed address: the bar shows its first part, the full text is in the tooltip and in the results below
  const short = (place: string) => place.split(",")[0].trim() || place;
  const [open, setOpen] = useState(false);
  if (!enabled) return <>{children}</>;
  return (
    <div className={cn("bk-collapse", open && "is-open")}>
      <div className="bk-sumbar">
        <a href="/book" className="bk-sumbar-back" aria-label="New search">
          <ArrowLeft aria-hidden="true" />
        </a>
        <div className="bk-sumbar-text">
          <b className="bk-sumbar-from" title={from}>
            <span>{short(from)}</span>
          </b>
          <b className="bk-sumbar-to" title={to}>
            <span>{short(to)}</span>
          </b>
          <small>
            <CalendarDays aria-hidden="true" /> {subtitle}
          </small>
        </div>
        <button type="button" className="bk-sumbar-edit" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <Pencil aria-hidden="true" /> {open ? "Close" : "Edit"}
        </button>
      </div>
      <div className="bk-collapse-body">{children}</div>
    </div>
  );
}
