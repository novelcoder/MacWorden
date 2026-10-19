import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { renderMarkdown } from "@/lib/markdown";
import { getPublishedPost } from "@/lib/posts";
import { blogImagePath, formatPostDate, postUrl } from "@/lib/posts-shared";
import { SITE_URL } from "@/lib/site";
import styles from "./post.module.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const requestedSlug = decodeURIComponent((await params).slug);
  const post = await getPublishedPost(requestedSlug);
  if (!post) return {};

  const canonical = postUrl(post.slug);
  const image = post.hero_image_id ? blogImagePath(post.hero_image_id) : undefined;
  const title = post.seo_title || post.title;
  const description = post.seo_description || post.excerpt;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonical,
      publishedTime: post.published_at,
      modifiedTime: post.updated_at || post.published_at,
      authors: [post.author_name],
      tags: [post.category, ...post.tags].filter(Boolean),
      ...(image ? { images: [{ url: image, alt: post.hero_image_alt }] } : {}),
    },
  };
}

export default async function PostPage({ params }: Props) {
  const requestedSlug = decodeURIComponent((await params).slug);
  const post = await getPublishedPost(requestedSlug);
  if (!post) notFound();
  if (requestedSlug !== post.slug) permanentRedirect(postUrl(post.slug));

  const html = await renderMarkdown(post.content_markdown);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    author: { "@type": "Person", name: post.author_name, url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}${postUrl(post.slug)}`,
    ...(post.hero_image_id ? { image: `${SITE_URL}${blogImagePath(post.hero_image_id)}` } : {}),
  };

  return (
    <main className={styles.page}>
      <article className={styles.wrap}>
        <Link className={styles.back} href="/news">
          &larr; News &amp; Notes
        </Link>
        {post.category ? <p className={styles.category}>{post.category}</p> : null}
        <h1 className={styles.title}>{post.title}</h1>
        <p className={styles.byline}>
          By {post.author_name} &middot;{" "}
          <time dateTime={post.published_at}>{formatPostDate(post.published_at)}</time>
        </p>

        {post.hero_image_id ? (
          <figure className={styles.hero}>
            <div className={styles.heroImage}>
              <Image
                src={blogImagePath(post.hero_image_id)}
                alt={post.hero_image_alt}
                fill
                priority
                sizes="(max-width: 800px) 100vw, 760px"
              />
            </div>
            {post.hero_image_caption ? <figcaption>{post.hero_image_caption}</figcaption> : null}
          </figure>
        ) : null}

        <div className={styles.content} dangerouslySetInnerHTML={{ __html: html }} />
      </article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
