export const ANALYTICS_CONSENT_COOKIE = "macworden_analytics_consent";
export const ANALYTICS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export type AnalyticsConsentChoice = "granted" | "denied";

const GOOGLE_ANALYTICS_ID_PATTERN = /^G-[A-Z0-9]{10}$/;

export function parseGoogleAnalyticsId(value: string | undefined): string | null {
  const candidate = value?.trim().toUpperCase() ?? "";
  return GOOGLE_ANALYTICS_ID_PATTERN.test(candidate) ? candidate : null;
}

export const GOOGLE_ANALYTICS_ID = parseGoogleAnalyticsId(
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID
);
