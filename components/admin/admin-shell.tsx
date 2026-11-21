"use client";

import {
  BadgeIndianRupee,
  Building2,
  CalendarCheck,
  CarFront,
  CircleHelp,
  CreditCard,
  Crown,
  ExternalLink,
  FileClock,
  FileText,
  Globe,
  House,
  Images,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  Phone,
  Receipt,
  Route,
  Settings,
  Sparkles,
  Star,
  Tag,
  IdCard,
  TicketPercent,
  UserCog,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { AdminRole } from "@/lib/admin/permissions";
import { ROLE_LABEL } from "@/lib/admin/permissions";
import type { NavGroup, NavIcon } from "@/lib/admin/nav";
import { cn } from "@/lib/utils/cn";

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  bookings: CalendarCheck,
  payments: CreditCard,
  invoices: Receipt,
  reviews: Star,
  customers: Users,
  drivers: IdCard,
  coupons: TicketPercent,
  routes: Route,
  home: House,
  contact: Phone,
  fleet: CarFront,
  destinations: MapPinned,
  areas: Building2,
  services: Sparkles,
  faq: CircleHelp,
  features: Tag,
  wallet: Wallet,
  rates: BadgeIndianRupee,
  seo: Globe,
  media: Images,
  settings: Settings,
  team: UserCog,
  audit: FileClock,
  documents: FileText,
  account: UserCog,
};

type Props = {
  nav: NavGroup[];
  user: { name: string; email: string; role: AdminRole };
  logoutAction: () => Promise<void>;
  children: ReactNode;
};

function NavList({ nav, pathname, onNavigate }: { nav: NavGroup[]; pathname: string; onNavigate?: () => void }) {
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <nav aria-label="Admin" className="grid gap-6">
      {nav.map((group) => (
        <div key={group.title}>
          <p className="mb-2 px-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/35">{group.title}</p>
          <ul className="grid gap-1">
            {group.items.map((item) => {
              const Icon = ICONS[item.icon];
              const active = isActive(item.href);
              return (
                <li key={item.href} className="relative">
                  {active ? (
                    <span aria-hidden="true" className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-bright shadow-[0_0_12px_rgba(60,184,242,0.8)]" />
                  ) : null}
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                      active
                        ? "bg-linear-to-r from-brand/20 to-brand/[0.04] text-white ring-1 ring-brand-bright/15"
                        : "text-muted hover:bg-white/[0.04] hover:text-white",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4.5 shrink-0 transition-colors",
                        active ? "text-brand-bright" : "text-white/45 group-hover:text-white/80",
                      )}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

const footerButton =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] font-semibold transition";

function Sidebar({ nav, user, logoutAction, pathname, onNavigate }: Omit<Props, "children"> & { pathname: string; onNavigate?: () => void }) {
  const initial = (user.name || user.email).trim().charAt(0).toUpperCase();
  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      {/* soft brand glows instead of a photo */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-24 size-64 rounded-full bg-brand/18 blur-[80px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-20 size-64 rounded-full bg-[#04567f]/30 blur-[90px]" />
      <div className="relative px-5 pt-6 pb-5">
        <Link href="/admin" onClick={onNavigate} className="block w-fit" aria-label="Admin dashboard">
          <img
            src="/logo-navbar-96.webp"
            alt="Veera Tours & Travels"
            width={249}
            height={48}
            className="h-9 w-auto drop-shadow-[0_4px_14px_rgba(31,181,247,0.3)]"
            decoding="async"
          />
        </Link>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brand-bright/25 bg-brand/10 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-brand-bright">
          <Crown className="size-3" aria-hidden="true" />
          Admin panel
        </span>
      </div>

      <div className="relative mx-5 h-px bg-line" />

      <div className="relative min-h-0 flex-1 overflow-y-auto px-3 py-5 [scrollbar-color:rgba(255,255,255,0.12)_transparent] [scrollbar-width:thin]">
        <NavList nav={nav} pathname={pathname} onNavigate={onNavigate} />
      </div>

      <div className="relative grid gap-2 border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-linear-to-br from-brand-bright to-[#04567f] text-sm font-bold text-white shadow-[0_4px_14px_-4px_rgba(0,150,219,0.7)]">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold [overflow-wrap:anywhere]">
              {user.name || user.email}
              <span className="rounded-md bg-brand/15 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-brand-bright">
                {ROLE_LABEL[user.role]}
              </span>
            </p>
            <p className="text-xs text-muted [overflow-wrap:anywhere]">{user.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/" target="_blank" className={cn(footerButton, "text-(--text) hover:bg-white/[0.07]")}>
            <ExternalLink className="size-3.5" aria-hidden="true" /> View site
          </Link>
          <form action={logoutAction} className="grid">
            <button type="submit" className={cn(footerButton, "text-(--text) hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300")}>
              <LogOut className="size-3.5" aria-hidden="true" /> Log out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function AdminShell({ nav, user, logoutAction, children }: Props) {
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  // the drawer is open only on the page it was opened from, so navigating closes it
  const open = openedOn === pathname;

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenedOn(null);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="min-h-dvh bg-ink text-(--text)">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-line bg-linear-to-b from-[#0b1113] to-[#080a0b] lg:block">
        <Sidebar nav={nav} user={user} logoutAction={logoutAction} pathname={pathname} />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-[#0a0d0e]/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/admin" aria-label="Admin dashboard">
          <img src="/logo-navbar-96.webp" alt="Veera Tours & Travels" width={249} height={48} className="h-8 w-auto" decoding="async" />
        </Link>
        <button
          type="button"
          onClick={() => setOpenedOn(pathname)}
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
        aria-label="Admin menu"
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
          onClick={() => setOpenedOn(null)}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-[min(320px,88vw)] border-r border-line bg-linear-to-b from-[#0b1113] to-[#080a0b] transition-transform duration-300 ease-out will-change-transform motion-reduce:transition-none",
            open ? "translate-x-0 shadow-2xl" : "-translate-x-full",
          )}
        >
          <button
            type="button"
            onClick={() => setOpenedOn(null)}
            aria-label="Close menu"
            className="absolute right-3 top-3 z-10 rounded-lg p-2 text-muted hover:bg-white/5 hover:text-white"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          <Sidebar nav={nav} user={user} logoutAction={logoutAction} pathname={pathname} onNavigate={() => setOpenedOn(null)} />
        </div>
      </div>

      <main className="relative lg:pl-[264px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(ellipse_at_top,rgba(0,150,219,0.09),transparent_70%)] lg:left-[264px]"
        />
        <div className="relative mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
