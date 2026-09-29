// Anonymous newsletter signup events for the shared `newsletter_signup_events` table.
// An event records only which site and source produced a signup request that MailerLite
// accepted. It never contains the email address or any other subscriber data.

export const SITE_KEY = 'mac_worden';
export const EVENTS_DATABASE_ID = '6a0b628900008b8506e3';
export const EVENTS_TABLE_ID = 'newsletter_signup_events';
export const ROUTES_TABLE_ID = 'attribution_routes';
export const UNKNOWN_PATH = '/unknown';

const SOURCE_KEY_PATTERN = /^[a-z0-9](?:[a-z0-9_]{0,62}[a-z0-9])?$/;
const SIGNUP_PATH_PATTERN = /^(?:\/|(?:\/[a-z0-9][a-z0-9-]*)+)$/;
const MAX_PATH_LENGTH = 256;

// A Mac Google source key: valid syntax, the `gads_` prefix, and the `mw` brand segment
// shared with the site's Amazon Attribution routing.
export function parseMacGoogleSourceKey(value) {
  if (typeof value !== 'string' || !SOURCE_KEY_PATTERN.test(value)) return null;
  if (!value.startsWith('gads_')) return null;
  return value.split('_').includes('mw') ? value : null;
}

export function normalizeSignupPath(value) {
  if (typeof value !== 'string' || value.length > MAX_PATH_LENGTH) return UNKNOWN_PATH;
  const trimmed = value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value;
  return SIGNUP_PATH_PATTERN.test(trimmed) ? trimmed : UNKNOWN_PATH;
}

export function chicagoDate(now = new Date()) {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

// Resolves the reported source. `hasEnabledRoute` is asked only about keys that already
// pass the Mac Google syntax check; anything else is unattributed website traffic.
export async function resolveSource(rawSourceKey, hasEnabledRoute) {
  const sourceKey = parseMacGoogleSourceKey(rawSourceKey);
  if (sourceKey && (await hasEnabledRoute(sourceKey))) {
    return { source_type: 'google_ads', source_key: sourceKey };
  }
  return { source_type: 'website_unattributed' };
}

export async function buildSignupEvent({ sourceKey, signupPath, hasEnabledRoute, now }) {
  return {
    site_key: SITE_KEY,
    event_date: chicagoDate(now),
    ...(await resolveSource(sourceKey, hasEnabledRoute)),
    signup_path: normalizeSignupPath(signupPath),
  };
}

// Minimal Appwrite TablesDB REST client using the execution's dynamic API key, so the
// function needs no SDK dependency and only the scopes granted to it (rows.read, rows.write).
export function createAppwriteTables({ endpoint, projectId, apiKey, fetchImpl = fetch }) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Appwrite-Project': projectId,
    'X-Appwrite-Key': apiKey,
  };
  const tableUrl = (tableId) =>
    `${endpoint}/tablesdb/${EVENTS_DATABASE_ID}/tables/${tableId}/rows`;

  return {
    async hasEnabledRoute(sourceKey) {
      const queries = [
        { method: 'equal', attribute: 'source_key', values: [sourceKey] },
        { method: 'equal', attribute: 'enabled', values: [true] },
        { method: 'limit', values: [1] },
      ];
      const search = queries
        .map((query) => `queries[]=${encodeURIComponent(JSON.stringify(query))}`)
        .join('&');
      const response = await fetchImpl(`${tableUrl(ROUTES_TABLE_ID)}?${search}`, { headers });
      if (!response.ok) throw new Error(`route lookup status ${response.status}`);
      const result = await response.json();
      return Number(result?.total) > 0;
    },

    async createEvent(data) {
      const response = await fetchImpl(tableUrl(EVENTS_TABLE_ID), {
        method: 'POST',
        headers,
        body: JSON.stringify({ rowId: 'unique()', data }),
      });
      if (!response.ok) throw new Error(`event write status ${response.status}`);
    },
  };
}
