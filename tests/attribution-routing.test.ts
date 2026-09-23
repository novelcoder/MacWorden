import assert from "node:assert/strict";
import test from "node:test";

import {
  type AmazonAttributionLink,
  type AttributionBook,
  type AttributionRoute,
  isValidAmazonAttributionUrl,
  isValidAmazonClickThroughUrl,
  loadAttributionContext,
  parseAttributionSourceKey,
  parseMacAttributionSourceKey,
  resolveAttributionContext,
  selectPurchaseUrl,
  sourceKeyFromSearchParams,
  withAttribution,
} from "../lib/attribution-routing.ts";

const sourceKey = "gads_mw_jc_b1_2026_09";
const asin = "B0HDSBZF14";
const publicStoreUrl = "https://fickledragon.com/stray-evidence-amazon";
const attributionUrl =
  "https://www.amazon.com/dp/B0HDSBZF14?maas=maas_adg_EXAMPLE_afap_abs&ref_=aa_maas&tag=maas";

const book: AttributionBook = {
  id: "6a0b757e000272a91235",
  slug: "stray-evidence",
  kindleAsin: asin,
  publicStoreUrl,
};

const route: AttributionRoute = {
  id: "gads_mw_preorders_2026_09_se",
  sourceKey,
  bookSlug: book.slug,
  linkId: "gads_mw_preorders_2026_09_se",
  enabled: true,
};

const link: AmazonAttributionLink = {
  id: route.linkId,
  bookId: book.id,
  kindleAsin: asin,
  attributionUrl,
  clickThroughUrl: `https://www.amazon.com/dp/${asin}`,
  status: "active",
};

function resolve({
  books = [book],
  routes = [route],
  links = [link],
}: {
  books?: AttributionBook[];
  routes?: AttributionRoute[];
  links?: AmazonAttributionLink[];
} = {}) {
  return resolveAttributionContext({
    sourceKey,
    books,
    routes,
    links: new Map(links.map((candidate) => [candidate.id, candidate])),
  });
}

void test("accepts one exact conservative source key and rejects malformed or duplicate values", () => {
  assert.equal(parseAttributionSourceKey(sourceKey), sourceKey);
  assert.equal(parseAttributionSourceKey(undefined), null);
  assert.equal(parseAttributionSourceKey([sourceKey]), null);
  assert.equal(parseAttributionSourceKey(" GADS_mw_jc_b1 "), null);
  assert.equal(parseAttributionSourceKey("gads-mw-jc-b1"), null);
  assert.equal(parseMacAttributionSourceKey(sourceKey), sourceKey);
  assert.equal(parseMacAttributionSourceKey("gads_sm_b1_2026_09"), null);

  assert.equal(sourceKeyFromSearchParams(new URLSearchParams(`source_key=${sourceKey}`)), sourceKey);
  assert.equal(
    sourceKeyFromSearchParams(
      new URLSearchParams(`source_key=${sourceKey}&source_key=gads_mw_spoofed`)
    ),
    null
  );
});

void test("propagates only source_key across clean internal paths", () => {
  assert.equal(
    withAttribution("/JackAndCoke", sourceKey),
    `/JackAndCoke?source_key=${sourceKey}`
  );
  assert.equal(
    withAttribution("/books/stray-evidence#purchase", sourceKey),
    `/books/stray-evidence?source_key=${sourceKey}#purchase`
  );
  assert.equal(withAttribution("/series", null), "/series");
  assert.equal(
    withAttribution("https://www.amazon.com/dp/B0HDSBZF14", sourceKey),
    "https://www.amazon.com/dp/B0HDSBZF14"
  );
});

void test("validates clean click-through and exact Amazon Attribution URL shapes", () => {
  assert.equal(isValidAmazonClickThroughUrl(`https://www.amazon.com/dp/${asin}`, asin), true);
  assert.equal(
    isValidAmazonClickThroughUrl(`https://www.amazon.com/dp/${asin}?gclid=test`, asin),
    false
  );
  assert.equal(isValidAmazonAttributionUrl(attributionUrl, asin), true);
  assert.equal(isValidAmazonAttributionUrl(`${attributionUrl}&gclid=test`, asin), false);
  assert.equal(isValidAmazonAttributionUrl(`${attributionUrl}&utm_source=google`, asin), false);
  assert.equal(
    isValidAmazonAttributionUrl(attributionUrl.replace("tag=maas", "tag=associates-20"), asin),
    false
  );
  assert.equal(
    isValidAmazonAttributionUrl(attributionUrl.replace(asin, "B0HF15JCGJ"), asin),
    false
  );
});

