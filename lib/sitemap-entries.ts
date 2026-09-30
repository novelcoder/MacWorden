import { isVisibleBookStatus } from "./book-status.ts";
import { bookCanonicalPath, seriesCanonicalPath } from "./catalog-routing.ts";

type SitemapSeries = { slug: string; name?: string; series_heading?: string; $updatedAt?: string };
type SitemapBook = { slug: string; title: string; status: string; $updatedAt?: string };

export type SitemapEntry = { url: string; lastModified?: string };

/**
 * Series and book pages for the sitemap. Books are filtered through the same
 * visible-status allow-list the catalog queries use, so a draft (or any status
 * this site doesn't know yet) never gets a sitemap entry.
 */
export function catalogSitemapEntries(
  siteUrl: string,
  catalog: { series: SitemapSeries; books: SitemapBook[] }[]
): SitemapEntry[] {
  const seriesPages = catalog.map(({ series }) => ({
    url: `${siteUrl}${seriesCanonicalPath(series)}`,
    lastModified: series.$updatedAt,
  }));
  const bookPages = catalog.flatMap(({ books }) =>
    books
      .filter((book) => isVisibleBookStatus(book.status))
      .map((book) => ({
        url: `${siteUrl}${bookCanonicalPath(book)}`,
        lastModified: book.$updatedAt,
      }))
  );

  return [...seriesPages, ...bookPages];
}
