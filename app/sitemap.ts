import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";
import { getAreas, getDestinations, getServices } from "@/lib/server/cms/content";

const base = SITE_URL;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [areas, destinations, servicePages] = await Promise.all([getAreas(), getDestinations(), getServices()]);
  const staticPaths = [
    "/",
    "/about",
    "/services",
    "/destinations",
    "/book",
    "/areas",
    "/payment-options",
    "/cancellation-policy",
    "/terms",
    "/privacy-policy",
    "/contact",
  ];
  const paths = [
    ...staticPaths,
    ...servicePages.map((item) => `/services/${item.slug}`),
    ...destinations.map((item) => `/destinations/${item.slug}`),
    ...areas.map((item) => `/areas/${item.slug}`),
  ];
  // the money pages first, legal pages last
  const priority = (path: string) => {
    if (path === "/") return 1;
    if (path === "/book") return 0.9;
    if (path === "/services" || path === "/destinations" || path === "/contact") return 0.8;
    if (/^\/(services|destinations|areas)\//.test(path)) return 0.7;
    if (path === "/terms" || path === "/privacy-policy" || path === "/cancellation-policy" || path === "/payment-options") return 0.3;
    return 0.6;
  };
  const lastModified = new Date();
  return paths.map((path) => ({
    url: `${base}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency: path === "/" || path === "/book" ? "weekly" : "monthly",
    priority: priority(path),
  }));
}
