import { Query } from "node-appwrite";

export const NEWS_PAGE_SIZE = 12;

export type PostRecord = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content_markdown: string;
  published_at: string;
  author_name: string;
  category: string;
  tags: string[];
  hero_image_id: string;
  hero_image_alt: string;
  hero_image_caption: string;
  seo_title: string;
  seo_description: string;
  updated_at: string;
};

/**
 * The `posts` table is shared with other author sites, so a post is only
 * visible here when its `sites` relation points at this site. A row with no
 * `sites` value is hidden everywhere.
 */
export function publishedPostVisibilityQueries(siteId: string, now = new Date()) {
  return [
    Query.equal("sites", [siteId]),
    Query.equal("status", ["published"]),
    Query.lessThanEqual("published_at", now.toISOString()),
  ];
}

export function blogImagePath(fileId: string) {
  return fileId ? `/blog-images/${encodeURIComponent(fileId)}` : "";
}

export function postUrl(slug: string) {
  return `/news/${encodeURIComponent(slug)}`;
}

/** Uses the UTC calendar date so a stored timestamp always shows the same day. */
export function formatPostDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
