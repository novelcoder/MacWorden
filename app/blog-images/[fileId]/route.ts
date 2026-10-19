// Blog images live in the shared, private `blog_bucket`, so they are streamed
// through the server with the CMS key rather than linked directly.
const BLOG_BUCKET_ID = "6ab752530015aa3cfd3b";
const fileIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/;

export const dynamic = "force-dynamic";

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await context.params;
  if (!fileIdPattern.test(fileId)) {
    return new Response("Not found", { status: 404 });
  }

  const response = await fetch(
    `${requiredEnv("CMS_ENDPOINT")}/storage/buckets/${BLOG_BUCKET_ID}/files/${encodeURIComponent(fileId)}/view`,
    {
      headers: {
        "X-Appwrite-Project": requiredEnv("CMS_PROJECT_ID"),
        "X-Appwrite-Key": requiredEnv("CMS_API_KEY"),
      },
      cache: "no-store",
    }
  );

  if (response.status === 404) return new Response("Not found", { status: 404 });
  if (!response.ok) return new Response("Unable to load image", { status: 502 });

  const headers = new Headers();
  headers.set("Content-Type", response.headers.get("content-type") || "application/octet-stream");
  headers.set("Cache-Control", "public, max-age=86400, immutable");
  const contentLength = response.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);

  return new Response(response.body, { headers });
}
