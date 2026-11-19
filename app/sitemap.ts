import type { MetadataRoute } from "next";

export const SITE = "https://lab.bookchaowalit.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE + "/" }];
}
