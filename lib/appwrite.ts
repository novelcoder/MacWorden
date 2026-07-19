import "server-only";
import { Client, Databases, Query, type Models } from "node-appwrite";

const SERIES_COLLECTION = "series";
const BOOKS_COLLECTION = "books";
const SETTINGS_COLLECTION = "site_settings";

const HERO_BOOK_KEY = "hero_book_id";
const NEWSLETTER_INCENTIVE_KEY = "newsletter_incentive";

export interface SeriesDoc extends Models.Document {
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

export interface BookDoc extends Models.Document {
  series_id: string;
  title: string;
  tagline?: string;
  blurb?: string;
  card_description?: string;
  cover_url?: string;
  cover_alt?: string;
  status: "draft" | "coming_soon" | "published" | "best_seller";
  series_number?: number;
  store_url?: string;
  store_label?: string;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let databases: Databases | null = null;

function getDatabases(): Databases {
  if (!databases) {
    const client = new Client()
      .setEndpoint(requiredEnv("APPWRITE_ENDPOINT"))
      .setProject(requiredEnv("APPWRITE_PROJECT_ID"))
      .setKey(requiredEnv("APPWRITE_API_KEY"));
    databases = new Databases(client);
  }
  return databases;
}

function databaseId(): string {
  return requiredEnv("APPWRITE_DATABASE_ID");
}

function siteId(): string {
  return requiredEnv("APPWRITE_SITE_ID");
}

export async function getSiteSetting(key: string): Promise<string> {
  const settings = await getDatabases().listDocuments(databaseId(), SETTINGS_COLLECTION, [
    Query.equal("sites", siteId()),
    Query.equal("key", key),
    Query.limit(1),
  ]);

  const value = (settings.documents[0]?.value as string | undefined)?.trim();
  if (!value) {
    throw new Error(`No ${key} setting exists for this site`);
  }

  return value;
}

export async function getHeroBook(): Promise<{ src: string; alt: string }> {
  const heroBookId = await getSiteSetting(HERO_BOOK_KEY);
  const book = await getDatabases().getDocument<BookDoc>(databaseId(), BOOKS_COLLECTION, heroBookId);

  if (!book.cover_url) {
    throw new Error(`Book ${heroBookId} does not have a cover_url`);
  }

  return {
    src: book.cover_url,
    alt: book.cover_alt || `${book.title || "Featured book"} cover`,
  };
}

export async function getNewsletterIncentive(): Promise<string> {
  return getSiteSetting(NEWSLETTER_INCENTIVE_KEY);
}

export async function getSeriesList(): Promise<SeriesDoc[]> {
  const res = await getDatabases().listDocuments<SeriesDoc>(databaseId(), SERIES_COLLECTION, [
    Query.equal("sites", siteId()),
    Query.orderAsc("display_order"),
    Query.limit(25),
  ]);
  return res.documents;
}

export async function getSeriesBySlug(slug: string): Promise<SeriesDoc | null> {
  const res = await getDatabases().listDocuments<SeriesDoc>(databaseId(), SERIES_COLLECTION, [
    Query.equal("slug", slug),
    Query.equal("sites", siteId()),
    Query.limit(1),
  ]);
  return res.documents[0] ?? null;
}

export async function getBooksForSeries(seriesId: string): Promise<BookDoc[]> {
  const res = await getDatabases().listDocuments<BookDoc>(databaseId(), BOOKS_COLLECTION, [
    Query.equal("series_id", seriesId),
    Query.notEqual("status", "draft"),
    Query.orderAsc("series_number"),
    Query.limit(100),
  ]);
  return res.documents;
}
