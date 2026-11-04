import "server-only";
import { Client, Query, TablesDB, type Models } from "node-appwrite";
import { VISIBLE_BOOK_STATUSES, type BookStatus } from "@/lib/book-status";

const SERIES_TABLE = "series";
const BOOKS_TABLE = "books";
const SETTINGS_TABLE = "site_settings";

const HERO_BOOK_KEY = "hero_book_id";
const NEWSLETTER_INCENTIVE_KEY = "newsletter_incentive";
const BOOKS_PAGE_SIZE = 100;
const MAX_BOOK_PAGES = 20;

export interface SeriesDoc extends Models.Row {
  slug: string;
  name?: string;
  series_heading?: string;
  card_tag?: string;
  card_description?: string;
  card_meta?: string;
  display_order?: number;
  tagline?: string;
  description?: string;
}

export interface BookDoc extends Models.Row {
  series_id: string;
  title: string;
  slug: string;
  tagline?: string;
  blurb?: string;
  card_description?: string;
  cover_url?: string;
  cover_thumb_url?: string;
  cover_alt?: string;
  status: BookStatus;
  series_number?: number;
  release_date?: string;
  store_url?: string;
  store_label?: string;
  kindle_asin?: string;
}

export interface SeriesCatalogEntry {
  series: SeriesDoc;
  books: BookDoc[];
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let client: Client | null = null;
let tablesDatabase: TablesDB | null = null;

function getClient(): Client {
  if (!client) {
    client = new Client()
      .setEndpoint(requiredEnv("CMS_ENDPOINT"))
      .setProject(requiredEnv("CMS_PROJECT_ID"))
      .setKey(requiredEnv("CMS_API_KEY"));
  }
  return client;
}

export function getTablesDatabase(): TablesDB {
  if (!tablesDatabase) {
    tablesDatabase = new TablesDB(getClient());
  }
  return tablesDatabase;
}

export function getCmsDatabaseId(): string {
  return requiredEnv("CMS_DATABASE_ID");
}

export function getCmsSiteId(): string {
  return requiredEnv("CMS_SITE_ID");
}

function siteId(): string {
  return getCmsSiteId();
}

export async function getSiteSetting(key: string): Promise<string> {
  const settings = await getTablesDatabase().listRows({
    databaseId: getCmsDatabaseId(),
    tableId: SETTINGS_TABLE,
    queries: [Query.equal("sites", siteId()), Query.equal("key", key), Query.limit(1)],
  });

  const value = (settings.rows[0]?.value as string | undefined)?.trim();
  if (!value) {
    throw new Error(`No ${key} setting exists for this site`);
  }

  return value;
}

export async function getHeroBook(): Promise<{
  id: string;
  title: string;
  src: string;
  alt: string;
  storeUrl?: string;
}> {
  const heroBookId = await getSiteSetting(HERO_BOOK_KEY);
  const book = await getTablesDatabase().getRow<BookDoc>({
    databaseId: getCmsDatabaseId(),
    tableId: BOOKS_TABLE,
    rowId: heroBookId,
  });

  if (!book.cover_url) {
    throw new Error(`Book ${heroBookId} does not have a cover_url`);
  }

  return {
    id: book.$id,
    title: book.title,
    src: book.cover_url,
    alt: book.cover_alt || `${book.title || "Featured book"} cover`,
    storeUrl: book.store_url,
  };
}

export async function getNewsletterIncentive(): Promise<string> {
  return getSiteSetting(NEWSLETTER_INCENTIVE_KEY);
}

export async function getSeriesList(): Promise<SeriesDoc[]> {
  const res = await getTablesDatabase().listRows<SeriesDoc>({
    databaseId: getCmsDatabaseId(),
    tableId: SERIES_TABLE,
    queries: [Query.equal("sites", siteId()), Query.orderAsc("display_order"), Query.limit(25)],
  });
  return res.rows;
}

export async function getSeriesBySlug(slug: string): Promise<SeriesDoc | null> {
  const res = await getTablesDatabase().listRows<SeriesDoc>({
    databaseId: getCmsDatabaseId(),
    tableId: SERIES_TABLE,
    queries: [Query.equal("slug", slug), Query.equal("sites", siteId()), Query.limit(1)],
  });
  return res.rows[0] ?? null;
}

/**
 * Reads every visible book matching `queries`, paging through the shared
 * catalog so books never silently drop out once it grows past one page.
 */
async function listVisibleBooks(queries: string[] = []): Promise<BookDoc[]> {
  const books: BookDoc[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_BOOK_PAGES; page++) {
    const res = await getTablesDatabase().listRows<BookDoc>({
      databaseId: getCmsDatabaseId(),
      tableId: BOOKS_TABLE,
      queries: [
        ...queries,
        Query.equal("status", [...VISIBLE_BOOK_STATUSES]),
        Query.orderAsc("$id"),
        Query.limit(BOOKS_PAGE_SIZE),
        ...(cursor ? [Query.cursorAfter(cursor)] : []),
      ],
    });

    books.push(...res.rows);
    if (res.rows.length < BOOKS_PAGE_SIZE) return books;
    cursor = res.rows[res.rows.length - 1].$id;
  }

  throw new Error(
    `The books catalog has more than ${MAX_BOOK_PAGES * BOOKS_PAGE_SIZE} visible rows; raise MAX_BOOK_PAGES.`
  );
}

export async function getBooksForSeries(seriesId: string): Promise<BookDoc[]> {
  const books = await listVisibleBooks([Query.equal("series_id", seriesId)]);
  return books.sort(compareBooksInSeries);
}

export async function getAllBooks(): Promise<BookDoc[]> {
  return listVisibleBooks();
}

function compareBooksInSeries(a: BookDoc, b: BookDoc) {
  const aNumber = typeof a.series_number === "number" ? a.series_number : Number.MAX_SAFE_INTEGER;
  const bNumber = typeof b.series_number === "number" ? b.series_number : Number.MAX_SAFE_INTEGER;
  return aNumber - bNumber || a.title.localeCompare(b.title);
}

export async function getSeriesCatalog(): Promise<SeriesCatalogEntry[]> {
  const [series, books] = await Promise.all([getSeriesList(), getAllBooks()]);
  const booksBySeries = new Map<string, BookDoc[]>();

  for (const book of books) {
    const current = booksBySeries.get(book.series_id) ?? [];
    current.push(book);
    booksBySeries.set(book.series_id, current);
  }

  for (const groupedBooks of booksBySeries.values()) {
    groupedBooks.sort(compareBooksInSeries);
  }

  return series.map((seriesDoc) => ({
    series: seriesDoc,
    books: booksBySeries.get(seriesDoc.$id) ?? [],
  }));
}

export async function getSeriesById(seriesId: string): Promise<SeriesDoc | null> {
  try {
    return await getTablesDatabase().getRow<SeriesDoc>({
      databaseId: getCmsDatabaseId(),
      tableId: SERIES_TABLE,
      rowId: seriesId,
    });
  } catch {
    return null;
  }
}
