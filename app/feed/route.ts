import { buildRss } from "@/lib/feed";
import { getPublishedPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export async function GET() {
  const { posts } = await getPublishedPosts({ limit: 20 });
  const rss = await buildRss(posts);

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
