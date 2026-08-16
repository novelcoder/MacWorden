import type { Metadata } from "next";
import Link from "next/link";
import styles from "./books.module.css";
import RevealOnScroll from "@/components/RevealOnScroll";
import BookCoverImage from "@/components/BookCoverImage";
import { getSeriesList, getBooksForSeries, type SeriesDoc, type BookDoc } from "@/lib/appwrite";
import { placeholderCover } from "@/lib/placeholderCover";
import { slugifyTitle } from "@/lib/slugify";

export const metadata: Metadata = { title: "The Books" };

const STATUS_LABEL: Record<string, string> = {
  coming_soon: "Coming Soon",
  published: "Available Now",
  best_seller: "Best Seller",
};

function isAvailable(book: BookDoc): boolean {
  return book.status === "published" || book.status === "best_seller";
}

export default async function BooksPage() {
  let seriesWithBooks: { series: SeriesDoc; books: BookDoc[] }[] = [];
  let error: unknown = null;

  try {
    const seriesList = await getSeriesList();
    seriesWithBooks = await Promise.all(
      seriesList.map(async (series) => ({
        series,
        books: await getBooksForSeries(series.$id),
      }))
    );
  } catch (err) {
    error = err;
  }

  if (error) {
    return <BooksLoadError error={error} />;
  }

  return (
    <>
      <section id="books-header" className={styles.booksHero} data-screen-label="The Books">
        <div className={styles.wrap}>
          <p className={styles.eyebrow}>The Complete Shelf</p>
          <h1 className={styles.title}>The Books</h1>
          <p className={styles.subhead}>Every series, every case &mdash; sorted the way Mac wrote them.</p>
        </div>
      </section>

      {seriesWithBooks.length ? (
        seriesWithBooks.map(({ series, books }, idx) => (
          <SeriesSection key={series.$id} series={series} books={books} idx={idx} />
        ))
      ) : (
        <section className={styles.seriesSection}>
          <div className={styles.wrap}>
            <p className={styles.blurb}>No series are listed for this site yet. Check back soon.</p>
          </div>
        </section>
      )}

      <RevealOnScroll />
    </>
  );
}

function SeriesSection({ series, books, idx }: { series: SeriesDoc; books: BookDoc[]; idx: number }) {
  const heading = series.series_heading || series.name || series.slug;
  const number = String(series.display_order ?? idx + 1).padStart(2, "0");
  const available = books.some(isAvailable);

  return (
    <section className={`${styles.seriesSection} reveal`} data-screen-label={heading}>
      <div className={styles.wrap}>
        <div className={styles.seriesHeaderRow}>
          <span className={styles.seriesNum}>{number}</span>
          <h2 className={styles.seriesName}>{heading}</h2>
          <span className={`${styles.badge} ${available ? styles.badgeAvailable : styles.badgeComing}`}>
            {available ? "Out Now" : "Releasing Soon"}
          </span>
        </div>
        {series.name && series.name !== heading && <p className={styles.imprint}>{series.name}</p>}
        {series.card_description && <p className={styles.blurb}>{series.card_description}</p>}

        {books.length ? (
          <div className={styles.grid}>
            {books.map((book) => (
              <BookCover key={book.$id} book={book} series={series} />
            ))}
          </div>
        ) : (
          <p className={styles.blurb}>No books are listed for this series yet.</p>
        )}
      </div>
    </section>
  );
}

function BookCover({ book, series }: { book: BookDoc; series: SeriesDoc }) {
  const fallback = placeholderCover(book.title, series.name);
  const cover = book.cover_url && book.cover_url.length ? book.cover_url : fallback;
  const alt = book.cover_alt || `${book.title} cover`;
  const label = STATUS_LABEL[book.status] ?? book.status;

  return (
    <Link href={`/${slugifyTitle(book.title)}`} className={styles.cover}>
      <div className={styles.coverImageWrap}>
        <BookCoverImage src={cover} fallbackSrc={fallback} alt={alt} />
        {book.status === "coming_soon" && <span className={styles.soonPill}>Soon</span>}
      </div>
      <div className={styles.coverInfo}>
        <div className={styles.coverTitle}>{book.title}</div>
        <div className={styles.coverStatus}>{label}</div>
      </div>
    </Link>
  );
}

function BooksLoadError({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : String(error);
  const hint = /401|not authorized|missing scope/i.test(msg)
    ? "The server could not authenticate with Appwrite. Check that CMS_API_KEY is set and has the databases.read and documents.read scopes."
    : "Check the Appwrite environment variables (endpoint, project ID, database ID, API key) in the server environment.";
  return (
    <section id="books-header" className={styles.booksHero}>
      <div className={styles.wrap}>
        <p className={styles.eyebrow}>The Complete Shelf</p>
        <h1 className={styles.title}>The Books</h1>
        <p className={styles.subhead}>Couldn&rsquo;t load the shelf.</p>
        <p className={styles.errorMsg}>{msg}</p>
        <p className={styles.errorHint}>{hint}</p>
      </div>
    </section>
  );
}
