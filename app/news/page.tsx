import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PostCard from "@/components/PostCard";
import { getPublishedPosts } from "@/lib/posts";
import { NEWS_PAGE_SIZE } from "@/lib/posts-shared";
import styles from "./news.module.css";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ page?: string | string[] }>;

function pageNumber(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return 1;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const page = pageNumber((await searchParams).page);
  const canonical = page && page > 1 ? `/news?page=${page}` : "/news";
  const pageLabel = page && page > 1 ? ` — Page ${page}` : "";
  const description =
    "Book news, release updates, and behind-the-scenes notes from mystery and thriller author Mac Worden.";

  return {
    title: `News & Notes${pageLabel}`,
    description,
    alternates: { canonical, types: { "application/rss+xml": "/feed" } },
    openGraph: { title: `News & Notes${pageLabel}`, description, type: "website", url: canonical },
  };
}

export default async function NewsPage({ searchParams }: { searchParams: SearchParams }) {
  const page = pageNumber((await searchParams).page);
  if (page === null) notFound();

  const { posts, total } = await getPublishedPosts({
    limit: NEWS_PAGE_SIZE,
    offset: (page - 1) * NEWS_PAGE_SIZE,
  });
  const pageCount = Math.max(1, Math.ceil(total / NEWS_PAGE_SIZE));
  if (page > pageCount) notFound();

  return (
    <main className={styles.page} data-screen-label="News & Notes">
      <div className={styles.wrap}>
        <p className={styles.eyebrow}>From Mac&rsquo;s Desk</p>
        <h1 className={styles.title}>News &amp; Notes</h1>
        <p className={styles.subhead}>
          New releases, works in progress, and the stories behind the stories.
        </p>

        {posts.length === 0 ? (
          <p className={styles.empty}>Nothing here yet. Check back soon.</p>
        ) : (
          <div className={styles.grid}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {pageCount > 1 ? (
          <nav className={styles.pagination} aria-label="News archive pages">
            {page > 1 ? (
              <Link href={page === 2 ? "/news" : `/news?page=${page - 1}`}>Newer posts</Link>
            ) : (
              <span />
            )}
            <span>
              Page {page} of {pageCount}
            </span>
            {page < pageCount ? (
              <Link href={`/news?page=${page + 1}`}>Older posts</Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </div>
    </main>
  );
}
