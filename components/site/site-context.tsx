"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { mapsDirectionsUrl, mapsOpenUrl, mapEmbedUrl, whatsappLink, type SiteData } from "@/lib/site";

export type Announcement = { enabled: boolean; text: string; linkLabel: string; linkHref: string };

/** The phone number strip above the menu. */
export type Topbar = { enabled: boolean; label: string; showSecondary: boolean; showHours: boolean };

export type NavService = { slug: string; title: string };

type SiteContextValue = {
  site: SiteData;
  services: NavService[];
  vehicles: string[];
  announcement: Announcement;
  topbar: Topbar;
  whatsappLink: (message?: string) => string;
  mapsOpenUrl: () => string;
  mapsDirectionsUrl: () => string;
  mapEmbedUrl: () => string;
};

const SiteContext = createContext<SiteContextValue | null>(null);

/** Gives client components the live business details (phones, address, WhatsApp) edited in the admin panel. */
export function SiteProvider({
  site,
  announcement,
  topbar,
  services,
  vehicles,
  children,
}: {
  site: SiteData;
  announcement: Announcement;
  topbar: Topbar;
  services: NavService[];
  vehicles: string[];
  children: ReactNode;
}) {
  const value = useMemo<SiteContextValue>(
    () => ({
      site,
      announcement,
      topbar,
      services,
      vehicles,
      whatsappLink: (message) => whatsappLink(message, site),
      mapsOpenUrl: () => mapsOpenUrl(site),
      mapsDirectionsUrl: () => mapsDirectionsUrl(site),
      mapEmbedUrl: () => mapEmbedUrl(site),
    }),
    [site, announcement, topbar, services, vehicles],
  );
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteContextValue {
  const value = useContext(SiteContext);
  if (!value) throw new Error("useSite must be used inside <SiteProvider>");
  return value;
}
