import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { AMAZON_ASSOCIATE_DISCLOSURE } from "../lib/affiliate-disclosure.ts";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

void test("uses Amazon's required Associates wording verbatim", () => {
  assert.equal(
    AMAZON_ASSOCIATE_DISCLOSURE,
    "As an Amazon Associate I earn from qualifying purchases."
  );
});

void test("the site footer shows the disclosure on every page", () => {
  assert.match(source("components/SiteFooter.tsx"), /\{AMAZON_ASSOCIATE_DISCLOSURE\}/);
});

void test("book buy buttons and the homepage retailer button carry the disclosure", () => {
  assert.match(
    source("components/SeriesDetailPage.tsx"),
    /<\/a>\s*<p className=\{styles\.affiliateNote\}>\{AMAZON_ASSOCIATE_DISCLOSURE\}<\/p>/
  );
  assert.match(
    source("app/page.tsx"),
    /heroPurchaseUrl \? \(\s*<p className="book-meta-disclosure">\{AMAZON_ASSOCIATE_DISCLOSURE\}/
  );
});
