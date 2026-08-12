import { notFound, redirect } from "next/navigation";
import { getAllBooks, getSeriesById } from "@/lib/appwrite";
import { slugifyTitle } from "@/lib/slugify";

export default async function BookShortcutPage({
  params,
}: {
  params: Promise<{ bookSlug: string }>;
}) {
  const { bookSlug } = await params;

  if (bookSlug.includes(".")) {
    notFound();
  }

  const target = slugifyTitle(decodeURIComponent(bookSlug));

  const books = await getAllBooks().catch(() => []);
  const book = books.find((b) => slugifyTitle(b.title) === target);
  if (!book) {
    notFound();
  }

  const series = await getSeriesById(book.series_id);
  if (!series) {
    notFound();
  }

  redirect(`/series/${series.slug}#book-${slugifyTitle(book.title)}`);
}
