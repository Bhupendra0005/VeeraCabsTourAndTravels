import { RotateCw } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/* Shared pieces for the admin list pages (Bookings, Payments, Customers). Server-safe: no hooks. */

/** Text-input look used inside filter panels (selects and dates have their own components). */
export const filterControl =
  "h-12 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-3 text-base text-(--text) sm:text-sm outline-none transition placeholder:text-white/35 hover:border-white/20 focus:border-brand focus:ring-4 focus:ring-brand/15 [color-scheme:dark]";

export const filterIcon =
  "pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/45 transition-colors group-focus-within:text-brand-bright";

export function FilterPanel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section
      aria-label={label}
      className="relative z-10 rounded-2xl border border-brand-bright/30 bg-linear-to-b from-[#0c1a24] to-panel p-5 shadow-[0_0_44px_-18px_rgba(0,150,219,0.55)] sm:p-6"
    >
      {children}
    </section>
  );
}

export function FilterLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-2.5 block text-[13px] font-semibold">
      {children}
    </label>
  );
}

export function FilterButtons({
  resetHref,
  submitLabel = "Filter",
  submitIcon,
  className,
}: {
  resetHref: string;
  submitLabel?: string;
  submitIcon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-2", className)}>
      <button
        type="submit"
        className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-brand to-brand-bright px-5 text-sm font-bold text-white shadow-[0_10px_28px_-10px_rgba(0,150,219,0.8)] transition hover:brightness-110 sm:flex-none [&>svg]:size-4"
      >
        {submitIcon}
        {submitLabel}
      </button>
      <Link
        href={resetHref}
        className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-semibold transition hover:bg-white/10 sm:flex-none"
      >
        <RotateCw className="size-4" aria-hidden="true" /> Reset
      </Link>
    </div>
  );
}

const tones = {
  blue: "from-sky-400/25 to-sky-400/5 text-sky-300 ring-sky-400/25 shadow-sky-500/30",
  green: "from-emerald-400/25 to-emerald-400/5 text-emerald-300 ring-emerald-400/25 shadow-emerald-500/30",
  amber: "from-amber-400/25 to-amber-400/5 text-amber-300 ring-amber-400/25 shadow-amber-500/30",
  violet: "from-violet-400/25 to-violet-400/5 text-violet-300 ring-violet-400/25 shadow-violet-500/30",
  red: "from-red-400/25 to-red-400/5 text-red-300 ring-red-400/25 shadow-red-500/30",
} as const;

export type StatTone = keyof typeof tones;

/** Compact stat: icon tile on the left, label and value on the right. */
export function StatTile({
  icon,
  label,
  value,
  hint,
  tone = "blue",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: StatTone;
}) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-2xl border border-line bg-linear-to-b from-white/[0.035] to-transparent bg-panel p-3.5 transition hover:-translate-y-0.5 hover:border-white/15 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl bg-linear-to-br shadow-[0_8px_24px_-12px] ring-1 sm:size-14 sm:rounded-2xl [&>svg]:size-5 sm:[&>svg]:size-6", tones[tone])}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-white/70">{label}</p>
        <p className="font-(family-name:--font-display) text-xl leading-tight font-extrabold tracking-tight wrap-anywhere sm:text-2xl">{value}</p>
        {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      </div>
    </div>
  );
}

