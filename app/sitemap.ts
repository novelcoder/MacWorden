import type { MetadataRoute } from "next";
import { getSeriesCatalog } from "@/lib/appwrite";
import { bookCanonicalPath, seriesCanonicalPath } from "@/lib/catalog-routing";
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
    const seriesPages: MetadataRoute.Sitemap = catalog.map(({ series }) => ({
      url: `${SITE_URL}${seriesCanonicalPath(series)}`,
      lastModified: series.$updatedAt,
    }));
    const bookPages: MetadataRoute.Sitemap = catalog.flatMap(({ books }) =>
      books.map((book) => ({
        url: `${SITE_URL}${bookCanonicalPath(book)}`,
        lastModified: book.$updatedAt,
      }))
    );

    return [...staticPages, ...seriesPages, ...bookPages];
  } catch (error) {
    console.warn("Could not load series for sitemap:", error);
    return staticPages;
  }
}
