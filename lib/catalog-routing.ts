import { slugifyTitle } from "./slugify.ts";

export type SeriesRouteRecord = {
  slug: string;
  name?: string;
  series_heading?: string;
};

export type BookRouteRecord = {
  slug: string;
  title: string;
};

const JACK_AND_COCOA_CANONICAL_SEGMENT = "JackAndCocoa";
const JACK_AND_COCOA_SLUGS = new Set(["jack-and-coke", "jack-and-cocoa"]);
const JACK_AND_COCOA_ALIASES = [
  "JackAndCoke",
  "Jack and Coke Mysteries",
  "A Jack and Coke Mystery",
  "JackAndCocoa",
  "Jack and Cocoa Mysteries",
  "A Jack and Cocoa Mystery",
];

export function normalizeRouteAlias(value: string) {
  try {
    return slugifyTitle(decodeURIComponent(value));
  } catch {
    return "";
  }
}

export function seriesMatchesRouteAlias(series: SeriesRouteRecord, requestedAlias: string) {
  const target = normalizeRouteAlias(requestedAlias);
  if (!target) return false;

  const aliases = [series.slug, series.name, series.series_heading];
  if (JACK_AND_COCOA_SLUGS.has(series.slug)) {
    aliases.push(...JACK_AND_COCOA_ALIASES);
  }

  return aliases
    .filter((value): value is string => Boolean(value))
    .some((value) => normalizeRouteAlias(value) === target);
}

export function bookMatchesRouteAlias(book: BookRouteRecord, requestedAlias: string) {
  const target = normalizeRouteAlias(requestedAlias);
  if (!target) return false;

  return [book.slug, book.title]
    .filter((value): value is string => Boolean(value))
    .some((value) => normalizeRouteAlias(value) === target);
}

export function seriesCanonicalSegment(series: SeriesRouteRecord) {
  if (JACK_AND_COCOA_SLUGS.has(series.slug)) {
    return JACK_AND_COCOA_CANONICAL_SEGMENT;
  }

  return series.slug
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join("");
}

export function seriesCanonicalPath(series: SeriesRouteRecord) {
  return `/${encodeURIComponent(seriesCanonicalSegment(series))}`;
}

export function bookCanonicalPath(book: BookRouteRecord) {
  return `/books/${encodeURIComponent(book.slug)}`;
}
