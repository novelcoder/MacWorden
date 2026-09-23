import "server-only";

import { Query, type Models } from "node-appwrite";
import {
  getCmsDatabaseId,
  getTablesDatabase,
  type BookDoc,
} from "@/lib/appwrite";
import {
  type AmazonAttributionLink,
  type AttributionContext,
  type AttributionRoute,
  type AttributionSearchParam,
  loadAttributionContext,
  selectPurchaseUrl,
} from "@/lib/attribution-routing";

const ATTRIBUTION_ROUTES_TABLE = "attribution_routes";
const AMAZON_ATTRIBUTION_LINKS_TABLE = "amazon_attribution_links";
const MAX_ATTRIBUTION_ROUTES = 100;

interface AttributionRouteRow extends Models.Row {
  source_key?: unknown;
  book_slug?: unknown;
  enabled?: unknown;
  attribution_link?: unknown;
}

interface AmazonAttributionLinkRow extends Models.Row {
  book_id?: unknown;
  kindle_asin?: unknown;
  attribution_url?: unknown;
  click_through_url?: unknown;
  status?: unknown;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function relationshipId(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "$id" in value) {
    return stringValue((value as { $id?: unknown }).$id);
  }
  return "";
}

function isNotFound(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === 404
  );
}

function asRoute(row: AttributionRouteRow): AttributionRoute {
  return {
    id: row.$id,
    sourceKey: stringValue(row.source_key),
    bookSlug: stringValue(row.book_slug),
    linkId: relationshipId(row.attribution_link),
    enabled: row.enabled === true,
  };
}

function asAttributionLink(row: AmazonAttributionLinkRow): AmazonAttributionLink {
  return {
    id: row.$id,
    bookId: relationshipId(row.book_id),
    kindleAsin: stringValue(row.kindle_asin),
    attributionUrl: stringValue(row.attribution_url),
    clickThroughUrl: stringValue(row.click_through_url),
    status: stringValue(row.status),
  };
}

function asAttributionBook(book: BookDoc) {
  return {
    id: book.$id,
    slug: book.slug,
    kindleAsin: book.kindle_asin,
    publicStoreUrl: book.store_url,
  };
}

async function readRoutes(sourceKey: string) {
  const result = await getTablesDatabase().listRows<AttributionRouteRow>({
    databaseId: getCmsDatabaseId(),
    tableId: ATTRIBUTION_ROUTES_TABLE,
    queries: [
      Query.equal("source_key", [sourceKey]),
      Query.equal("enabled", [true]),
      Query.limit(MAX_ATTRIBUTION_ROUTES),
    ],
  });

  if (result.total > result.rows.length) {
    throw new Error("Attribution route result exceeded the safe query limit.");
  }

  return result.rows.map(asRoute);
}

async function readLink(linkId: string) {
  try {
    const row = await getTablesDatabase().getRow<AmazonAttributionLinkRow>({
      databaseId: getCmsDatabaseId(),
      tableId: AMAZON_ATTRIBUTION_LINKS_TABLE,
      rowId: linkId,
    });
    return asAttributionLink(row);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function getMacAttributionContext(
  rawSourceKey: AttributionSearchParam,
  books: BookDoc[]
): Promise<AttributionContext | null> {
  return loadAttributionContext({
    rawSourceKey,
    books: books.map(asAttributionBook),
    readRoutes,
    readLink,
    onRejected: (sourceKey, rejection) => {
      console.warn("Amazon Attribution route rejected; using the public store URL.", {
        sourceKey,
        routeId: rejection.routeId,
        bookSlug: rejection.bookSlug,
        reason: rejection.reason,
      });
    },
    onUnavailable: (sourceKey, error) => {
      console.error("Amazon Attribution routing unavailable; using public store URLs.", {
        sourceKey,
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
    },
  });
}

export function purchaseUrlForBook(book: BookDoc, context: AttributionContext | null) {
  return selectPurchaseUrl({
    publicStoreUrl: book.store_url,
    attributionUrl: context?.purchaseUrls[book.$id],
    expectedAsin: book.kindle_asin,
  });
}
