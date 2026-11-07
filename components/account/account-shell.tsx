"use client";

import {
  CalendarCheck,
  CheckCircle2,
  Crown,
  ExternalLink,
  FileText,
  Menu,
  Plus,
  ShieldCheck,
  Ticket,
  UserRound,
  Wallet,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { cn } from "@/lib/utils/cn";

export type AccountIcon = "upcoming" | "completed" | "cancelled" | "all" | "profile" | "book" | "policy" | "payments" | "terms";

const ICONS: Record<AccountIcon, LucideIcon> = {
  profile: UserRound,
  upcoming: CalendarCheck,
  completed: CheckCircle2,
  cancelled: XCircle,
  all: Ticket,
  book: Plus,
  policy: ShieldCheck,
  payments: Wallet,
  terms: FileText,
};

export type AccountNavItem = { href: string; label: string; icon: AccountIcon; count?: number; active?: boolean };
export type AccountNavGroup = { title: string; items: AccountNavItem[] };

type Props = { groups: AccountNavGroup[]; email: string; children: ReactNode; /** Full-width block above the padded page content. */ banner?: ReactNode };

const logoClass = "h-9 w-auto drop-shadow-[0_4px_14px_rgba(31,181,247,0.3)]";

function Sidebar({ groups, email, onNavigate }: Omit<Props, "children"> & { onNavigate?: () => void }) {
  const initial = email.trim().charAt(0).toUpperCase();
  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      {/* soft brand glows instead of a photo */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-24 size-64 rounded-full bg-brand/18 blur-[80px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-20 size-64 rounded-full bg-[#04567f]/30 blur-[90px]" />

      <div className="relative px-5 pt-6 pb-5">
        <Link href="/" onClick={onNavigate} className="block w-fit" aria-label="Veera Tours & Travels home">
          <img src="/logo-navbar-96.webp" alt="Veera Tours & Travels" width={249} height={48} className={logoClass} decoding="async" />
        </Link>
        <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#22d3ee]/40 bg-[#22d3ee]/8 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#22d3ee] shadow-[0_0_18px_-6px_rgba(34,211,238,0.6)]">
          <Crown className="size-3.5" aria-hidden="true" />
          My account
        </span>
      </div>

      <div className="relative mx-5 h-px bg-line" />

      <div className="relative min-h-0 flex-1 overflow-y-auto px-3 py-5 [scrollbar-color:rgba(255,255,255,0.12)_transparent] [scrollbar-width:thin]">
        <nav aria-label="Account" className="grid gap-6">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/35">{group.title}</p>
              <ul className="grid gap-1">
                {group.items.map((item) => {
                  const Icon = ICONS[item.icon];
                  return (
                    <li key={item.href} className="relative">
                      {item.active ? (
                        <span
                          aria-hidden="true"
                          className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#22d3ee] shadow-[0_0_12px_rgba(34,211,238,0.8)]"
                        />
                      ) : null}
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={item.active ? "page" : undefined}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                          item.active
                            ? "bg-linear-to-r from-brand/20 to-brand/4 text-white ring-1 ring-brand-bright/15"
                            : "text-muted hover:bg-white/4 hover:text-white",
                        )}
                      >
                        <Icon
                          className={cn("size-4.5 shrink-0 transition-colors", item.active ? "text-[#22d3ee]" : "text-white/45 group-hover:text-white/80")}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">{item.label}</span>
                        {item.count !== undefined ? (
                          <span
                            className={cn(
                              "grid min-w-6 place-items-center rounded-full px-1.5 text-[11px] font-bold",
                              item.active ? "bg-[#22d3ee]/20 text-[#22d3ee]" : "bg-white/10 text-white/60",
                            )}
                          >
                            {item.count}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="relative grid gap-2 border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/3 p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-linear-to-br from-[#22d3ee] to-[#0a8fd0] text-sm font-bold text-[#04202c] shadow-[0_4px_14px_-4px_rgba(34,211,238,0.7)]">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#22d3ee]">Signed in</p>
            <p className="text-xs text-white/80 wrap-anywhere">{email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/"
            onClick={onNavigate}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/3 px-3 py-2 text-[13px] font-semibold text-(--text) transition hover:bg-white/7"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" /> Website
          </Link>
          <LogoutButton className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/3 px-3 py-2 text-[13px] font-semibold text-(--text) transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-60 [&>svg]:size-3.5" />
        </div>
      </div>
    </div>
  );
}

const panelBg = "bg-linear-to-b from-[#0b1113] to-[#080a0b]";

/** App-style shell for the signed-in customer: fixed sidebar on desktop, drawer on phones (same look as the admin panel). */
export function AccountShell({ groups, email, children, banner }: Props) {
  const [open, setOpen] = useState(false);

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
    <div className="min-h-dvh bg-ink text-(--text)">
      <aside className={cn("fixed inset-y-0 left-0 z-30 hidden w-66 border-r border-line lg:block", panelBg)}>
        <Sidebar groups={groups} email={email} />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-[#0a0d0e]/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" aria-label="Veera Tours & Travels home">
          <img src="/logo-navbar-96.webp" alt="Veera Tours & Travels" width={249} height={48} className="h-8 w-auto" decoding="async" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="rounded-lg border border-white/15 p-2 hover:bg-white/5"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
      </header>

      {/* Mobile drawer: always mounted so it can slide; `inert` keeps it out of reach while closed */}
      <div
        className={cn("fixed inset-0 z-40 lg:hidden", !open && "pointer-events-none")}
        role="dialog"
        aria-modal={open}
        aria-label="Account menu"
        aria-hidden={!open}
        inert={!open}
      >
        <button
          type="button"
          aria-label="Close menu"
          tabIndex={open ? 0 : -1}
          className={cn(
            "absolute inset-0 bg-black/70 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none",
            open ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setOpen(false)}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-[min(320px,88vw)] border-r border-line transition-transform duration-300 ease-out will-change-transform motion-reduce:transition-none",
            open ? "translate-x-0 shadow-2xl" : "-translate-x-full",
            panelBg,
          )}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="absolute right-3 top-3 z-10 rounded-lg p-2 text-muted hover:bg-white/5 hover:text-white"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          <Sidebar groups={groups} email={email} onNavigate={() => setOpen(false)} />
        </div>
      </div>

      <main className="relative overflow-hidden lg:pl-66">
        {banner}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-90 bg-[radial-gradient(ellipse_at_top,rgba(0,150,219,0.09),transparent_70%)] lg:left-66"
        />
        {/* faint glowing wave along the bottom, as in the design */}
        <svg aria-hidden="true" viewBox="0 0 1200 160" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full opacity-70 lg:left-66 lg:w-[calc(100%-16.5rem)]">
          <path d="M0 120 C200 60 380 150 620 110 C860 70 1000 30 1200 70" fill="none" stroke="rgba(34,211,238,0.35)" strokeWidth="2" />
          <path d="M0 140 C220 90 400 160 640 130 C880 100 1020 60 1200 100" fill="none" stroke="rgba(0,150,219,0.3)" strokeWidth="1.5" />
          <path d="M0 150 C240 120 420 165 660 145 C900 125 1040 95 1200 125" fill="none" stroke="rgba(0,150,219,0.2)" strokeWidth="1" />
        </svg>
        <div className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
