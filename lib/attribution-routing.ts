export const ATTRIBUTION_QUERY_PARAM = "source_key";

export type AttributionSearchParam = string | string[] | null | undefined;

export type AttributionBook = {
  id: string;
  slug: string;
  kindleAsin?: string;
  publicStoreUrl?: string;
};

export type AttributionRoute = {
  id: string;
  sourceKey: string;
  bookSlug: string;
  linkId: string;
  enabled: boolean;
};

export type AmazonAttributionLink = {
  id: string;
  bookId: string;
  kindleAsin: string;
  attributionUrl: string;
  clickThroughUrl: string;
  status: string;
};

export type AttributionContext = {
  sourceKey: string;
  purchaseUrls: Record<string, string>;
};

export type AttributionRejectionReason =
  | "ambiguous_book_slug"
  | "asin_mismatch"
  | "book_mismatch"
  | "disabled_route"
  | "duplicate_route"
  | "invalid_attribution_url"
  | "invalid_click_through_url"
  | "missing_book"
  | "missing_book_asin"
  | "missing_link"
  | "missing_link_relationship"
  | "source_mismatch"
  | "inactive_link";

export type AttributionRejection = {
  routeId: string;
  bookSlug: string;
  reason: AttributionRejectionReason;
};

type AttributionLoader = {
  rawSourceKey: AttributionSearchParam;
  books: AttributionBook[];
  readRoutes: (sourceKey: string) => Promise<AttributionRoute[]>;
  readLink: (linkId: string) => Promise<AmazonAttributionLink | null>;
  onRejected?: (sourceKey: string, rejection: AttributionRejection) => void;
  onUnavailable?: (sourceKey: string, error: unknown) => void;
};

const SOURCE_KEY_PATTERN = /^[a-z0-9](?:[a-z0-9_]{0,62}[a-z0-9])?$/;
const AMAZON_ATTRIBUTION_PARAMETERS = new Set(["maas", "ref_", "tag"]);

export function parseAttributionSourceKey(value: AttributionSearchParam): string | null {
  if (typeof value !== "string" || !SOURCE_KEY_PATTERN.test(value)) {
    return null;
  }

  return value;
}

export function parseMacAttributionSourceKey(value: AttributionSearchParam): string | null {
  const sourceKey = parseAttributionSourceKey(value);
  return sourceKey?.split("_").includes("mw") ? sourceKey : null;
}

export function sourceKeyFromSearchParams(searchParams: Pick<URLSearchParams, "getAll">) {
  const values = searchParams.getAll(ATTRIBUTION_QUERY_PARAM);
  return parseMacAttributionSourceKey(values.length === 1 ? values[0] : values);
}

export function withAttribution(path: string, sourceKey: string | null) {
  const validatedSourceKey = parseMacAttributionSourceKey(sourceKey);
  if (!validatedSourceKey || !path.startsWith("/") || path.startsWith("//")) {
    return path;
  }

  const url = new URL(path, "https://www.macworden.com");
  url.searchParams.set(ATTRIBUTION_QUERY_PARAM, validatedSourceKey);
  return `${url.pathname}${url.search}${url.hash}`;
}

function isExpectedAmazonProductUrl(url: URL, expectedAsin: string) {
  return (
    /^[A-Z0-9]{10}$/.test(expectedAsin) &&
    url.protocol === "https:" &&
    url.hostname === "www.amazon.com" &&
    url.port === "" &&
    url.username === "" &&
    url.password === "" &&
    url.pathname === `/dp/${expectedAsin}` &&
    url.hash === ""
  );
}

export function isValidAmazonClickThroughUrl(value: string, expectedAsin: string) {
  try {
    const url = new URL(value);
    return isExpectedAmazonProductUrl(url, expectedAsin) && url.search === "";
  } catch {
    return false;
  }
}

