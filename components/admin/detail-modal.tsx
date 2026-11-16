"use client";

import { Eye, MessageSquareText, X } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/admin/ui";

/**
 * An "eye" button that opens everything about one row in a popup: all the details, plus the row's actions.
 * The page that renders it (a server page) passes plain data in, so nothing sensitive is fetched in the browser.
 */
export function DetailModal({
  title,
  subtitle,
  badge,
  rows,
  wide,
  children,
  label = "View details",
}: {
  title: string;
  subtitle?: string;
  /** A status chip next to the title. */
  badge?: ReactNode;
  rows: [string, ReactNode][];
  /** Long free text shown full width under the details (a message, a review). */
  wide?: { label: string; body: ReactNode };
  /** Buttons / links shown at the bottom (call, WhatsApp, hide, mark contacted...). */
  children?: ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} aria-label={`${label}: ${title}`} title={label}>
        <Eye aria-hidden="true" /> <span className="hidden sm:inline">View</span>
      </Button>
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-70 grid place-items-center bg-black/70 p-3 backdrop-blur-sm sm:p-6"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setOpen(false);
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                style={{ animation: "sfPop 0.16s ease-out" }}
                className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-brand-bright/25 bg-linear-to-b from-[#0c1a24] to-[#0b141b] text-left shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9),0_0_50px_-24px_rgba(0,150,219,0.5)]"
              >
                <div className="flex items-start gap-3 border-b border-white/10 px-5 py-4 sm:px-6 sm:py-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <h2 id={titleId} className="font-(family-name:--font-display) text-xl font-bold wrap-anywhere">
                        {title}
                      </h2>
                      {badge}
                    </div>
                    {subtitle ? <div className="mt-1 text-sm text-muted wrap-anywhere">{subtitle}</div> : null}
                  </div>
                  <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="grid size-9 shrink-0 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white">
                    <X className="size-5" aria-hidden="true" />
                  </button>
                </div>
                <div className="grid gap-4 overflow-y-auto px-5 py-5 sm:px-6">
                  <dl className="grid gap-2.5 sm:grid-cols-2">
                    {rows.map(([label, value]) => (
                      <div key={label} className="min-w-0 rounded-xl border border-line bg-white/3 px-4 py-3">
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</dt>
                        <dd className="mt-1 text-[15px] font-semibold wrap-anywhere">{value || "-"}</dd>
                      </div>
                    ))}
                  </dl>
                  {wide ? (
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                        <MessageSquareText className="size-4" aria-hidden="true" /> {wide.label}
                      </div>
                      <div className="whitespace-pre-line rounded-xl border border-line border-l-4 border-l-brand bg-black/25 p-4 text-[15px] leading-relaxed wrap-anywhere">{wide.body}</div>
                    </div>
                  ) : null}
                </div>
                {children ? (
                  <div className="grid grid-cols-2 gap-2 border-t border-white/10 bg-black/20 px-5 py-4 sm:flex sm:flex-wrap sm:items-start sm:justify-end sm:px-6 [&_a]:min-h-10 [&_button]:min-h-10">{children}</div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
