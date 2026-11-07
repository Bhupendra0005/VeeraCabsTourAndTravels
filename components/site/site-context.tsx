"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { mapsDirectionsUrl, mapsOpenUrl, mapEmbedUrl, whatsappLink, type SiteData } from "@/lib/site";

export type Announcement = { enabled: boolean; text: string; linkLabel: string; linkHref: string };

export type NavService = { slug: string; title: string };

type SiteContextValue = {
  site: SiteData;
  services: NavService[];
  vehicles: string[];
  announcement: Announcement;
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
  services,
  vehicles,
  children,
}: {
  site: SiteData;
  announcement: Announcement;
  services: NavService[];
  vehicles: string[];
  children: ReactNode;
}) {
  const value = useMemo<SiteContextValue>(
    () => ({
      site,
      announcement,
      services,
      vehicles,
      whatsappLink: (message) => whatsappLink(message, site),
      mapsOpenUrl: () => mapsOpenUrl(site),
      mapsDirectionsUrl: () => mapsDirectionsUrl(site),
      mapEmbedUrl: () => mapEmbedUrl(site),
    }),
    [site, announcement, services, vehicles],
  );
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteContextValue {
  const value = useContext(SiteContext);
  if (!value) throw new Error("useSite must be used inside <SiteProvider>");
  return value;
}
