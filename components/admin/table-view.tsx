"use client";

import { LayoutGrid, Table } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Table / Grid switch for every admin list.
 * With no choice made ("auto") phones show the grid of cards and bigger screens show the table, purely by CSS (no flash).
 * A choice is remembered in this browser for all lists.
 */

type View = "auto" | "table" | "grid";
const KEY = "admin-list-view";

const listeners = new Set<() => void>();
let chosen: View | null = null;

function read(): View {
  if (chosen) return chosen;
  try {
    const v = localStorage.getItem(KEY);
    if (v === "table" || v === "grid") return v;
  } catch {
    /* storage blocked: stay on auto */
  }
  return "auto";
}

function write(view: View) {
  chosen = view;
  try {
    localStorage.setItem(KEY, view);
  } catch {
    /* the choice still holds for this visit */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

const btn =
  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-muted transition hover:text-white [&>svg]:size-4";

export function ListViews({ table, grid }: { table: ReactNode; grid: ReactNode }) {
  const view = useSyncExternalStore(subscribe, read, () => "auto" as View);

  return (
    <div data-view={view} className="group grid gap-3">
      {/* phones always get the card grid (a wide table is unusable there), so the switch only shows from md up */}
      <div className="flex justify-end max-md:hidden">
        <div role="group" aria-label="List view" className="inline-flex gap-1 rounded-xl border border-line bg-white/3 p-1">
          <button
            type="button"
            onClick={() => write("table")}
            aria-pressed={view === "table"}
            className={cn(btn, "group-data-[view=table]:bg-brand/20 group-data-[view=table]:text-white group-data-[view=auto]:md:bg-brand/20 group-data-[view=auto]:md:text-white")}
          >
            <Table aria-hidden="true" /> Table
          </button>
          <button
            type="button"
            onClick={() => write("grid")}
            aria-pressed={view === "grid"}
            className={cn(btn, "group-data-[view=grid]:bg-brand/20 group-data-[view=grid]:text-white group-data-[view=auto]:max-md:bg-brand/20 group-data-[view=auto]:max-md:text-white")}
          >
            <LayoutGrid aria-hidden="true" /> Grid
          </button>
        </div>
      </div>
      {table}
      {grid}
    </div>
  );
}
