"use client";

import { Car, Check, Pencil, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Button, inputClass } from "@/components/admin/ui";
import { saveRidesCompletedAction } from "@/lib/server/admin/actions/rides";

/**
 * Dashboard card "Rides completed": the trips marked Completed in Bookings plus the rides the owner added by hand.
 * The owner edits the total; the part that comes from Bookings stays automatic.
 */
export function RidesCompletedCard({ total, inSystem, extra, canEdit }: { total: number; inSystem: number; extra: number; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(total));
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const open = () => {
    setValue(String(total));
    setError("");
    setEditing(true);
  };
  const save = () =>
    start(async () => {
      const result = await saveRidesCompletedAction(value);
      if (result.ok) {
        setEditing(false);
        setError("");
      } else {
        setError(result.error ?? "Could not save. Please try again.");
      }
    });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-panel bg-linear-to-b from-white/[0.035] to-transparent p-4 sm:col-span-2 sm:p-5 xl:col-span-4">
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-emerald-400 opacity-[0.13] blur-2xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20 [&>svg]:size-6">
            <Car aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted sm:text-[13px]">Rides completed</p>
            <p className="font-(family-name:--font-display) text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">{total.toLocaleString("en-IN")}</p>
            <p className="text-xs text-muted">
              {inSystem.toLocaleString("en-IN")} marked Completed in Bookings
              {extra > 0 ? ` + ${extra.toLocaleString("en-IN")} added by you` : ""}
            </p>
          </div>
        </div>

        {canEdit ? (
          editing ? (
            <form
              className="grid gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                save();
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <input
                  autoFocus
                  inputMode="numeric"
                  aria-label="Total rides completed"
                  maxLength={9}
                  autoComplete="off"
                  className={`${inputClass} w-40 tabular-nums`}
                  value={value}
                  onChange={(e) => setValue(e.target.value.replace(/[^0-9,]/g, ""))}
                />
                <Button type="submit" disabled={pending}>
                  <Check aria-hidden="true" /> {pending ? "Saving..." : "Save"}
                </Button>
                <Button variant="ghost" disabled={pending} onClick={() => setEditing(false)}>
                  <X aria-hidden="true" /> Cancel
                </Button>
              </div>
              {error ? <p className="text-xs text-red-300">{error}</p> : <p className="text-xs text-muted">Type the total. New Completed trips are added on top of it.</p>}
            </form>
          ) : (
            <Button variant="secondary" onClick={open}>
              <Pencil aria-hidden="true" /> Edit
            </Button>
          )
        ) : null}
      </div>
    </div>
  );
}
