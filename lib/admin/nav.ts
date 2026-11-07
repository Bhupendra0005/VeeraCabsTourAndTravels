import type { Permission } from "@/lib/admin/permissions";

export type NavIcon =
  | "dashboard"
  | "bookings"
  | "payments"
  | "customers"
  | "routes"
  | "home"
  | "contact"
  | "fleet"
  | "destinations"
  | "areas"
  | "services"
  | "faq"
  | "features"
  | "wallet"
  | "rates"
  | "seo"
  | "media"
  | "settings"
  | "team"
  | "audit"
  | "documents"
  | "account";

export type NavItem = { href: string; label: string; icon: NavIcon; permission?: Permission };
export type NavGroup = { title: string; items: NavItem[] };

export const ADMIN_NAV: NavGroup[] = [
  {
    title: "Operations",
    items: [
      { href: "/admin", label: "Dashboard", icon: "dashboard" },
      { href: "/admin/bookings", label: "Bookings", icon: "bookings", permission: "bookings.view" },
      { href: "/admin/payments", label: "Payments", icon: "payments", permission: "payments.view" },
      { href: "/admin/customers", label: "Customers", icon: "customers", permission: "customers.view" },
      { href: "/admin/routes", label: "Routes & fares", icon: "routes", permission: "routes.manage" },
    ],
  },
  {
    title: "Website pages",
    items: [
      { href: "/admin/pages/home", label: "Home page", icon: "home", permission: "content.manage" },
      { href: "/admin/pages/contact", label: "Contact & business", icon: "contact", permission: "content.manage" },
      { href: "/admin/pages/services", label: "Services", icon: "services", permission: "content.manage" },
      { href: "/admin/pages/destinations", label: "Destinations", icon: "destinations", permission: "content.manage" },
      { href: "/admin/pages/areas", label: "Pune areas", icon: "areas", permission: "content.manage" },
      { href: "/admin/pages/rate-card", label: "Rate card & fleet", icon: "rates", permission: "content.manage" },
      { href: "/admin/pages/seo", label: "SEO", icon: "seo", permission: "content.manage" },
      { href: "/admin/media", label: "Media library", icon: "media", permission: "media.manage" },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/admin/settings", label: "Booking settings", icon: "settings", permission: "settings.manage" },
      { href: "/admin/documents", label: "Invoice & ticket", icon: "documents", permission: "settings.manage" },
      { href: "/admin/team", label: "Team", icon: "team", permission: "team.manage" },
      { href: "/admin/audit", label: "Audit log", icon: "audit", permission: "audit.view" },
      { href: "/admin/account", label: "My account", icon: "account" },
    ],
  },
];
