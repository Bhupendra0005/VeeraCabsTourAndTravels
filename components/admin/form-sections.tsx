import type { ChangeEvent, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/* Building blocks shared by the longer admin forms (new invoice, new phone booking). */

/** One block of the form: an icon, a title and a short line saying what goes in it. */
export function Section({ icon, title, hint, children }: { icon: ReactNode; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-panel">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3.5 sm:px-6">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand-bright [&>svg]:size-4.5">{icon}</span>
        <div className="min-w-0">
          <h2 className="font-(family-name:--font-display) text-base font-bold">{title}</h2>
          {hint ? <p className="text-xs text-muted">{hint}</p> : null}
        </div>
      </header>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}

/** A radio that looks like a chip. The real input is a native radio, so keyboard and form submission just work. */
export function Choice({
  name,
  value,
  checked,
  onChange,
  required,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} required={required} className="peer sr-only" />
      <span className="inline-flex min-h-11 min-w-16 items-center justify-center rounded-xl border border-white/12 bg-black/30 px-4 text-sm font-semibold text-muted transition hover:border-white/25 peer-checked:border-brand peer-checked:bg-brand/15 peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-brand/25">
        {children}
      </span>
    </label>
  );
}

/** A button that looks like a chip and can be "on". */
export function Chip({ on, onClick, children }: { on?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        on ? "border-brand bg-brand/15 text-white" : "border-white/12 bg-black/30 text-muted hover:border-white/25 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
