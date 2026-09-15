import type { MetadataRoute } from "next";
import { getSeriesList } from "@/lib/appwrite";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

const staticPages: MetadataRoute.Sitemap = [
  { url: SITE_URL },
  { url: `${SITE_URL}/books` },
  { url: `${SITE_URL}/privacy` },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const series = await getSeriesList();
    const seriesPages: MetadataRoute.Sitemap = series
      .filter(({ slug }) => Boolean(slug))
      .map(({ slug, $updatedAt }) => ({
        url: `${SITE_URL}/series/${encodeURIComponent(slug)}`,
        lastModified: $updatedAt,
      }));

    return [...staticPages, ...seriesPages];
  } catch (error) {
    console.warn("Could not load series for sitemap:", error);
    return staticPages;
  }
}
