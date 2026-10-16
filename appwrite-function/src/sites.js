// The sites this function serves. The caller names a site; everything else (MailerLite
// group, attribution label, allowed browser origins) is resolved here, server-side. A
// group ID is never accepted from the request.

export const DEFAULT_SITE = 'macworden';

// `groupIdEnv` is required. `apiKeyEnv` is optional: a site without its own key uses the
// shared MAILERLITE_API_KEY. `brandSegment` is the segment a Google source key must contain
// for this site (null means the `gads_` prefix and an enabled route are enough).
export const SITES = {
  macworden: {
    siteKey: 'mac_worden',
    groupIdEnv: 'MAILERLITE_GROUP_ID',
    apiKeyEnv: 'MAILERLITE_API_KEY_MACWORDEN',
    brandSegment: 'mw',
    origins: ['https://macworden.com', 'https://www.macworden.com'],
  },
  jamiemcfarlane: {
    siteKey: 'jamie_mcfarlane',
    groupIdEnv: 'MAILERLITE_GROUP_ID_JAMIEMCFARLANE',
    apiKeyEnv: 'MAILERLITE_API_KEY_JAMIEMCFARLANE',
    brandSegment: null,
    origins: ['https://jamiemcfarlane.com', 'https://www.jamiemcfarlane.com'],
  },
};

export const ALLOWED_ORIGINS = new Set(Object.values(SITES).flatMap((site) => site.origins));

// A missing `site` means the original request shape (Mac Worden forms), so existing
// callers keep working while others switch over. Anything else must be a known site.
export function resolveSite(value) {
  if (value === undefined || value === null) return { name: DEFAULT_SITE, ...SITES[DEFAULT_SITE] };
  if (typeof value !== 'string' || !Object.hasOwn(SITES, value)) return null;
  return { name: value, ...SITES[value] };
}

// Returns { apiKey, groupId } or null when the site is not fully configured.
export function mailerLiteConfig(site, env = process.env) {
  const groupId = env[site.groupIdEnv]?.trim();
  const apiKey = (env[site.apiKeyEnv] || env.MAILERLITE_API_KEY)?.trim();
  if (!apiKey || !groupId || !/^\d+$/.test(groupId)) return null;
  return { apiKey, groupId };
}
