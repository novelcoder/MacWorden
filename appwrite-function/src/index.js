import { normalizeAndValidateEmail } from './email.js';
import { subscribeToGroup } from './mailerlite.js';
import { ALLOWED_ORIGINS, mailerLiteConfig, resolveSite } from './sites.js';
import { buildSignupEvent, createAppwriteTables } from './signupEvent.js';

// A real reader needs a moment to type an address. Faster submissions are almost always
// scripts, so they are asked to try again rather than silently dropped.
const MIN_FORM_TIME_MS = 1000;

function corsHeaders(origin) {
  return {
    ...(ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function headerValue(headers, name) {
  if (!headers) return undefined;
  return headers[name] ?? headers[name.toLowerCase()];
}

// Records one anonymous event for a signup MailerLite already accepted. Failures are
// logged generically and never change the reader-facing result.
async function recordSignupEvent({ req, body, site, error, createTables }) {
  try {
    const tables = createTables({
      endpoint: process.env.APPWRITE_FUNCTION_API_ENDPOINT,
      projectId: process.env.APPWRITE_FUNCTION_PROJECT_ID,
      apiKey: headerValue(req.headers, 'x-appwrite-key'),
    });
    const event = await buildSignupEvent({
      siteKey: site.siteKey,
      brandSegment: site.brandSegment,
      sourceKey: body?.source_key,
      signupPath: body?.signup_path,
      hasEnabledRoute: (sourceKey) => tables.hasEnabledRoute(sourceKey),
    });
    await tables.createEvent(event);
  } catch (cause) {
    const detail = cause instanceof Error && /status \d+$/.test(cause.message) ? ` (${cause.message})` : '';
    error(`Newsletter signup event was not recorded${detail}.`);
  }
}

export function createHandler({ createTables = createAppwriteTables } = {}) {
  return async function subscribe({ req, res, log, error }) {
    const cors = corsHeaders(headerValue(req.headers, 'origin'));
    const method = (req.method || '').toUpperCase();

    if (method === 'OPTIONS') {
      return res.json({}, 200, cors);
    }

    if (method !== 'POST') {
      return res.json({ error: 'Method not allowed' }, 405, cors);
    }

    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return res.json({ error: 'Invalid request body' }, 400, cors);
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.json({ error: 'Invalid request body' }, 400, cors);
    }

    const site = resolveSite(body.site);
    if (!site) {
      return res.json({ error: 'Unknown site' }, 400, cors);
    }

    // A filled hidden field means a bot. Return the normal response without contacting
    // MailerLite so the endpoint reveals nothing.
    if (typeof body.website === 'string' && body.website.trim()) {
      return res.json({ success: true }, 200, cors);
    }

    const email = normalizeAndValidateEmail(body.email);
    if (!email) {
      return res.json({ error: 'Invalid email address' }, 400, cors);
    }

    // Optional while older forms are still in use; once sent it must be plausible.
    if (body.elapsed_ms !== undefined) {
      if (typeof body.elapsed_ms !== 'number' || !(body.elapsed_ms >= MIN_FORM_TIME_MS)) {
        return res.json({ error: 'Please try again' }, 400, cors);
      }
    }

    const config = mailerLiteConfig(site);
    if (!config) {
      error(`MailerLite is not configured for site ${site.name}.`);
      return res.json({ error: 'Subscription unavailable' }, 503, cors);
    }

    log('Processing newsletter subscription request.');

    const result = await subscribeToGroup({ ...config, email });
    if (!result.ok) {
      error(`MailerLite subscription request failed with status ${result.status}.`);
      return res.json({ error: 'Subscription failed' }, 502, cors);
    }

    await recordSignupEvent({ req, body, site, error, createTables });

    return res.json({ success: true }, 200, cors);
  };
}

export default createHandler();
