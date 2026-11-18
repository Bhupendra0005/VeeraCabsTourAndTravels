import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // private areas: the admin panel, APIs and anything tied to a signed-in customer
      disallow: ["/admin", "/api/", "/bookings", "/book/review", "/login", "/profile"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
