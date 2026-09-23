import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import styles from "@/app/series/[slug]/series.module.css";
import { BookDetailRow } from "@/components/SeriesDetailPage";
import RevealOnScroll from "@/components/RevealOnScroll";
import { getMacAttributionContext } from "@/lib/attribution";
import { ATTRIBUTION_QUERY_PARAM, withAttribution } from "@/lib/attribution-routing";
import {
  getSeriesCatalog,
  type BookDoc,
  type SeriesCatalogEntry,
} from "@/lib/appwrite";
import {
  bookCanonicalPath,
  bookMatchesRouteAlias,
  seriesCanonicalPath,
} from "@/lib/catalog-routing";
import { SITE_URL } from "@/lib/site";

type BookPageProps = {
  params: Promise<{ bookSlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

type BookMatch = {
  entry: SeriesCatalogEntry;
  book: BookDoc;
};

function matchingBooks(catalog: SeriesCatalogEntry[], requestedAlias: string): BookMatch[] {
  return catalog.flatMap((entry) =>
    entry.books
      .filter((book) => bookMatchesRouteAlias(book, requestedAlias))
      .map((book) => ({ entry, book }))
  );
}

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const { bookSlug } = await params;

  try {
    const catalog = await getSeriesCatalog();
    const matches = matchingBooks(catalog, bookSlug);
    if (matches.length !== 1) return {};

    const { book, entry } = matches[0];
    const description = book.card_description || book.tagline || book.blurb;
    const canonical = `${SITE_URL}${bookCanonicalPath(book)}`;

    return {
      title: book.title,
      description,
      alternates: { canonical },
      openGraph: {
        type: "book",
        title: book.title,
        description,
        url: canonical,
        images: book.cover_url
          ? [{ url: book.cover_url, alt: book.cover_alt || `${book.title} cover` }]
          : undefined,
      },
      other: {
        "book:series": entry.series.series_heading || entry.series.name || entry.series.slug,
      },
    };
  } catch {
    return {};
  }
}

export default async function BookPage({ params, searchParams }: BookPageProps) {
  const { bookSlug } = await params;

  let catalog: SeriesCatalogEntry[];
  try {
    catalog = await getSeriesCatalog();
  } catch (error) {
    return <BookLoadError error={error} />;
  }

  const matches = matchingBooks(catalog, bookSlug);
  if (matches.length !== 1) notFound();

  const { entry, book } = matches[0];
  const query = await searchParams;
  const attribution = await getMacAttributionContext(
    query[ATTRIBUTION_QUERY_PARAM],
    catalog.flatMap(({ books }) => books)
  );
  const attributedPath = (path: string) =>
    withAttribution(path, attribution?.sourceKey ?? null);

  if (bookSlug !== book.slug) {
    permanentRedirect(attributedPath(bookCanonicalPath(book)));
  }

  const series = entry.series;
  const seriesName = series.series_heading || series.name || series.slug;
  const bookIndex = entry.books.findIndex(({ $id }) => $id === book.$id);

  return (
    <>
      <section className={styles.seriesHeader} data-screen-label="Book Header">
        <div className={styles.wrap}>
          <div className={styles.crumbs}>
            <Link href={attributedPath("/")}>Home</Link>
            <span className={styles.sep}>/</span>
            <Link href={attributedPath("/books")}>Books</Link>
            <span className={styles.sep}>/</span>
            <Link href={attributedPath(seriesCanonicalPath(series))}>{seriesName}</Link>
          </div>
          <p className={styles.seriesEyebrow}>{seriesName}</p>
          <h1 className={styles.seriesTitle}>{book.title}</h1>
          <p className={styles.seriesIntro}>
            {book.series_number != null
              ? `Book ${book.series_number} in ${seriesName}`
              : `A ${seriesName} story`}
          </p>
        </div>
      </section>

      <section className={styles.books} data-screen-label="Book Details">
        <div className={styles.wrap}>
          <p className={styles.booksLabel}>Book Details</p>
          <BookDetailRow
            book={book}
            idx={Math.max(bookIndex, 0)}
            listId={`book_${book.$id}`}
            listName={`${book.title} details`}
            seriesName={seriesName}
            attribution={attribution}
          />
        </div>
      </section>

      <RevealOnScroll />
    </>
  );
}

function BookLoadError({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    <section className={styles.seriesHeader}>
      <div className={styles.wrap}>
        <div className={styles.empty}>
          <h2>Couldn&rsquo;t Load Book</h2>
          <p>{message}</p>
        </div>
      </div>
    </section>
  );
}
