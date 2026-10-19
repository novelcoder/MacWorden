import type { MetadataRoute } from "next";
import { getSeriesCatalog } from "@/lib/appwrite";
import { getAllPublishedPosts } from "@/lib/posts";
import { catalogSitemapEntries, newsSitemapEntries } from "@/lib/sitemap-entries";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

const staticPages: MetadataRoute.Sitemap = [
  { url: SITE_URL },
  { url: `${SITE_URL}/series` },
  { url: `${SITE_URL}/books` },
  { url: `${SITE_URL}/privacy` },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [catalog, posts] = await Promise.all([
    getSeriesCatalog().catch((error) => {
      console.warn("Could not load series for sitemap:", error);
      return [];
    }),
    getAllPublishedPosts().catch((error) => {
      console.warn("Could not load news posts for sitemap:", error);
      return [];
    }),
  ]);

  return [
    ...staticPages,
    ...catalogSitemapEntries(SITE_URL, catalog),
    ...newsSitemapEntries(SITE_URL, posts),
  ];
}
