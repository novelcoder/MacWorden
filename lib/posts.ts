import "server-only";
import { cache } from "react";
import { Query, type Models } from "node-appwrite";
import { getCmsDatabaseId, getCmsSiteId, getTablesDatabase } from "@/lib/appwrite";
import {
  NEWS_PAGE_SIZE,
  publishedPostVisibilityQueries,
  type PostRecord,
} from "@/lib/posts-shared";

const POSTS_TABLE = "posts";
const ALL_POSTS_PAGE_SIZE = 100;
const MAX_ALL_POSTS_PAGES = 20;

type PostRow = Models.Row & Record<string, unknown>;

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asPost(row: PostRow): PostRecord {
  return {
    id: row.$id,
    title: stringValue(row.title),
    slug: stringValue(row.slug),
    excerpt: stringValue(row.excerpt),
    content_markdown: stringValue(row.content_markdown),
    published_at: stringValue(row.published_at),
    author_name: stringValue(row.author_name, "Mac Worden"),
    category: stringValue(row.category),
    tags: stringArray(row.tags),
    hero_image_id: stringValue(row.hero_image_id),
    hero_image_alt: stringValue(row.hero_image_alt),
    hero_image_caption: stringValue(row.hero_image_caption),
    seo_title: stringValue(row.seo_title),
    seo_description: stringValue(row.seo_description),
    updated_at: stringValue(row.$updatedAt),
  };
}

async function listPosts(queries: string[]) {
  return getTablesDatabase().listRows<PostRow>({
    databaseId: getCmsDatabaseId(),
    tableId: POSTS_TABLE,
    queries: [...publishedPostVisibilityQueries(getCmsSiteId()), ...queries],
  });
}

export async function getPublishedPosts({
  limit = NEWS_PAGE_SIZE,
  offset = 0,
}: { limit?: number; offset?: number } = {}) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), ALL_POSTS_PAGE_SIZE);
  const safeOffset = Math.max(Math.trunc(offset), 0);
  const result = await listPosts([
    Query.orderDesc("published_at"),
    Query.limit(safeLimit),
    ...(safeOffset > 0 ? [Query.offset(safeOffset)] : []),
  ]);

  return { total: result.total, posts: result.rows.map(asPost) };
}

export const getPublishedPost = cache(async (slug: string) => {
  const result = await listPosts([Query.equal("slug", [slug]), Query.limit(1)]);
  return result.rows[0] ? asPost(result.rows[0]) : null;
});

export async function getAllPublishedPosts() {
  const posts: PostRecord[] = [];
  let total = 0;

  for (let page = 0; page < MAX_ALL_POSTS_PAGES; page++) {
    const result = await getPublishedPosts({
      limit: ALL_POSTS_PAGE_SIZE,
      offset: posts.length,
    });
    total = result.total;
    posts.push(...result.posts);
    if (result.posts.length === 0 || posts.length >= total) return posts;
  }

  throw new Error(
    `There are more than ${MAX_ALL_POSTS_PAGES * ALL_POSTS_PAGE_SIZE} published posts; raise MAX_ALL_POSTS_PAGES.`
  );
}
