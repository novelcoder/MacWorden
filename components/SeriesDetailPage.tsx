import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import styles from "@/app/series/[slug]/series.module.css";
import RevealOnScroll from "@/components/RevealOnScroll";
import ScrollToHash from "@/components/ScrollToHash";
import BookCoverImage from "@/components/BookCoverImage";
import NewsletterForm from "@/components/NewsletterForm";
import YouTubeFeatureVideo from "@/components/YouTubeFeatureVideo";
import { getMacAttributionContext, purchaseUrlForBook } from "@/lib/attribution";
import {
  ATTRIBUTION_QUERY_PARAM,
  type AttributionContext,
  withAttribution,
} from "@/lib/attribution-routing";
import { getSeriesCatalog, type BookDoc } from "@/lib/appwrite";
import {
  bookCanonicalPath,
  bookMatchesRouteAlias,
  seriesCanonicalPath,
  seriesCanonicalSegment,
  seriesMatchesRouteAlias,
} from "@/lib/catalog-routing";
import { placeholderCover } from "@/lib/placeholderCover";
import { SITE_URL } from "@/lib/site";
import { slugifyTitle } from "@/lib/slugify";

const STATUS_MAP: Record<string, { label: string; cta: string; coming: boolean }> = {
  coming_soon: { label: "Coming Soon", cta: "Pre-order", coming: true },
  published: { label: "Available Now", cta: "Buy the Book", coming: false },
  best_seller: { label: "Best Seller", cta: "Buy the Book", coming: false },
};

const SERIES_HERO_VIDEOS: Record<
  string,
  { videoId: string; title: string; durationLabel: string }
> = {
  "bitter-lake-mysteries": {
    videoId: "mEnfY79nA7A",
    title: "Bitter Lake Letters introduction",
    durationLabel: "9-second",
  },
};

export async function generateSeriesMetadata(requestedAlias: string): Promise<Metadata> {
  try {
    const catalog = await getSeriesCatalog();
    const matches = catalog.filter(({ series }) =>
      seriesMatchesRouteAlias(series, requestedAlias)
    );
    if (matches.length !== 1) return {};

    const { series } = matches[0];
    return {
      title: series.series_heading || series.name || series.slug,
      alternates: { canonical: `${SITE_URL}${seriesCanonicalPath(series)}` },
    };
  } catch {
    return {};
  }
}

