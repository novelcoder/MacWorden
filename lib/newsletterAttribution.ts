// Carries a Mac Google Ads `source_key` from the landing URL to the reader-list form so
// the signup function can record which campaign produced the request. Only the key is
// kept, in tab-scoped sessionStorage; the function re-validates it against enabled routes.

export const NEWSLETTER_SOURCE_QUERY_PARAM = "source_key";
export const NEWSLETTER_ATTRIBUTION_STORAGE_KEY = "macworden_newsletter_source_v1";

const SOURCE_KEY_PATTERN = /^[a-z0-9](?:[a-z0-9_]{0,62}[a-z0-9])?$/;

export type NewsletterSignupContext = {
  source_key?: string;
  signup_path: string;
};

export function normalizeNewsletterSourceKey(value: unknown): string | undefined {
  if (typeof value !== "string" || !SOURCE_KEY_PATTERN.test(value)) return undefined;
  return value.split("_").includes("mw") ? value : undefined;
}

function getSessionStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function sourceKeyFromUrl(search: string): string | undefined {
  const values = new URLSearchParams(search).getAll(NEWSLETTER_SOURCE_QUERY_PARAM);
  return values.length === 1 ? normalizeNewsletterSourceKey(values[0]) : undefined;
}

function readStoredSourceKey(storage: Storage | null): string | undefined {
  try {
    return normalizeNewsletterSourceKey(storage?.getItem(NEWSLETTER_ATTRIBUTION_STORAGE_KEY));
  } catch {
    return undefined;
  }
}

export function captureNewsletterSourceKey(): void {
  if (typeof window === "undefined") return;

  const sourceKey = sourceKeyFromUrl(window.location.search);
  if (!sourceKey) return;

  try {
    getSessionStorage()?.setItem(NEWSLETTER_ATTRIBUTION_STORAGE_KEY, sourceKey);
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts. Signup still works.
  }
}

export function getNewsletterSignupContext(): NewsletterSignupContext {
  const sourceKey =
    sourceKeyFromUrl(window.location.search) ?? readStoredSourceKey(getSessionStorage());

  return {
    ...(sourceKey ? { source_key: sourceKey } : {}),
    signup_path: window.location.pathname,
  };
}