void test("resolves a valid Mac route and falls back when attribution is absent or invalid", () => {
  const result = resolve();
  assert.deepEqual(result.rejections, []);
  assert.deepEqual(result.context, {
    sourceKey,
    purchaseUrls: { [book.id]: attributionUrl },
  });
  assert.equal(
    selectPurchaseUrl({
      publicStoreUrl,
      attributionUrl: result.context?.purchaseUrls[book.id],
      expectedAsin: asin,
    }),
    attributionUrl
  );
  assert.equal(selectPurchaseUrl({ publicStoreUrl, expectedAsin: asin }), publicStoreUrl);
  assert.equal(
    selectPurchaseUrl({
      publicStoreUrl,
      attributionUrl: "https://example.com/not-amazon",
      expectedAsin: asin,
    }),
    publicStoreUrl
  );
});

void test("fails closed for disabled, unknown, missing, and duplicate mappings", async (t) => {
  await t.test("disabled route", () => {
    const result = resolve({ routes: [{ ...route, enabled: false }] });
    assert.equal(result.context, null);
    assert.equal(result.rejections[0]?.reason, "disabled_route");
  });

  await t.test("unknown book", () => {
    const result = resolve({ routes: [{ ...route, bookSlug: "unknown-book" }] });
    assert.equal(result.context, null);
    assert.equal(result.rejections[0]?.reason, "missing_book");
  });

  await t.test("missing link", () => {
    const result = resolve({ links: [] });
    assert.equal(result.context, null);
    assert.equal(result.rejections[0]?.reason, "missing_link");
  });

  await t.test("duplicate route", () => {
    const result = resolve({ routes: [route, { ...route, id: "duplicate-route" }] });
    assert.equal(result.context, null);
    assert.ok(result.rejections.every(({ reason }) => reason === "duplicate_route"));
  });
});

void test("fails closed for book, ASIN, URL, and status mismatches", async (t) => {
  const cases: Array<[string, AmazonAttributionLink, string]> = [
    ["book ID", { ...link, bookId: "jamie-book-id" }, "book_mismatch"],
    ["ASIN", { ...link, kindleAsin: "B0HF15JCGJ" }, "asin_mismatch"],
    [
      "click-through URL",
      { ...link, clickThroughUrl: "https://www.amazon.com/dp/B0HF15JCGJ" },
      "invalid_click_through_url",
    ],
    [
      "Attribution URL",
      { ...link, attributionUrl: "https://example.com/not-amazon" },
      "invalid_attribution_url",
    ],
    ["status", { ...link, status: "inactive" }, "inactive_link"],
  ];

  for (const [label, mismatchedLink, expectedReason] of cases) {
    await t.test(label, () => {
      const result = resolve({ links: [mismatchedLink] });
      assert.equal(result.context, null);
      assert.equal(result.rejections[0]?.reason, expectedReason);
    });
  }
});

void test("does not resolve a Jamie mapping against the Mac catalog", () => {
  const jamieRoute = {
    ...route,
    id: "gads_sm_b1_2026_09_b1",
    sourceKey: "gads_sm_b1_2026_09",
    bookSlug: "boltguns-and-duct-tape",
    linkId: "gads_sm_b1_2026_09_b1",
  };
  const jamieLink = {
    ...link,
    id: jamieRoute.linkId,
    bookId: "boltguns-and-duct-tape",
    kindleAsin: "B0FQG1S63H",
    clickThroughUrl: "https://www.amazon.com/dp/B0FQG1S63H",
    attributionUrl:
      "https://www.amazon.com/dp/B0FQG1S63H?maas=maas_adg_EXAMPLE_afap_abs&ref_=aa_maas&tag=maas",
  };

  const result = resolveAttributionContext({
    sourceKey: jamieRoute.sourceKey,
    books: [book],
    routes: [jamieRoute],
    links: new Map([[jamieLink.id, jamieLink]]),
  });
  assert.equal(result.context, null);
  assert.equal(result.rejections[0]?.reason, "missing_book");
});

void test("returns public fallback when routes are unknown or Appwrite is unavailable", async () => {
  let unavailableSource: string | null = null;
  const unknown = await loadAttributionContext({
    rawSourceKey: "gads_mw_unknown_2026_09",
    books: [book],
    readRoutes: async () => [],
    readLink: async () => link,
  });
  assert.equal(unknown, null);

  const unavailable = await loadAttributionContext({
    rawSourceKey: sourceKey,
    books: [book],
    readRoutes: async () => {
      throw new Error("Appwrite unavailable");
    },
    readLink: async () => link,
    onUnavailable: (failedSource) => {
      unavailableSource = failedSource;
    },
  });
  assert.equal(unavailable, null);
  assert.equal(unavailableSource, sourceKey);
  assert.equal(selectPurchaseUrl({ publicStoreUrl, expectedAsin: asin }), publicStoreUrl);
});