export function isValidAmazonAttributionUrl(value: string, expectedAsin: string) {
  try {
    const url = new URL(value);
    if (!isExpectedAmazonProductUrl(url, expectedAsin)) return false;

    const parameterNames = [...url.searchParams.keys()];
    if (
      parameterNames.length !== AMAZON_ATTRIBUTION_PARAMETERS.size ||
      parameterNames.some((name) => !AMAZON_ATTRIBUTION_PARAMETERS.has(name)) ||
      url.searchParams.getAll("maas").length !== 1 ||
      !url.searchParams.get("maas") ||
      url.searchParams.getAll("ref_").length !== 1 ||
      url.searchParams.get("ref_") !== "aa_maas" ||
      url.searchParams.getAll("tag").length !== 1 ||
      url.searchParams.get("tag") !== "maas"
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function selectPurchaseUrl({
  publicStoreUrl,
  attributionUrl,
  expectedAsin,
}: {
  publicStoreUrl?: string;
  attributionUrl?: string;
  expectedAsin?: string;
}) {
  if (
    attributionUrl &&
    expectedAsin &&
    isValidAmazonAttributionUrl(attributionUrl, expectedAsin)
  ) {
    return attributionUrl;
  }

  return publicStoreUrl;
}

export function resolveAttributionContext({
  sourceKey,
  books,
  routes,
  links,
}: {
  sourceKey: string;
  books: AttributionBook[];
  routes: AttributionRoute[];
  links: Map<string, AmazonAttributionLink>;
}): { context: AttributionContext | null; rejections: AttributionRejection[] } {
  const booksBySlug = new Map<string, AttributionBook[]>();
  for (const book of books) {
    const matchingBooks = booksBySlug.get(book.slug) ?? [];
    matchingBooks.push(book);
    booksBySlug.set(book.slug, matchingBooks);
  }

  const routesBySlug = new Map<string, AttributionRoute[]>();
  for (const route of routes) {
    const matchingRoutes = routesBySlug.get(route.bookSlug) ?? [];
    matchingRoutes.push(route);
    routesBySlug.set(route.bookSlug, matchingRoutes);
  }

  const purchaseUrls: Record<string, string> = {};
  const rejections: AttributionRejection[] = [];

  for (const [bookSlug, matchingRoutes] of routesBySlug) {
    if (matchingRoutes.length !== 1) {
      for (const route of matchingRoutes) {
        rejections.push({ routeId: route.id, bookSlug, reason: "duplicate_route" });
      }
      continue;
    }

    const route = matchingRoutes[0];
    const matchingBooks = booksBySlug.get(bookSlug) ?? [];
    const book = matchingBooks[0];
    const link = links.get(route.linkId);
    let reason: AttributionRejectionReason | null = null;

    if (!route.enabled) reason = "disabled_route";
    else if (route.sourceKey !== sourceKey) reason = "source_mismatch";
    else if (matchingBooks.length === 0) reason = "missing_book";
    else if (matchingBooks.length !== 1) reason = "ambiguous_book_slug";
    else if (!route.linkId) reason = "missing_link_relationship";
    else if (!link || link.id !== route.linkId) reason = "missing_link";
    else if (!book.kindleAsin) reason = "missing_book_asin";
    else if (link.bookId !== book.id) reason = "book_mismatch";
    else if (link.kindleAsin !== book.kindleAsin) reason = "asin_mismatch";
    else if (link.status !== "active") reason = "inactive_link";
    else if (!isValidAmazonClickThroughUrl(link.clickThroughUrl, book.kindleAsin)) {
      reason = "invalid_click_through_url";
    } else if (!isValidAmazonAttributionUrl(link.attributionUrl, book.kindleAsin)) {
      reason = "invalid_attribution_url";
    }

    if (reason) {
      rejections.push({ routeId: route.id, bookSlug, reason });
      continue;
    }

    if (book && link) {
      purchaseUrls[book.id] = link.attributionUrl;
    }
  }

  return {
    context:
      Object.keys(purchaseUrls).length > 0
        ? {
            sourceKey,
            purchaseUrls,
          }
        : null,
    rejections,
  };
}

export async function loadAttributionContext({
  rawSourceKey,
  books,
  readRoutes,
  readLink,
  onRejected,
  onUnavailable,
}: AttributionLoader): Promise<AttributionContext | null> {
  const sourceKey = parseMacAttributionSourceKey(rawSourceKey);
  if (!sourceKey || books.length === 0) return null;

  try {
    const routes = await readRoutes(sourceKey);
    if (routes.length === 0) return null;

    const linkIds = [...new Set(routes.map((route) => route.linkId).filter(Boolean))];
    const linkEntries = await Promise.all(
      linkIds.map(async (linkId) => [linkId, await readLink(linkId)] as const)
    );
    const links = new Map(
      linkEntries.filter(
        (entry): entry is readonly [string, AmazonAttributionLink] => entry[1] !== null
      )
    );
    const result = resolveAttributionContext({ sourceKey, books, routes, links });

    for (const rejection of result.rejections) {
      onRejected?.(sourceKey, rejection);
    }

    return result.context;
  } catch (error) {
    onUnavailable?.(sourceKey, error);
    return null;
  }
}
