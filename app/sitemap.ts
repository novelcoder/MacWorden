import type { MetadataRoute } from "next";
import { getSeriesCatalog } from "@/lib/appwrite";
import { catalogSitemapEntries } from "@/lib/sitemap-entries";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

const staticPages: MetadataRoute.Sitemap = [
  { url: SITE_URL },
  { url: `${SITE_URL}/series` },
  { url: `${SITE_URL}/books` },
  { url: `${SITE_URL}/privacy` },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const catalog = await getSeriesCatalog();
    return [...staticPages, ...catalogSitemapEntries(SITE_URL, catalog)];
  } catch (error) {
    console.warn("Could not load series for sitemap:", error);
    return staticPages;
  }
}
