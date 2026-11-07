import type { MetadataRoute } from "next";
import { getAreas, getDestinations, getServices } from "@/lib/server/cms/content";

const base = "https://veera-cabs.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [areas, destinations, servicePages] = await Promise.all([getAreas(), getDestinations(), getServices()]);
  const staticPaths = [
    "/",
    "/about",
    "/services",
    "/destinations",
    "/areas",
    "/rate-card",
    "/payment-options",
    "/contact",
  ];
  const paths = [
    ...staticPaths,
    ...servicePages.map((item) => `/services/${item.slug}`),
    ...destinations.map((item) => `/destinations/${item.slug}`),
    ...areas.map((item) => `/areas/${item.slug}`),
  ];
  return paths.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
