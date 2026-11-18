import Link from "next/link";
import { Fragment, type ComponentProps, type ReactNode } from "react";
import { ListViews } from "@/components/admin/table-view";
import { cn } from "@/lib/utils/cn";

/* Admin design primitives. Server-safe (no hooks). Text always wraps: nothing is truncated. */

export const wrap = "[overflow-wrap:anywhere]";

export const inputClass =
  "w-full rounded-xl border border-white/12 bg-black/30 px-3.5 py-3 text-sm text-(--text) placeholder:text-white/35 outline-none transition hover:border-white/20 focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-60 [color-scheme:dark] [&>option]:bg-[#161a1d] [&>option]:text-white";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold leading-tight transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-55 [&>svg]:size-4 [&>svg]:shrink-0",
    size === "sm" ? "px-3 py-1.5 text-[13px] max-sm:min-h-10" : "px-4 py-2.5 text-sm",
    variant === "primary" && "bg-brand text-white hover:bg-brand-bright",
    variant === "secondary" && "border border-white/15 bg-white/5 text-(--text) hover:bg-white/10",
    variant === "danger" && "bg-red-600 text-white hover:bg-red-500",
    variant === "ghost" && "text-(--muted) hover:bg-white/5 hover:text-white",
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass({ variant, size, className })} {...props} />;
}