export default async function SeriesDetailPage({
  requestedAlias,
  searchParams,
  redirectLegacyBooks = false,
}: {
  requestedAlias: string;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  redirectLegacyBooks?: boolean;
}) {
  let catalog;
  try {
    catalog = await getSeriesCatalog();
  } catch (err) {
    return <SeriesLoadError error={err} />;
  }

  const matchingEntries = catalog.filter(({ series }) =>
    seriesMatchesRouteAlias(series, requestedAlias)
  );
  if (matchingEntries.length !== 1) {
    if (redirectLegacyBooks) {
      const matchingBooks = catalog.flatMap((entry) =>
        entry.books
          .filter((book) => bookMatchesRouteAlias(book, requestedAlias))
          .map((book) => ({ entry, book }))
      );

      if (matchingBooks.length === 1) {
        const query = await searchParams;
        const attribution = await getMacAttributionContext(
          query[ATTRIBUTION_QUERY_PARAM],
          catalog.flatMap(({ books }) => books)
        );
        permanentRedirect(
          withAttribution(
            bookCanonicalPath(matchingBooks[0].book),
            attribution?.sourceKey ?? null
          )
        );
      }
    }

    return <SeriesNotFound slug={requestedAlias} />;
  }

  const entry = matchingEntries[0];
  const { series, books } = entry;
  const query = await searchParams;
  const attribution = await getMacAttributionContext(
    query[ATTRIBUTION_QUERY_PARAM],
    catalog.flatMap((catalogEntry) => catalogEntry.books)
  );
  const attributedPath = (path: string) =>
    withAttribution(path, attribution?.sourceKey ?? null);

  if (requestedAlias !== seriesCanonicalSegment(series)) {
    permanentRedirect(attributedPath(seriesCanonicalPath(series)));
  }

  const available = books.filter((b) => b.status === "published" || b.status === "best_seller").length;
  const coming = books.filter((b) => b.status === "coming_soon").length;
  const heading = series.series_heading || series.name || series.slug;
  const heroVideo = SERIES_HERO_VIDEOS[series.slug];
  const listId = `series_${series.$id}_books`;
  const listName = `${heading} books`;

  return (
    <>
      <section id="series-header" className={styles.seriesHeader} data-screen-label="Series Header">
        <div className={styles.wrap}>
          <div className={styles.crumbs}>
            <Link href={attributedPath("/")}>Home</Link>
            <span className={styles.sep}>/</span>
            <Link href={attributedPath("/series")}>Series</Link>
            <span className={styles.sep}>/</span>
            <span>{heading}</span>
          </div>
          <div className={heroVideo ? styles.heroGrid : undefined}>
            <div>
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

            {heroVideo && (
              <div className={styles.heroVideo}>
                <p className={styles.heroVideoLabel}>Watch the Introduction</p>
                <YouTubeFeatureVideo
                  videoId={heroVideo.videoId}
                  title={heroVideo.title}
                  durationLabel={heroVideo.durationLabel}
                  orientation="cropped-landscape"
                  analyticsPlacement="series_hero"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="books" className={styles.books} data-screen-label="Books">
        <div
          className={styles.wrap}
          data-analytics-view-list="true"
          data-analytics-list-id={listId}
          data-analytics-list-name={listName}
          data-analytics-content-format="book"
        >
          <p className={styles.booksLabel}>Books in the Series</p>
          {books.length ? (
            books.map((book, idx) => (
              <BookDetailRow
                key={book.$id}
                book={book}
                idx={idx}
                listId={listId}
                listName={listName}
                seriesName={heading}
                attribution={attribution}
              />
            ))
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

export function BookDetailRow({
  book,
  idx,
  listId,
  listName,
  seriesName,
  attribution,
  context = "series",
}: {
  book: BookDoc;
  idx: number;
  listId: string;
  listName: string;
  seriesName: string;
  attribution: AttributionContext | null;
  context?: "series" | "book";
}) {
  const fallback = placeholderCover(book.title, "A Mac Worden Novel");
  const cover = book.cover_url && book.cover_url.length ? book.cover_url : fallback;
  const st = STATUS_MAP[book.status] ?? { label: book.status ?? "", cta: "Buy the Book", coming: false };
  const alt = book.cover_alt || `${book.title} cover`;
  const blurb = (book.blurb || book.card_description || "").trim();
  const releaseTiming = st.coming ? formatReleaseTiming(book.release_date) : null;
  const isBookPage = context === "book";
  const showReleaseTiming = releaseTiming && (!isBookPage || releaseTiming !== "Coming soon");

  return (
    <article
      id={`book-${slugifyTitle(book.title)}`}
      className={`${styles.bookRow} reveal`}
      style={{ transitionDelay: `${idx * 80}ms` }}
      data-analytics-item="true"
      data-analytics-view-item="true"
      data-analytics-item-id={book.$id}
      data-analytics-item-name={book.title}
      data-analytics-item-index={idx}
      data-analytics-item-category={seriesName}
      data-analytics-item-variant={book.status}
      data-analytics-list-id={listId}
      data-analytics-list-name={listName}
      data-analytics-content-format="book"
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
          <span>
            {book.series_number != null
              ? `Book ${book.series_number}${isBookPage ? ` in ${seriesName}` : ""}`
              : isBookPage
                ? `A ${seriesName} story`
                : "Book —"}
          </span>
          {!isBookPage && (
            <>
              <span className={styles.bookNumberDot} />
              <span className={styles.bookNumberStatus}>{st.label}</span>
            </>
          )}
        </div>
        {isBookPage ? (
          <h1 className={styles.bookTitle}>{book.title}</h1>
        ) : (
          <h2 className={styles.bookTitle}>
            <Link
              className={styles.bookTitleLink}
              href={withAttribution(bookCanonicalPath(book), attribution?.sourceKey ?? null)}
            >
              {book.title}
            </Link>
          </h2>
        )}
        {book.tagline && <p className={styles.bookTagline}>{book.tagline}</p>}
        {showReleaseTiming && <p className={styles.releaseTiming}>{releaseTiming}</p>}
        <div className={styles.bookBlurb}>
          {blurb.split(/\n\n+/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        {book.store_url ? (
          <div>
            <a
              className={styles.bookCta}
              href={purchaseUrlForBook(book, attribution)}
              target="_blank"
              rel="noopener noreferrer"
              data-analytics-event="retailer_link_click"
              data-analytics-item-id={book.$id}
              data-analytics-item-name={book.title}
              data-analytics-placement="series_book_details"
              data-analytics-content-format="book"
            >
              <span>{book.store_label || st.cta}</span>
              <span className={styles.bookCtaArrow}>&rarr;</span>
            </a>
          </div>
        ) : st.coming ? (
          <div className={styles.releaseSignup}>
            <p>Join Mac&apos;s reader list for preorder news and release updates.</p>
            <NewsletterForm buttonLabel="Get Release Updates" />
          </div>
        ) : null}
      </div>
    </article>
  );
}

function formatReleaseTiming(releaseDate?: string): string {
  if (!releaseDate) return "Coming soon";

  const target = new Date(releaseDate);
  if (Number.isNaN(target.getTime())) return "Coming soon";

  const now = new Date();
  if (target.getTime() < now.getTime()) return "Coming soon";

  const targetYear = target.getUTCFullYear();
  const currentYear = now.getUTCFullYear();
  const targetMonth = target.getUTCMonth();

  if (targetYear === currentYear + 1 && targetMonth <= 2) return "Coming early next year";
  if (targetYear === currentYear && targetMonth <= 2) return "Coming early this year";

  return `Coming ${new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(target)}`;
}

function SeriesNotFound({ slug }: { slug: string }) {
  return (
    <section id="series-header" className={styles.seriesHeader}>
      <div className={styles.wrap}>
        <div className={styles.crumbs}>
          <Link href="/">Home</Link>
          <span className={styles.sep}>/</span>
          <Link href="/series">Series</Link>
        </div>
        <div className={styles.empty}>
          <h2>Series Not Found</h2>
          <p>
            We couldn&rsquo;t find a series with the slug <em>&ldquo;{slug}&rdquo;</em>.
          </p>
          <Link href="/series" className={styles.bookCta}>
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
          <Link href="/series">Series</Link>
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
