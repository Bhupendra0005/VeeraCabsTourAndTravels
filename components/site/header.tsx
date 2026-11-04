"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeIndianRupee,
  CarFront,
  ChevronRight,
  House,
  Info,
  Mail,
  MapPinned,
  Menu,
  Phone,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { navItems, site, whatsappLink } from "@/lib/site";
import { openBooking } from "@/components/site/booking";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";

const navIcons: Record<string, LucideIcon> = {
  home: House,
  services: CarFront,
  destinations: MapPinned,
  "rate-card": BadgeIndianRupee,
  about: Info,
  contact: Mail,
};

export function SiteHeader() {
  // The drawer is open only while we are still on the page it was opened from,
  // so any navigation closes it without needing an effect.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname() || "/";
  const menuOpen = openedOn === pathname;
  const setMenuOpen = (open: boolean) => setOpenedOn(open ? pathname : null);
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const progressRef = useRef<HTMLSpanElement>(null);
  const scrolledRef = useRef(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0;
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${progress})`;
      }
      const nextScrolled = window.scrollY > 24;
      if (nextScrolled !== scrolledRef.current) {
        scrolledRef.current = nextScrolled;
        setScrolled(nextScrolled);
      }
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Drawer behaviour: lock page scroll, move focus in, restore it on close
  useEffect(() => {
    if (!menuOpen) return;
    const toggle = toggleRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 120);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenedOn(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      toggle?.focus?.({ preventScroll: true });
    };
  }, [menuOpen]);

  // Close if the screen grows to desktop size
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1025px)");
    const onChange = () => {
      if (media.matches) setOpenedOn(null);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  // Keep Tab inside the open drawer
  const trapFocus = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab" || !drawerRef.current) return;
    const items = drawerRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])',
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <header
      className={`site-header${scrolled ? " is-scrolled" : ""}${
        menuOpen ? " is-menu-open" : ""
      }`}
    >
      <div className="nav-bar">
        <div className="shell nav-inner">
          <Link className="brand" href="/" aria-label="Veera Tours & Travels home">
            <img
              className="brand-logo"
              src="/logo-navbar-96.webp"
              width={249}
              height={48}
              alt="Veera Tours & Travels"
              loading="eager"
              decoding="async"
            />
          </Link>

          <nav className="desktop-nav" aria-label="Primary navigation">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={isActive(item.href) ? "is-active" : ""}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="nav-actions">
            <a className="nav-phone" href={site.primaryPhone.href}>
              <Phone aria-hidden="true" />
              <span>
                <small>24/7 booking</small>
                <b>{site.primaryPhone.display}</b>
              </span>
            </a>
            <button
              type="button"
              className="btn btn-gold nav-book"
              onClick={() => openBooking()}
            >
              Book a ride
              <ArrowRight aria-hidden="true" />
            </button>
            <a
              className="nav-call"
              href={site.primaryPhone.href}
              aria-label={`Call ${site.primaryPhone.display}`}
            >
              <Phone aria-hidden="true" />
            </a>
            <button
              type="button"
              ref={toggleRef}
              className="menu-toggle"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              aria-label="Open menu"
            >
              <Menu />
            </button>
          </div>
        </div>
        <span className="scroll-progress" ref={progressRef} aria-hidden="true" />
      </div>

      {/* Mobile drawer */}
      <div
        className={`drawer-backdrop${menuOpen ? " is-open" : ""}`}
        onClick={closeMenu}
        aria-hidden="true"
      />
      <aside
        id="mobile-navigation"
        ref={drawerRef}
        className={`drawer${menuOpen ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        inert={!menuOpen}
        onKeyDown={trapFocus}
      >
        <div className="drawer-head">
          <Link
            className="brand"
            href="/"
            aria-label="Veera Tours & Travels home"
            onClick={closeMenu}
          >
            <img
              className="brand-logo"
              src="/logo-navbar-96.webp"
              width={249}
              height={48}
              alt="Veera Tours & Travels"
              decoding="async"
            />
          </Link>
          <button
            type="button"
            ref={closeRef}
            className="drawer-close"
            onClick={closeMenu}
            aria-label="Close menu"
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <nav className="drawer-nav" aria-label="Mobile navigation">
          {navItems.map((item, index) => {
            const Icon = navIcons[item.id] ?? House;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`drawer-link${isActive(item.href) ? " is-active" : ""}`}
                aria-current={isActive(item.href) ? "page" : undefined}
                style={{ "--i": index } as CSSProperties}
                onClick={closeMenu}
              >
                <span className="drawer-link-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span className="drawer-link-label">{item.label}</span>
                <ChevronRight className="drawer-link-chev" aria-hidden="true" />
              </Link>
            );
          })}
        </nav>

        <div className="drawer-cta">
          <button
            type="button"
            className="btn btn-gold drawer-book"
            onClick={() => {
              closeMenu();
              openBooking();
            }}
          >
            Book your ride
            <ArrowRight aria-hidden="true" />
          </button>
          <div className="drawer-quick">
            <a className="drawer-quick-btn" href={site.primaryPhone.href}>
              <Phone aria-hidden="true" />
              Call now
            </a>
            <a
              className="drawer-quick-btn is-whatsapp"
              href={whatsappLink()}
              target="_blank"
              rel="noreferrer"
            >
              <WhatsAppIcon aria-hidden="true" />
              WhatsApp
            </a>
          </div>
        </div>

        <div className="drawer-foot">
          <span className="drawer-open-pill">
            <i aria-hidden="true" />
            Open 24/7
          </span>
          <p>
            {site.address.line1}, {site.address.line2}
          </p>
          <a href={site.primaryPhone.href}>{site.primaryPhone.display}</a>
        </div>
      </aside>
    </header>
  );
}