export function PageHeader({
  title,
  description,
  actions,
  icon,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Optional icon shown in a tile before the title. */
  icon?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-4 sm:items-center">
        {icon ? (
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-brand/25 to-brand/5 text-brand-bright ring-1 ring-brand-bright/25 shadow-[0_8px_24px_-10px_rgba(0,150,219,0.6)] sm:size-14 [&>svg]:size-5 sm:[&>svg]:size-6">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className={cn("font-(family-name:--font-display) text-2xl font-bold sm:text-3xl", wrap)}>{title}</h1>
          {description ? <p className={cn("mt-1 max-w-3xl text-sm text-muted", wrap)}>{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Card({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-line bg-panel p-4 sm:p-6", className)}>
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <h2 className={cn("font-(family-name:--font-display) text-lg font-bold", wrap)}>{title}</h2> : null}
            {description ? <p className={cn("mt-1 text-sm text-muted", wrap)}>{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

const tones = {
  neutral: "bg-white/10 text-(--text)",
  success: "bg-emerald-400/15 text-emerald-300",
  warning: "bg-amber-400/15 text-amber-300",
  danger: "bg-red-400/15 text-red-300",
  info: "bg-sky-400/15 text-sky-300",
} as const;

export type Tone = keyof typeof tones;

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide", tones[tone])}>
      {children}
    </span>
  );
}

export function Alert({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-xl px-4 py-3 text-sm", wrap, tones[tone])}>
      {children}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-(--text)">
        {label}
      </label>
      {children}
      {hint ? <p className={cn("text-xs text-muted", wrap)}>{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  icon,
  bare,
}: {
  title: string;
  children?: ReactNode;
  icon?: ReactNode;
  /** No border or background: for use inside something that already has a frame. */
  bare?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-6 text-center",
        bare ? "py-14" : "rounded-2xl border border-dashed border-white/10 bg-linear-to-b from-white/3 to-transparent py-14",
      )}
    >
      {icon ? (
        <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-white/5 text-white/50 ring-1 ring-white/10 [&>svg]:size-6">
          {icon}
        </span>
      ) : null}
      <p className="font-semibold">{title}</p>
      {children ? <div className="mt-1.5 max-w-sm text-sm text-muted">{children}</div> : null}
    </div>
  );
}

const statTones = {
  blue: { tile: "bg-sky-400/10 text-sky-300 ring-sky-400/20", glow: "bg-sky-400" },
  green: { tile: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20", glow: "bg-emerald-400" },
  amber: { tile: "bg-amber-400/10 text-amber-300 ring-amber-400/20", glow: "bg-amber-400" },
  violet: { tile: "bg-violet-400/10 text-violet-300 ring-violet-400/20", glow: "bg-violet-400" },
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "blue",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: keyof typeof statTones;
}) {
  const t = statTones[tone];
  // shrink the figure as it gets longer so big numbers (₹1,23,45,678) fit the card instead of breaking mid-number
  const len = typeof value === "string" || typeof value === "number" ? String(value).length : 0;
  const size =
    len <= 6
      ? "text-2xl sm:text-3xl"
      : len <= 9
        ? "text-xl sm:text-2xl"
        : len <= 12
          ? "text-lg sm:text-xl"
          : "text-base sm:text-lg";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-panel bg-linear-to-b from-white/[0.035] to-transparent p-4 transition hover:-translate-y-0.5 hover:border-white/15 sm:p-5">
      <div aria-hidden="true" className={cn("pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-[0.13] blur-2xl", t.glow)} />
      <div className="relative flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-muted sm:text-[13px]">{label}</p>
        {icon ? (
          <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl ring-1 sm:size-10 [&>svg]:size-4 sm:[&>svg]:size-5", t.tile)}>{icon}</span>
        ) : null}
      </div>
      <p className={cn("relative mt-2 font-(family-name:--font-display) font-bold tracking-tight tabular-nums sm:mt-3", size, wrap)}>{value}</p>
      {hint ? <p className="relative mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  /** Shown as the card title on phones. */
  primary?: boolean;
  align?: "right";
};

/** A real table from `md` up, stacked cards on phones. Every cell wraps, nothing is clipped. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  card,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Draws a row as its own card in the grid view (instead of the generic label/value card). */
  card?: (row: T) => ReactNode;
}) {
  const primary = columns.find((c) => c.primary) ?? columns[0];
  return (
    <ListViews
      table={
      <div key="table" className="hidden overflow-x-auto rounded-2xl border border-line md:group-data-[view=auto]:block md:group-data-[view=table]:block">
        {/* min width: on a phone the table scrolls sideways instead of squeezing every cell into one letter per line */}
        <table className="w-full min-w-176 border-collapse text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-muted">
            <tr>
              {columns.map((c) => (
                <th key={c.header} className={cn("px-4 py-3 font-semibold", c.align === "right" && "text-right")}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="align-top hover:bg-white/[0.03]">
                {columns.map((c) => (
                  // wrap-break-word (not "anywhere"): a column never shrinks below its longest word, so cells stay readable and the table scrolls instead
                  <td key={c.header} className={cn("px-4 py-3 wrap-break-word", c.align === "right" && "text-right")}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      }
      grid={
      <ul key="grid" className={cn("grid gap-3 md:group-data-[view=auto]:hidden md:group-data-[view=table]:hidden", card ? "gap-4 lg:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3")}>
        {card
          ? rows.map((row) => (
              <li key={rowKey(row)} className="min-w-0">
                {card(row)}
              </li>
            ))
          : rows.map((row) => (
          <li key={rowKey(row)} className="min-w-0 rounded-2xl border border-line bg-panel p-4">
            <div className={cn("mb-3 border-b border-line pb-3 font-semibold [&_a]:py-1.5 [&_a:not(.flex)]:inline-block", wrap)}>{primary.cell(row)}</div>
            <dl className="grid gap-2.5 text-sm">
              {columns
                .filter((c) => c !== primary && c.header)
                .map((c) => (
                  <div key={c.header} className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3">
                    <dt className="text-[13px] text-muted">{c.header}</dt>
                    <dd className={wrap}>{c.cell(row)}</dd>
                  </div>
                ))}
            </dl>
            {/* columns with no header are actions: a full-width row at the bottom of the card */}
            {columns.some((c) => c !== primary && !c.header) ? (
              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-line pt-4 max-sm:[&>a]:w-full max-sm:[&>a]:min-h-11">
                {columns.filter((c) => c !== primary && !c.header).map((c, i) => (
                  <Fragment key={i}>{c.cell(row)}</Fragment>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      }
    />
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  hrefFor,
}: {
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm" aria-label="Pagination">
      <p className="text-muted">
        Page {page} of {pages} · {total} total
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <ButtonLink href={hrefFor(page - 1)} variant="secondary" size="sm">
            Previous
          </ButtonLink>
        ) : null}
        {page < pages ? (
          <ButtonLink href={hrefFor(page + 1)} variant="secondary" size="sm">
            Next
          </ButtonLink>
        ) : null}
      </div>
    </nav>
  );
}

export function DefinitionList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
          <dd className={cn("mt-1 font-medium", wrap)}>{value || "-"}</dd>
        </div>
      ))}
    </dl>
  );
}
