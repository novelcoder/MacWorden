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

const jackAndCocoaWithHistoricalSlug = {
  slug: "jack-and-coke",
  name: "A Jack and Cocoa Mystery",
  series_heading: "Jack and Cocoa Mysteries",
};

void test("normalizes route aliases without regard to case, spaces, or hyphens", () => {
  assert.equal(normalizeRouteAlias("JackAndCoke"), "jackandcoke");
  assert.equal(normalizeRouteAlias("JACK-AND-COKE"), "jackandcoke");
  assert.equal(normalizeRouteAlias("Jack%20and%20Coke"), "jackandcoke");
  assert.equal(normalizeRouteAlias("bad%ZZalias"), "");
});

void test("matches the new series name and historical Jack and Coke aliases", () => {
  for (const alias of [
    "jack-and-coke",
    "JackAndCoke",
    "JACK-AND-COKE",
    "Jack and Coke Mysteries",
    "AJackAndCokeMystery",
    "jack-and-cocoa",
    "JackAndCocoa",
    "Jack and Cocoa Mysteries",
    "AJackAndCocoaMystery",
  ]) {
    assert.equal(seriesMatchesRouteAlias(jackAndCocoaWithHistoricalSlug, alias), true, alias);
  }

  assert.equal(
    seriesMatchesRouteAlias(jackAndCocoaWithHistoricalSlug, "StrayEvidence"),
    false
  );
});

void test("uses the new canonical path despite the stable historical slug", () => {
  assert.equal(seriesCanonicalSegment(jackAndCocoaWithHistoricalSlug), "JackAndCocoa");
  assert.equal(seriesCanonicalPath(jackAndCocoaWithHistoricalSlug), "/JackAndCocoa");
  assert.equal(
    seriesCanonicalPath({ slug: "bitter-lake-mysteries" }),
    "/BitterLakeMysteries"
  );
});

void test("matches flexible book aliases and keeps books in their namespace", () => {
  const book = { slug: "stray-evidence", title: "Stray Evidence" };

  assert.equal(bookMatchesRouteAlias(book, "StrayEvidence"), true);
  assert.equal(bookMatchesRouteAlias(book, "STRAY-EVIDENCE"), true);
  assert.equal(bookMatchesRouteAlias(book, "JackAndCocoa"), false);
  assert.equal(bookCanonicalPath(book), "/books/stray-evidence");
});
