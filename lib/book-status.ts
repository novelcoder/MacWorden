export const BOOK_STATUSES = [
  "draft",
  "coming_soon",
  "preorder",
  "published",
  "best_seller",
] as const;

export type BookStatus = (typeof BOOK_STATUSES)[number];

/**
 * Statuses that are allowed onto the site. This is an allow-list rather than
 * "anything but draft" so a new status added to the shared catalog stays
 * hidden until this site knows how to present it.
 */
export const VISIBLE_BOOK_STATUSES = [
  "published",
  "best_seller",
  "preorder",
  "coming_soon",
] as const satisfies readonly BookStatus[];

export type VisibleBookStatus = (typeof VISIBLE_BOOK_STATUSES)[number];

export type BookStatusDisplay = {
  /** Badge / status text, e.g. "Preorder Now". */
  label: string;
  /** Default retailer button text when the book has no store_label. */
  cta: string;
  /** Short pill shown on cover thumbnails for upcoming books. */
  pill: string | null;
  /** True for books that are not out yet (coming soon or preorder). */
  coming: boolean;
};

const STATUS_DISPLAY: Record<VisibleBookStatus, BookStatusDisplay> = {
  coming_soon: { label: "Coming Soon", cta: "Pre-order", pill: "Soon", coming: true },
  preorder: { label: "Preorder Now", cta: "Preorder now", pill: "Preorder", coming: true },
  published: { label: "Available Now", cta: "Buy the Book", pill: null, coming: false },
  best_seller: { label: "Best Seller", cta: "Buy the Book", pill: null, coming: false },
};

export function isVisibleBookStatus(status: unknown): status is VisibleBookStatus {
  return (VISIBLE_BOOK_STATUSES as readonly unknown[]).includes(status);
}

export function isAvailableStatus(status: unknown) {
  return status === "published" || status === "best_seller";
}

export function isUpcomingStatus(status: unknown) {
  return status === "coming_soon" || status === "preorder";
}

export function isPreorderStatus(status: unknown) {
  return status === "preorder";
}

export function bookStatusDisplay(status: unknown): BookStatusDisplay {
  if (isVisibleBookStatus(status)) return STATUS_DISPLAY[status];
  return {
    label: typeof status === "string" ? status : "",
    cta: "Buy the Book",
    pill: null,
    coming: false,
  };
}

/**
 * Release timing line for upcoming books.
 * - preorder: "Releases October 14, 2026" when a future release date is known.
 * - coming_soon: "Coming October 2026" / "Coming early next year" / "Coming soon".
 * Returns null for books that are already out, or preorders without a usable date.
 */
export function formatReleaseTiming(
  status: unknown,
  releaseDate?: string | null,
  now: Date = new Date()
): string | null {
  if (!isUpcomingStatus(status)) return null;

  const target = releaseDate ? new Date(releaseDate) : null;
  const hasFutureDate =
    target !== null && !Number.isNaN(target.getTime()) && target.getTime() >= now.getTime();

  if (isPreorderStatus(status)) {
    if (!hasFutureDate) return null;
    return `Releases ${new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(target)}`;
  }

  if (!hasFutureDate) return "Coming soon";

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
