import assert from "node:assert/strict";
import test from "node:test";

import {
  bookCanonicalPath,
  bookMatchesRouteAlias,
  normalizeRouteAlias,
  seriesCanonicalPath,
  seriesCanonicalSegment,
  seriesMatchesRouteAlias,
} from "../lib/catalog-routing.ts";

const jackAndCoke = {
  slug: "jack-and-coke",
  name: "A Jack and Coke Mystery",
  series_heading: "Jack and Coke Mysteries",
};

void test("normalizes route aliases without regard to case, spaces, or hyphens", () => {
  assert.equal(normalizeRouteAlias("JackAndCoke"), "jackandcoke");
  assert.equal(normalizeRouteAlias("JACK-AND-COKE"), "jackandcoke");
  assert.equal(normalizeRouteAlias("Jack%20and%20Coke"), "jackandcoke");
  assert.equal(normalizeRouteAlias("bad%ZZalias"), "");
});

void test("matches canonical slugs and reader-facing series names flexibly", () => {
  for (const alias of [
    "jack-and-coke",
    "JackAndCoke",
    "JACK-AND-COKE",
    "Jack and Coke Mysteries",
    "AJackAndCokeMystery",
  ]) {
    assert.equal(seriesMatchesRouteAlias(jackAndCoke, alias), true, alias);
  }

  assert.equal(seriesMatchesRouteAlias(jackAndCoke, "StrayEvidence"), false);
});

void test("builds Jamie-style root series paths from stored slugs", () => {
  assert.equal(seriesCanonicalSegment(jackAndCoke), "JackAndCoke");
  assert.equal(seriesCanonicalPath(jackAndCoke), "/JackAndCoke");
  assert.equal(
    seriesCanonicalPath({ slug: "bitter-lake-mysteries" }),
    "/BitterLakeMysteries"
  );
});

void test("matches flexible book aliases and keeps books in their namespace", () => {
  const book = { slug: "stray-evidence", title: "Stray Evidence" };

  assert.equal(bookMatchesRouteAlias(book, "StrayEvidence"), true);
  assert.equal(bookMatchesRouteAlias(book, "STRAY-EVIDENCE"), true);
  assert.equal(bookMatchesRouteAlias(book, "JackAndCoke"), false);
  assert.equal(bookCanonicalPath(book), "/books/stray-evidence");
});
