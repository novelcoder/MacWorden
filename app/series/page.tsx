import type { Metadata } from "next";
import Link from "next/link";
import styles from "./series-index.module.css";
import BookCoverImage from "@/components/BookCoverImage";
import RevealOnScroll from "@/components/RevealOnScroll";
import { getMacAttributionContext } from "@/lib/attribution";
import { ATTRIBUTION_QUERY_PARAM, withAttribution } from "@/lib/attribution-routing";
import { getSeriesCatalog, type SeriesCatalogEntry } from "@/lib/appwrite";
import { seriesCanonicalPath } from "@/lib/catalog-routing";
import { placeholderCover } from "@/lib/placeholderCover";

export const metadata: Metadata = {
  title: "The Series",
  description:
    "Explore every Mac Worden mystery and thriller series, with reading orders and complete book details.",
};

export default async function SeriesIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  let catalog: SeriesCatalogEntry[] = [];
  let error: unknown = null;

  try {
    catalog = await getSeriesCatalog();
  } catch (err) {
    error = err;
  }

  if (error) return <SeriesLoadError error={error} />;

  const query = await searchParams;
  const attribution = await getMacAttributionContext(
    query[ATTRIBUTION_QUERY_PARAM],
    catalog.flatMap(({ books }) => books)
  );
  const attributedPath = (path: string) =>
    withAttribution(path, attribution?.sourceKey ?? null);

  const totalBooks = catalog.reduce((total, { books }) => total + books.length, 0);
  const availableBooks = catalog.reduce(
    (total, { books }) =>
      total + books.filter(({ status }) => status === "published" || status === "best_seller").length,
    0
  );

  return (
    <>
      <section className={styles.hero} data-screen-label="The Series">
        <div className={styles.wrap}>
          <p className={styles.eyebrow}>Every Mystery. Every Thriller.</p>
          <h1 className={styles.title}>The Series</h1>
          <p className={styles.subhead}>
            Small towns with long memories, young sleuths with sharp instincts, and heroes who
            step forward when justice gets dangerous. Choose a series and start at Book One.
          </p>
          <div className={styles.stats} aria-label="Catalog summary">
            <div>
              <strong>{String(catalog.length).padStart(2, "0")}</strong>
              <span>Series</span>
            </div>
            <div>
              <strong>{String(totalBooks).padStart(2, "0")}</strong>
              <span>Books Listed</span>
            </div>
            <div>
              <strong>{String(availableBooks).padStart(2, "0")}</strong>
              <span>Available Now</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.catalog} data-screen-label="All Series">
        <div
          className={`${styles.wrap} ${styles.grid}`}
          data-analytics-view-list="true"
          data-analytics-list-id="all_series"
          data-analytics-list-name="All Mac Worden series"
          data-analytics-content-format="series"
        >
          {catalog.length ? (
            catalog.map(({ series, books }, index) => {
              const heading = series.series_heading || series.name || series.slug;
              const leadBook = books[0];
              const cover = leadBook?.cover_thumb_url || leadBook?.cover_url;
              const fallback = placeholderCover(
                leadBook?.title || heading,
                series.name || "A Mac Worden Series"
              );
              const available = books.filter(
                ({ status }) => status === "published" || status === "best_seller"
              ).length;

              return (
                <Link
                  href={attributedPath(seriesCanonicalPath(series))}
                  className={`${styles.card} reveal`}
                  key={series.$id}
                  data-analytics-item="true"
                  data-analytics-select-item="true"
                  data-analytics-item-id={series.$id}
                  data-analytics-item-name={heading}
                  data-analytics-item-index={index}
                  data-analytics-item-category="series"
                  data-analytics-list-id="all_series"
                  data-analytics-list-name="All Mac Worden series"
                  data-analytics-content-format="series"
                >
                  <div className={styles.coverStage}>
                    <BookCoverImage
                      src={cover || fallback}
                      fallbackSrc={fallback}
                      alt={leadBook?.cover_alt || `${leadBook?.title || heading} cover`}
                    />
                    <span className={styles.number}>
                      {String(series.display_order ?? index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className={styles.copy}>
                    <div className={styles.cardMeta}>
                      <span>{series.card_tag || (available ? "Available now" : "Coming soon")}</span>
                      <span>
                        {books.length} {books.length === 1 ? "book" : "books"}
                      </span>
                    </div>
                    <h2>{heading}</h2>
                    {series.tagline && <p className={styles.tagline}>{series.tagline}</p>}
                    <p className={styles.description}>
                      {series.card_description || series.description || "Explore the complete series."}
                    </p>
                    {books.length > 0 && (
                      <div className={styles.bookList} aria-label={`Books in ${heading}`}>
                        {books.map((book) => (
                          <span key={book.$id}>{book.title}</span>
                        ))}
                      </div>
                    )}
                    <div className={styles.explore}>
                      Explore the Series <span aria-hidden="true">&rarr;</span>
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <p className={styles.empty}>No series are listed for this site yet. Check back soon.</p>
          )}
        </div>
      </section>

      <RevealOnScroll />
    </>
  );
}

function SeriesLoadError({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    <section className={styles.hero}>
      <div className={styles.wrap}>
        <p className={styles.eyebrow}>Every Mystery. Every Thriller.</p>
        <h1 className={styles.title}>The Series</h1>
        <p className={styles.subhead}>The series catalog could not be loaded.</p>
        <p className={styles.error}>{message}</p>
      </div>
    </section>
  );
}
