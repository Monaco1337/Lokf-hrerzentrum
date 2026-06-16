import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://fairtrain.example.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/crm", "/api", "/m/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
