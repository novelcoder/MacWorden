import type { Metadata } from "next";
import Link from "next/link";
import styles from "./series.module.css";
import RevealOnScroll from "@/components/RevealOnScroll";
import ScrollToHash from "@/components/ScrollToHash";
import BookCoverImage from "@/components/BookCoverImage";
import { getSeriesBySlug, getBooksForSeries, type BookDoc } from "@/lib/appwrite";
import { placeholderCover } from "@/lib/placeholderCover";
import { slugifyTitle } from "@/lib/slugify";

const STATUS_MAP: Record<string, { label: string; cta: string; coming: boolean }> = {
  coming_soon: { label: "Coming Soon", cta: "Pre-order", coming: true },
  published: { label: "Available Now", cta: "Buy the Book", coming: false },
  best_seller: { label: "Best Seller", cta: "Buy the Book", coming: false },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const series = await getSeriesBySlug(slug);
    if (!series) return {};
    return { title: series.series_heading || series.name || slug };
  } catch {
    return {};
  }
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let series;
  try {
    series = await getSeriesBySlug(slug);
  } catch (err) {
    return <SeriesLoadError error={err} />;
  }

  if (!series) {
    return <SeriesNotFound slug={slug} />;
  }

  let books: BookDoc[];
  try {
    books = await getBooksForSeries(series.$id);
  } catch (err) {
    return <SeriesLoadError error={err} />;
  }

  const available = books.filter((b) => b.status === "published" || b.status === "best_seller").length;
  const coming = books.filter((b) => b.status === "coming_soon").length;
  const heading = series.series_heading || series.name || slug;

  return (
    <>
      <section id="series-header" className={styles.seriesHeader} data-screen-label="Series Header">
        <div className={styles.wrap}>
          <div className={styles.crumbs}>
            <Link href="/">Home</Link>
            <span className={styles.sep}>/</span>
            <Link href="/#series">Series</Link>
            <span className={styles.sep}>/</span>
            <span>{heading}</span>
          </div>
          {series.tagline && <p className={styles.seriesEyebrow}>{series.tagline}</p>}
          <h1 className={styles.seriesTitle}>{heading}</h1>
          {series.description && <p className={styles.seriesIntro}>{series.description}</p>}
          <div className={styles.seriesStats}>
            <div>
              <div className={styles.statNum}>{String(books.length).padStart(2, "0")}</div>
              <div className={styles.statLabel}>
                {books.length === 1 ? (
                  <>
                    Book in
                    <br />
                    the Series
                  </>
                ) : (
                  <>
                    Books in
                    <br />
                    the Series
                  </>
                )}
              </div>
            </div>
            {available > 0 && (
              <div>
                <div className={styles.statNum}>{String(available).padStart(2, "0")}</div>
                <div className={styles.statLabel}>
                  Available
                  <br />
                  Now
                </div>
              </div>
            )}
            {coming > 0 && (
              <div>
                <div className={styles.statNum}>{String(coming).padStart(2, "0")}</div>
                <div className={styles.statLabel}>
                  Coming
                  <br />
                  Soon
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="books" className={styles.books} data-screen-label="Books">
        <div className={styles.wrap}>
          <p className={styles.booksLabel}>Books in the Series</p>
          {books.length ? (
            books.map((book, idx) => <BookRow key={book.$id} book={book} idx={idx} />)
          ) : (
            <p className={styles.seriesIntro}>No books are listed for this series yet. Check back soon.</p>
          )}
        </div>
      </section>

      <RevealOnScroll />
      <ScrollToHash />
    </>
  );
}

function BookRow({ book, idx }: { book: BookDoc; idx: number }) {
  const fallback = placeholderCover(book.title, "A Mac Worden Novel");
  const cover = book.cover_url && book.cover_url.length ? book.cover_url : fallback;
  const st = STATUS_MAP[book.status] ?? { label: book.status ?? "", cta: "Buy the Book", coming: false };
  const alt = book.cover_alt || `${book.title} cover`;
  const blurb = (book.blurb || book.card_description || "").trim();

  return (
    <article
      id={`book-${slugifyTitle(book.title)}`}
      className={`${styles.bookRow} reveal`}
      style={{ transitionDelay: `${idx * 80}ms` }}
    >
      <div className={styles.bookCoverWrap}>
        <span className={`${styles.bookBadge} ${st.coming ? styles.bookBadgeComing : ""}`}>{st.label}</span>
        <div className={styles.bookCover}>
          <div className={styles.bookSpine} />
          <BookCoverImage src={cover} fallbackSrc={fallback} alt={alt} />
        </div>
      </div>

      <div className={styles.bookInfo}>
        <div className={styles.bookNumber}>
          <span>Book {book.series_number != null ? book.series_number : "—"}</span>
          <span className={styles.bookNumberDot} />
          <span className={styles.bookNumberStatus}>{st.label}</span>
        </div>
        <h2 className={styles.bookTitle}>{book.title}</h2>
        {book.tagline && <p className={styles.bookTagline}>{book.tagline}</p>}
        <div className={styles.bookBlurb}>
          {blurb.split(/\n\n+/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        {book.store_url && (
          <div>
            <a className={styles.bookCta} href={book.store_url} target="_blank" rel="noopener noreferrer">
              <span>{book.store_label || st.cta}</span>
              <span className={styles.bookCtaArrow}>&rarr;</span>
            </a>
          </div>
        )}
      </div>
    </article>
  );
}

function SeriesNotFound({ slug }: { slug: string }) {
  return (
    <section id="series-header" className={styles.seriesHeader}>
      <div className={styles.wrap}>
        <div className={styles.crumbs}>
          <Link href="/">Home</Link>
          <span className={styles.sep}>/</span>
          <Link href="/#series">Series</Link>
        </div>
        <div className={styles.empty}>
          <h2>Series Not Found</h2>
          <p>
            We couldn&rsquo;t find a series with the slug <em>&ldquo;{slug}&rdquo;</em>.
          </p>
          <Link href="/#series" className={styles.bookCta}>
            <span>Browse all series</span>
            <span className={styles.bookCtaArrow}>&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function SeriesLoadError({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : String(error);
  const hint = /401|not authorized|missing scope/i.test(msg)
    ? "The server could not authenticate with Appwrite. Check that CMS_API_KEY is set and has the databases.read and documents.read scopes."
    : "Check the Appwrite environment variables (endpoint, project ID, database ID, API key) in the server environment.";
  return (
    <section id="series-header" className={styles.seriesHeader}>
      <div className={styles.wrap}>
        <div className={styles.crumbs}>
          <Link href="/">Home</Link>
          <span className={styles.sep}>/</span>
          <Link href="/#series">Series</Link>
        </div>
        <div className={styles.empty}>
          <h2>Couldn&rsquo;t Load Series</h2>
          <p>{msg}</p>
          <p style={{ marginTop: "1rem", maxWidth: "54ch" }}>{hint}</p>
        </div>
      </div>
    </section>
  );
}
