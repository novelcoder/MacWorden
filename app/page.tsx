import Link from "next/link";
import RevealOnScroll from "@/components/RevealOnScroll";
import NewsletterForm from "@/components/NewsletterForm";
import BookCoverImage from "@/components/BookCoverImage";
import YouTubeFeatureVideo from "@/components/YouTubeFeatureVideo";
import {
  getHeroBook,
  getNewsletterIncentive,
  getSeriesCatalog,
  type SeriesCatalogEntry,
  type SeriesDoc,
} from "@/lib/appwrite";
import { placeholderCover } from "@/lib/placeholderCover";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatInlineEmphasis(value: string): string {
  return escapeHtml(value).replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function seriesCardNumber(doc: SeriesDoc, idx: number): string {
  return String(doc.display_order ?? idx + 1).padStart(2, "0");
}

export default async function HomePage() {
  const [heroBook, newsletterIncentive, seriesCatalog] = await Promise.all([
    getHeroBook().catch((e) => {
      console.warn("Could not load the hero book from Appwrite:", e.message);
      return null;
    }),
    getNewsletterIncentive().catch((e) => {
      console.warn("Could not load the newsletter incentive from Appwrite:", e.message);
      return null;
    }),
    getSeriesCatalog().catch((e) => {
      console.warn("Could not load series from Appwrite:", e.message);
      return [] as SeriesCatalogEntry[];
    }),
  ]);

  const seriesCount = seriesCatalog.length;
  const publishedBookCount = seriesCatalog.reduce(
    (total, { books }) =>
      total + books.filter(({ status }) => status === "published" || status === "best_seller").length,
    0
  );

  return (
    <>
      {/* HERO */}
      <section id="hero" data-screen-label="Home">
        <div className="hero-grid">
          {/* LEFT — featured video */}
          <div className="book-stage fade-up" id="book">
            <span className="coming-tag">Coming Soon</span>
            <div className="book-frame hero-video-frame">
              <div className="book-spine" />
              <YouTubeFeatureVideo />
            </div>
          </div>

          {/* RIGHT — name, book meta, email */}
          <div className="hero-right fade-up">
            <div className="hero-rule" />
            <p className="hero-label">Mystery &amp; Thriller Author</p>
            <h1 className="hero-name">
              MAC
              <br />
              <span className="accent">WORDEN</span>
            </h1>
            <p className="hero-kicker">
              Where justice still depends on <em>good people doing the right thing.</em>{" "}
              {seriesCount || 4} distinctive series from a master storyteller.
            </p>

            {/* Featured book strip */}
            <div className="book-meta">
              <div className="book-meta-text">
                <span className="book-meta-eyebrow">New Release · Book 1</span>
                <span className="book-meta-title">STRAY EVIDENCE</span>
                <span className="book-meta-series">A Jack and Coke Mystery</span>
              </div>
              <a
                href={heroBook?.storeUrl || "#book"}
                className="book-meta-cta"
                data-analytics-event={heroBook?.storeUrl ? "retailer_link_click" : undefined}
                data-analytics-item-id={heroBook?.id}
                data-analytics-item-name={heroBook?.title}
                data-analytics-placement="homepage_hero_details"
                data-analytics-content-format="book"
                {...(heroBook?.storeUrl ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                Read the Story
              </a>
            </div>

            {/* Email capture */}
            <div id="signup">
              <h2 className="signup-heading">
                Get a <em>free novel</em> when you
                <br />
                join the reader list.
              </h2>
              {newsletterIncentive && (
                <p
                  className="signup-sub"
                  id="newsletter-incentive"
                  dangerouslySetInnerHTML={{ __html: formatInlineEmphasis(newsletterIncentive) }}
                />
              )}

              <NewsletterForm />

              <div className="signup-perks">
                <span className="perk">Free novel</span>
                <span className="perk">Cover reveals</span>
                <span className="perk">Release alerts</span>
                <span className="perk">No spam, ever</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERIES */}
      <section id="series" data-screen-label="Series">
        <div className="wrap">
          <div className="series-header reveal">
            <div>
              <p className="section-label">The Series</p>
              <h2 className="section-title">
                People worth trusting.
                <br />
                <em>Trouble worth facing.</em>
              </h2>
            </div>
            <p className="series-intro">
              Every Mac Worden series has its own dedicated home, complete reading order, and book
              details. Start with the case that calls to you.
            </p>
          </div>

          <div
            className="series-grid"
            id="series-grid"
            data-analytics-view-list="true"
            data-analytics-list-id="homepage_series"
            data-analytics-list-name="Homepage series"
            data-analytics-content-format="series"
          >
            {seriesCatalog.map(({ series: doc, books }, idx) => {
              const leadBook = books[0];
              const cover = leadBook?.cover_thumb_url || leadBook?.cover_url;
              const fallback = placeholderCover(
                leadBook?.title || doc.series_heading || doc.name || "Mac Worden",
                doc.series_heading || doc.name || "A Mac Worden Series"
              );

              return (
                <Link
                  key={doc.$id}
                  href={`/series/${doc.slug}`}
                  className={`series-card${idx === 0 ? " featured" : ""} reveal`}
                  data-analytics-item="true"
                  data-analytics-select-item="true"
                  data-analytics-item-id={doc.$id}
                  data-analytics-item-name={doc.series_heading || doc.name || doc.slug}
                  data-analytics-item-index={idx}
                  data-analytics-item-category="series"
                  data-analytics-list-id="homepage_series"
                  data-analytics-list-name="Homepage series"
                  data-analytics-content-format="series"
                >
                  <div className="series-card-art">
                    <BookCoverImage
                      src={cover || fallback}
                      fallbackSrc={fallback}
                      alt={leadBook?.cover_alt || `${leadBook?.title || doc.series_heading} cover`}
                    />
                    <div className="series-num">{seriesCardNumber(doc, idx)}</div>
                  </div>
                  <div className="series-card-copy">
                    {doc.card_tag && <span className="series-tag">{doc.card_tag}</span>}
                    <div className="series-name">{doc.series_heading ?? doc.name ?? ""}</div>
                    <p className="series-desc">{doc.card_description ?? doc.description ?? ""}</p>
                    <div className="series-meta">
                      <span>{doc.card_meta ?? `${books.length} ${books.length === 1 ? "book" : "books"}`}</span>
                      <span className="arrow">&rarr;</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="series-all reveal">
            <Link href="/series" className="series-all-link">
              View All Series <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" data-screen-label="About">
        <div className="wrap">
          <div className="about-grid">
            <div className="about-image reveal">
              <img
                src="https://sfo.cloud.appwrite.io/v1/storage/buckets/6a0c6e4f002815f1e58a/files/MacWordenAuthor/view?project=6a0b4638002a71c2b8ec"
                alt="Mac Worden, author"
              />
            </div>
            <div className="reveal">
              <p className="section-label">The Author</p>
              <h2 className="section-title">
                About
                <br />
                <em>Mac Worden</em>
              </h2>
              <div className="about-text">
                <p>
                  Mac Worden writes mysteries and thrillers about ordinary people pulled into
                  extraordinary trouble &mdash; flawed heroes, small towns with long memories, and
                  the kind of plots that move quiet, then all at once.
                </p>
                <p>
                  <em>Stray Evidence</em> &mdash; the first in the Jack and Coke Mystery series
                  &mdash; joins a growing shelf that already includes{" "}
                  <em>When Justice Calls</em> (A Henry Biggston Thriller) and the Colby Watts
                  novels <em>Deputy in the Crosshairs</em> and <em>Manhunt at Sage Creek</em>.
                </p>
                <p>
                  {seriesCount || 4} series. One author. Every story built on the spaces between
                  what people say and what they actually did.
                </p>
              </div>
              <div className="about-stats">
                <div>
                  <div className="stat-num">{seriesCount || 4}</div>
                  <div className="stat-label">
                    Series
                    <br />
                    to Explore
                  </div>
                </div>
                <div>
                  <div className="stat-num">{publishedBookCount || 3}</div>
                  <div className="stat-label">
                    Novels
                    <br />
                    Published
                  </div>
                </div>
                <div>
                  <div className="stat-num">01</div>
                  <div className="stat-label">
                    New Release
                    <br />
                    Coming Soon
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <RevealOnScroll />
    </>
  );
}
