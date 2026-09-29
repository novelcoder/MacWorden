export const NEWSLETTER_SOURCE_QUERY_PARAM = "source_key";
export const NEWSLETTER_ATTRIBUTION_STORAGE_KEY = "macworden_newsletter_attribution_v1";

const SOURCE_KEY_PATTERN = /^[a-z0-9](?:[a-z0-9_]{0,62}[a-z0-9])?$/;
const SERIES_KEY_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const SIGNUP_PATH_PATTERN = /^(?:\/$|\/[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*)$/;

export type NewsletterAttribution = {
  sourceKey?: string;
  series?: string;
  path?: string;
};

type StoredAttribution = Pick<NewsletterAttribution, "sourceKey" | "series">;

export function normalizeNewsletterSourceKey(value: unknown): string | undefined {
  return typeof value === "string" && SOURCE_KEY_PATTERN.test(value) ? value : undefined;
}

export function normalizeNewsletterSeries(value: unknown): string | undefined {
  return typeof value === "string" && SERIES_KEY_PATTERN.test(value) ? value : undefined;
}

export function normalizeNewsletterPath(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 160) return undefined;

  const normalized = value.length > 1 && value.endsWith("/") ? value.slice(0, -1) : value;
  return SIGNUP_PATH_PATTERN.test(normalized) ? normalized : undefined;
}

export function seriesFromNewsletterPath(pathname: string): string | undefined {
  const path = normalizeNewsletterPath(pathname);
  if (!path) return undefined;

  const match = /^\/series\/([^/]+)$/.exec(path);
  return normalizeNewsletterSeries(match?.[1]);
}

function getSessionStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readStoredAttribution(storage: Storage | null): StoredAttribution {
  if (!storage) return {};

  try {
    const raw = storage.getItem(NEWSLETTER_ATTRIBUTION_STORAGE_KEY);
    if (!raw) return {};

    const value = JSON.parse(raw) as Record<string, unknown>;
    return {
      sourceKey: normalizeNewsletterSourceKey(value.sourceKey),
      series: normalizeNewsletterSeries(value.series),
    };
  } catch {
    return {};
  }
}

export function captureNewsletterAttribution(pathname: string): void {
  if (typeof window === "undefined") return;

  const storage = getSessionStorage();
  const stored = readStoredAttribution(storage);
  const sourceValues = new URLSearchParams(window.location.search).getAll(
    NEWSLETTER_SOURCE_QUERY_PARAM,
  );
  const sourceKey =
    sourceValues.length === 1 ? normalizeNewsletterSourceKey(sourceValues[0]) : undefined;
  const series = seriesFromNewsletterPath(pathname);
  const next: StoredAttribution = {
    sourceKey: sourceKey ?? stored.sourceKey,
    series: series ?? stored.series,
  };

  if (!next.sourceKey && !next.series) return;

  try {
    storage?.setItem(NEWSLETTER_ATTRIBUTION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts. Signup still works.
  }
}

export function getNewsletterAttribution(pathname: string): NewsletterAttribution {
  const path = normalizeNewsletterPath(pathname);

  if (typeof window === "undefined") {
    return path ? { path } : {};
  }

  const stored = readStoredAttribution(getSessionStorage());
  const sourceValues = new URLSearchParams(window.location.search).getAll(
    NEWSLETTER_SOURCE_QUERY_PARAM,
  );
  const currentSourceKey =
    sourceValues.length === 1 ? normalizeNewsletterSourceKey(sourceValues[0]) : undefined;

  return {
    sourceKey: currentSourceKey ?? stored.sourceKey,
    series: seriesFromNewsletterPath(pathname) ?? stored.series,
    path,
  };
}
