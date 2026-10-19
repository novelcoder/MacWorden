import assert from "node:assert/strict";
import test from "node:test";

import { buildRss, escapeXml } from "../lib/feed.ts";
import {
  blogImagePath,
  formatPostDate,
  postUrl,
  publishedPostVisibilityQueries,
  type PostRecord,
} from "../lib/posts-shared.ts";
import { newsSitemapEntries } from "../lib/sitemap-entries.ts";

const SITE_ID = "6a50421f00049e6726ae";

function post(overrides: Partial<PostRecord> = {}): PostRecord {
  return {
    id: "post-1",
    title: "Ships & Coffee",
    slug: "ships-and-coffee",
    excerpt: "A short update.",
    content_markdown: "Hello ![Cover](/blog-images/img-1).",
    published_at: "2026-06-01T17:34:35.000+00:00",
    author_name: "Mac Worden",
    category: "Book News",
    tags: ["writing"],
    hero_image_id: "img-1",
    hero_image_alt: "A cover",
    hero_image_caption: "",
    seo_title: "",
    seo_description: "",
    updated_at: "2026-06-02T10:00:00.000+00:00",
    ...overrides,
  };
}

void test("post helpers produce canonical internal paths", () => {
  assert.equal(postUrl("big-news"), "/news/big-news");
  assert.equal(blogImagePath("img-1"), "/blog-images/img-1");
  assert.equal(blogImagePath(""), "");
});

void test("formatPostDate uses a stable UTC calendar date", () => {
  assert.equal(formatPostDate("2026-04-13T00:08:26.000+00:00"), "April 13, 2026");
  assert.equal(formatPostDate("not a date"), "");
});

void test("published post queries require this site, approval and an arrived timestamp", () => {
  const now = new Date("2026-10-03T17:00:00.000Z");
  const queries = publishedPostVisibilityQueries(SITE_ID, now).map((query) => JSON.parse(query));

  assert.deepEqual(queries, [
    { method: "equal", attribute: "sites", values: [SITE_ID] },
    { method: "equal", attribute: "status", values: ["published"] },
    { method: "lessThanEqual", attribute: "published_at", values: ["2026-10-03T17:00:00.000Z"] },
  ]);
});

void test("escapeXml escapes XML special characters", () => {
  assert.equal(escapeXml(`A & B < C > D "E" 'F'`), "A &amp; B &lt; C &gt; D &quot;E&quot; &apos;F&apos;");
});

void test("buildRss emits Mac Worden URLs, full content and absolute media URLs", async () => {
  const rss = await buildRss([post()]);

  assert.match(rss, /<title>Mac Worden — News &amp; Notes<\/title>/);
  assert.match(rss, /<title>Ships &amp; Coffee<\/title>/);
  assert.match(rss, /https:\/\/www\.macworden\.com\/news\/ships-and-coffee/);
  assert.match(rss, /https:\/\/www\.macworden\.com\/blog-images\/img-1/);
  assert.match(rss, /<category><!\[CDATA\[Book News\]\]><\/category>/);
  assert.doesNotMatch(rss, /jamiemcfarlane/);
});

void test("news sitemap entries are empty until there are posts", () => {
  assert.deepEqual(newsSitemapEntries("https://www.macworden.com", []), []);

  const entries = newsSitemapEntries("https://www.macworden.com", [post()]);
  assert.deepEqual(
    entries.map((entry) => entry.url),
    ["https://www.macworden.com/news", "https://www.macworden.com/news/ships-and-coffee"]
  );
});