/** Big empty state with an illustration and an optional action. */
export function EmptyPanel({
  art,
  title,
  text,
  action,
}: {
  art: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-b from-[#0b1620] to-panel px-6 py-14 text-center">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-6 size-64 -translate-x-1/2 rounded-full bg-brand/15 blur-[90px]" />
      <div className="relative flex flex-col items-center">
        {art}
        <h2 className="mt-5 font-(family-name:--font-display) text-2xl font-extrabold sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-muted sm:text-base">{text}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </section>
  );
}

export function ClearFiltersLink({ href, label = "Clear filters" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-brand-bright/50 bg-brand/10 px-6 py-3 text-sm font-bold text-brand-bright transition hover:bg-brand/20"
    >
      <RotateCw className="size-4" aria-hidden="true" /> {label}
    </Link>
  );
}

/* ------------------------------ illustrations ----------------------------- */

const artClass = "h-36 w-auto drop-shadow-[0_12px_30px_rgba(60,130,255,0.35)]";

export function CalendarCarArt() {
  return (
    <svg viewBox="0 0 220 150" className={artClass} aria-hidden="true">
      <defs>
        <linearGradient id="cc-cal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6d8dff" />
          <stop offset="1" stopColor="#2c4bb0" />
        </linearGradient>
        <linearGradient id="cc-top" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8aa6ff" />
          <stop offset="1" stopColor="#5b7cf0" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="118" rx="42" ry="12" fill="#1b2f66" opacity=".55" />
      <ellipse cx="165" cy="118" rx="48" ry="13" fill="#1b2f66" opacity=".45" />
      <g transform="rotate(-4 90 70)">
        <rect x="42" y="26" width="104" height="92" rx="12" fill="url(#cc-cal)" />
        <path d="M42 38 a12 12 0 0 1 12 -12 h80 a12 12 0 0 1 12 12 v14 h-104z" fill="url(#cc-top)" />
        <rect x="68" y="14" width="8" height="22" rx="4" fill="#dbe5ff" />
        <rect x="112" y="14" width="8" height="22" rx="4" fill="#dbe5ff" />
        {[0, 1, 2, 3].map((c) =>
          [0, 1, 2].map((r) => (
            <rect key={`${c}-${r}`} x={54 + c * 22} y={62 + r * 18} width="14" height="11" rx="3" fill="#dbe5ff" opacity={r === 2 && c > 1 ? 0.25 : 0.9} />
          )),
        )}
      </g>
      <g transform="translate(110 84)">
        <path d="M4 34 Q4 22 15 19 L28 9 Q32 6 38 6 H62 Q68 6 72 10 L82 19 Q94 22 94 34 V38 H4z" fill="#e9f1ff" />
        <path d="M33 11 H46 V19 H26z M51 11 H62 Q64 11 66 13 L72 19 H51z" fill="#7aa2e8" />
        <circle cx="26" cy="40" r="9" fill="#1f2d52" />
        <circle cx="26" cy="40" r="4" fill="#e9f1ff" />
        <circle cx="74" cy="40" r="9" fill="#1f2d52" />
        <circle cx="74" cy="40" r="4" fill="#e9f1ff" />
      </g>
    </svg>
  );
}

export function PaymentArt() {
  return (
    <svg viewBox="0 0 220 150" className={artClass} aria-hidden="true">
      <defs>
        <linearGradient id="pa-card" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f8dff" />
          <stop offset="1" stopColor="#1f4fd0" />
        </linearGradient>
        <linearGradient id="pa-slip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9db9ff" />
          <stop offset="1" stopColor="#6e8fe8" />
        </linearGradient>
      </defs>
      <ellipse cx="110" cy="124" rx="78" ry="11" fill="#1b2f66" opacity=".5" />
      <g transform="rotate(8 130 60)">
        <rect x="104" y="14" width="64" height="86" rx="8" fill="url(#pa-slip)" />
        <circle cx="136" cy="38" r="13" fill="#3b82f6" />
        <text x="136" y="44" textAnchor="middle" fontSize="16" fontWeight="700" fill="#fff">
          ₹
        </text>
        <rect x="116" y="60" width="40" height="4" rx="2" fill="#dbe5ff" opacity=".9" />
        <rect x="116" y="70" width="30" height="4" rx="2" fill="#dbe5ff" opacity=".7" />
        <rect x="116" y="80" width="36" height="4" rx="2" fill="#dbe5ff" opacity=".5" />
      </g>
      <rect x="34" y="62" width="104" height="60" rx="10" fill="url(#pa-card)" />
      <rect x="34" y="76" width="104" height="10" fill="#0f2f8f" opacity=".55" />
      <rect x="46" y="98" width="24" height="9" rx="3" fill="#dbe5ff" opacity=".9" />
      <rect x="46" y="111" width="38" height="4" rx="2" fill="#dbe5ff" opacity=".55" />
      <circle cx="150" cy="104" r="17" fill="#22c55e" stroke="#0b1217" strokeWidth="3" />
      <path d="M141 104 L148 111 L160 97" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PeopleArt() {
  return (
    <svg viewBox="0 0 220 150" className={artClass} aria-hidden="true">
      <defs>
        <linearGradient id="pe-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6d8dff" />
          <stop offset="1" stopColor="#2c4bb0" />
        </linearGradient>
        <linearGradient id="pe-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38d3ee" />
          <stop offset="1" stopColor="#0a8fd0" />
        </linearGradient>
      </defs>
      <ellipse cx="110" cy="126" rx="80" ry="11" fill="#1b2f66" opacity=".5" />
      <g opacity=".85">
        <circle cx="62" cy="58" r="16" fill="url(#pe-a)" />
        <path d="M30 118 Q30 82 62 82 Q94 82 94 118z" fill="url(#pe-a)" />
      </g>
      <g opacity=".85">
        <circle cx="158" cy="58" r="16" fill="url(#pe-a)" />
        <path d="M126 118 Q126 82 158 82 Q190 82 190 118z" fill="url(#pe-a)" />
      </g>
      <circle cx="110" cy="46" r="20" fill="url(#pe-b)" />
      <path d="M70 120 Q70 76 110 76 Q150 76 150 120z" fill="url(#pe-b)" />
    </svg>
  );
}
