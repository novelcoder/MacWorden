import Image from "next/image";
import Link from "next/link";
import { blogImagePath, formatPostDate, postUrl, type PostRecord } from "@/lib/posts-shared";
import styles from "./PostCard.module.css";

export default function PostCard({ post }: { post: PostRecord }) {
  return (
    <article className={styles.card}>
      {post.hero_image_id ? (
        <Link className={styles.image} href={postUrl(post.slug)} tabIndex={-1} aria-hidden="true">
          <Image
            src={blogImagePath(post.hero_image_id)}
            alt=""
            fill
            sizes="(max-width: 760px) 100vw, 33vw"
          />
        </Link>
      ) : (
        <div className={styles.textOnly} aria-hidden="true">
          <span>News &amp; Notes</span>
        </div>
      )}
      <div className={styles.body}>
        <p className={styles.meta}>
          {post.category ? <span>{post.category}</span> : null}
          <time dateTime={post.published_at}>{formatPostDate(post.published_at)}</time>
        </p>
        <h2>
          <Link href={postUrl(post.slug)}>{post.title}</Link>
        </h2>
        {post.excerpt ? <p className={styles.excerpt}>{post.excerpt}</p> : null}
        <Link className={styles.readMore} href={postUrl(post.slug)}>
          Read the story &rarr;
        </Link>
      </div>
    </article>
  );
}
