import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // private areas: the admin panel, APIs and anything tied to a signed-in customer
      disallow: ["/admin", "/api/", "/bookings", "/book/review", "/login", "/profile"],
    },
    sitemap: "https://veera-cabs.com/sitemap.xml",
  };
}
