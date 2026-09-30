import assert from "node:assert/strict";
import test from "node:test";

import {
  bookStatusDisplay,
  formatReleaseTiming,
  isAvailableStatus,
  isUpcomingStatus,
  isVisibleBookStatus,
  VISIBLE_BOOK_STATUSES,
} from "../lib/book-status.ts";
import { catalogSitemapEntries } from "../lib/sitemap-entries.ts";

const NOW = new Date("2026-09-30T12:00:00Z");

void test("preorder books get their own label, CTA and pill and count as upcoming", () => {
  assert.deepEqual(bookStatusDisplay("preorder"), {
    label: "Preorder Now",
    cta: "Preorder now",
    pill: "Preorder",
    coming: true,
  });
  assert.equal(isUpcomingStatus("preorder"), true);
  assert.equal(isAvailableStatus("preorder"), false);
});

void test("existing statuses keep their labels and CTAs", () => {
  assert.equal(bookStatusDisplay("coming_soon").label, "Coming Soon");
  assert.equal(bookStatusDisplay("coming_soon").cta, "Pre-order");
  assert.equal(bookStatusDisplay("coming_soon").pill, "Soon");
  assert.equal(bookStatusDisplay("coming_soon").coming, true);
  assert.equal(bookStatusDisplay("published").label, "Available Now");
  assert.equal(bookStatusDisplay("published").cta, "Buy the Book");
  assert.equal(bookStatusDisplay("best_seller").label, "Best Seller");
  assert.equal(isAvailableStatus("published"), true);
  assert.equal(isAvailableStatus("best_seller"), true);
  assert.equal(isUpcomingStatus("published"), false);
});

void test("only known, non-draft statuses are visible", () => {
  assert.deepEqual([...VISIBLE_BOOK_STATUSES].sort(), [
    "best_seller",
    "coming_soon",
    "preorder",
    "published",
  ]);
  assert.equal(isVisibleBookStatus("draft"), false);
  assert.equal(isVisibleBookStatus("some_future_status"), false);
  assert.equal(bookStatusDisplay("draft").coming, false);
});

void test("preorder release timing names the release date", () => {
  assert.equal(
    formatReleaseTiming("preorder", "2026-11-14T00:00:00.000+00:00", NOW),
    "Releases November 14, 2026"
  );
  assert.equal(formatReleaseTiming("preorder", null, NOW), null);
  assert.equal(formatReleaseTiming("preorder", "2026-01-01T00:00:00Z", NOW), null);
});

void test("coming-soon release timing is unchanged", () => {
  assert.equal(formatReleaseTiming("coming_soon", null, NOW), "Coming soon");
  assert.equal(
    formatReleaseTiming("coming_soon", "2027-01-01T06:00:00.000+00:00", NOW),
    "Coming early next year"
  );
  assert.equal(formatReleaseTiming("coming_soon", "2026-12-01T00:00:00Z", NOW), "Coming December 2026");
  assert.equal(formatReleaseTiming("published", "2027-01-01T00:00:00Z", NOW), null);
});

void test("sitemap includes preorder books and excludes drafts", () => {
  const entries = catalogSitemapEntries("https://www.macworden.com", [
    {
      series: { slug: "jack-and-cocoa", name: "Jack and Cocoa Mysteries" },
      books: [
        { slug: "stray-evidence", title: "Stray Evidence", status: "preorder" },
        { slug: "dead-air-at-bitter-lake", title: "Dead Air at Bitter Lake", status: "coming_soon" },
        { slug: "secret-draft", title: "Secret Draft", status: "draft" },
      ],
    },
  ]);
  const urls = entries.map(({ url }) => url);

  assert.ok(urls.includes("https://www.macworden.com/JackAndCocoa"));
  assert.ok(urls.includes("https://www.macworden.com/books/stray-evidence"));
  assert.ok(urls.includes("https://www.macworden.com/books/dead-air-at-bitter-lake"));
  assert.ok(!urls.some((url) => url.includes("secret-draft")));
});
