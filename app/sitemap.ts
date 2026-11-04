import type { MetadataRoute } from "next";
import { areas, destinations, servicePages } from "@/lib/content";

const base = "https://veera-cabs.com";

export default function sitemap(): MetadataRoute.Sitemap {
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
