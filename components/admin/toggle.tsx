"use client";

import { cn } from "@/lib/utils/cn";

/** An on/off switch (role="switch"). The visible label comes from the surrounding text via `label`. */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-8 w-14 shrink-0 rounded-full transition-colors outline-none focus-visible:ring-4 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-60",
        checked ? "bg-brand shadow-[0_0_22px_-4px_rgba(0,150,219,0.9)]" : "bg-white/15",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("absolute left-1 top-1 size-6 rounded-full bg-white shadow transition-transform duration-200", checked && "translate-x-6")}
      />
    </button>
  );
}
