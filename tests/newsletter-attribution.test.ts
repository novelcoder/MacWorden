import assert from "node:assert/strict";
import test from "node:test";

import {
  NEWSLETTER_ATTRIBUTION_STORAGE_KEY,
  captureNewsletterSourceKey,
  getNewsletterSignupContext,
  normalizeNewsletterSourceKey,
} from "../lib/newsletterAttribution.ts";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function visit(url: string, storage: MemoryStorage) {
  const { pathname, search } = new URL(url, "https://macworden.com");
  Object.assign(globalThis, { window: { location: { pathname, search }, sessionStorage: storage } });
  captureNewsletterSourceKey();
}

const key = "gads_mw_jc_b1_2026_09";

test("source_key survives internal navigation in the same tab", () => {
  const storage = new MemoryStorage();
  visit(`/?source_key=${key}&gclid=abc`, storage);
  visit("/series/jack-and-cocoa", storage);
  visit("/books/stray-evidence", storage);

  assert.deepEqual(getNewsletterSignupContext(), {
    source_key: key,
    signup_path: "/books/stray-evidence",
  });
  assert.equal(storage.getItem(NEWSLETTER_ATTRIBUTION_STORAGE_KEY), key);
});

test("a new tab without a source sends only the path", () => {
  visit("/", new MemoryStorage());
  assert.deepEqual(getNewsletterSignupContext(), { signup_path: "/" });
});

test("duplicate, malformed and other-brand keys are not kept", () => {
  for (const search of [
    `?source_key=${key}&source_key=${key}`,
    "?source_key=GADS_MW",
    "?source_key=gads_sm_b1_2026_09",
  ]) {
    const storage = new MemoryStorage();
    visit(`/${search}`, storage);
    assert.equal(storage.getItem(NEWSLETTER_ATTRIBUTION_STORAGE_KEY), null, search);
    assert.equal(getNewsletterSignupContext().source_key, undefined, search);
  }
});

test("Mac source keys require the mw brand segment", () => {
  assert.equal(normalizeNewsletterSourceKey(key), key);
  assert.equal(normalizeNewsletterSourceKey("gads_sm_b1_2026_09"), undefined);
  assert.equal(normalizeNewsletterSourceKey(null), undefined);
});
