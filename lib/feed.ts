import { renderMarkdown } from "./markdown.ts";
import { SITE_URL } from "./site.ts";
import type { PostRecord } from "./posts-shared.ts";

export function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function cdata(value: string) {
  return value.replaceAll("]]>", "]]]]><![CDATA[>");
}

export async function buildRss(posts: PostRecord[]) {
  const items = await Promise.all(
    posts.map(async (post) => {
      const url = `${SITE_URL}/news/${encodeURIComponent(post.slug)}`;
      const content = await renderMarkdown(post.content_markdown, SITE_URL);
      const categories = [post.category, ...post.tags]
        .filter(Boolean)
        .map((category) => `      <category><![CDATA[${cdata(category)}]]></category>`)
        .join("\n");

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <dc:creator><![CDATA[${cdata(post.author_name)}]]></dc:creator>
      <pubDate>${new Date(post.published_at).toUTCString()}</pubDate>
      <description><![CDATA[${cdata(post.excerpt)}]]></description>
      <content:encoded><![CDATA[${cdata(content)}]]></content:encoded>
${categories}
    </item>`;
    })
  );
  const lastBuildDate = posts[0]?.published_at
    ? new Date(posts[0].published_at).toUTCString()
    : new Date().toUTCString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Mac Worden — News &amp; Notes</title>
    <link>${SITE_URL}/news</link>
    <description>Book news, release updates, and notes from mystery and thriller author Mac Worden.</description>
    <language>en-US</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed" rel="self" type="application/rss+xml" />
${items.join("\n")}
  </channel>
</rss>`;
}
