# News publishing

News posts are rows in the shared Appwrite `posts` table (database `Author Websites`),
edited directly in the Appwrite console. The table is shared with jamiemcfarlane.com, so
each row says which site it belongs to.

A post is visible on macworden.com only when all three are true:

- `sites` is set to the macworden.com row (`6a50421f00049e6726ae`, the same value as
  `CMS_SITE_ID`). A row with `sites` blank is hidden on every site.
- `status` is `published`.
- `published_at` is at or before the current time.

To schedule a post, set `status` to `published` and `published_at` to a future ISO 8601
timestamp with an explicit timezone (for example `2026-10-22T09:00:00-05:00`). It appears
on the next request after that moment; no cron job or redeploy is needed. The RSS feed has
a five-minute public cache, and the sitemap is rebuilt hourly, so both can lag a scheduled
post slightly.

Other fields:

- `content_markdown` is rendered as sanitized Markdown (GFM, images, YouTube/Vimeo embeds).
- `category` is free text and only a label; there are no category pages.
- `hero_image_id` is a file id in the shared `blog_bucket` (`6ab752530015aa3cfd3b`). Images
  are served through `/blog-images/[fileId]`, so the bucket stays private.
- The displayed date uses the UTC calendar date.
