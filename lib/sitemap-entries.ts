import { isVisibleBookStatus } from "./book-status.ts";
import { bookCanonicalPath, seriesCanonicalPath } from "./catalog-routing.ts";
import { postUrl } from "./posts-shared.ts";

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

type SitemapPost = { slug: string; published_at: string; updated_at?: string };

/**
 * The news archive and one entry per published post. The archive is left out
 * while there are no posts, so an empty page is never offered for indexing.
 */
export function newsSitemapEntries(siteUrl: string, posts: SitemapPost[]): SitemapEntry[] {
  if (posts.length === 0) return [];

  const latest = posts[0];
  return [
    { url: `${siteUrl}/news`, lastModified: latest.updated_at || latest.published_at },
    ...posts.map((post) => ({
      url: `${siteUrl}${postUrl(post.slug)}`,
      lastModified: post.updated_at || post.published_at,
    })),
  ];
}
