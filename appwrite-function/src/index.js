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

// Error responses carry a stable `code` for callers (jamiemcfarlane.com maps these to its
// form messages) next to the human-readable `error` older callers already read.
function fail(res, status, code, error, cors, extraHeaders = {}) {
  return res.json({ error, code }, status, { ...cors, ...extraHeaders });
}

// Maps a MailerLite failure to the reader-facing result.
function providerFailure(result) {
  if (result.status === 400 || result.status === 422) {
    return { status: 400, code: 'invalid_email', error: 'Invalid email address' };
  }
  if (result.status === 401 || result.status === 403 || result.status === 404) {
    return { status: 503, code: 'subscription_unavailable', error: 'Subscription unavailable' };
  }
  if (result.status === 429) {
    return { status: 503, code: 'rate_limited', error: 'Subscription failed' };
  }
  return { status: 502, code: 'provider_unavailable', error: 'Subscription failed' };
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
      sourceRules: {
        requiredSegment: site.requiredSegment,
        rejectedSegments: site.rejectedSegments,
      },
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
      return fail(res, 405, 'method_not_allowed', 'Method not allowed', cors);
    }

    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return fail(res, 400, 'invalid_request', 'Invalid request body', cors);
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return fail(res, 400, 'invalid_request', 'Invalid request body', cors);
    }

    const site = resolveSite(body.site);
    if (!site) {
      return fail(res, 400, 'unknown_site', 'Unknown site', cors);
    }

    // A filled hidden field means a bot. Return the normal response without contacting
    // MailerLite so the endpoint reveals nothing.
    if (typeof body.website === 'string' && body.website.trim()) {
      return res.json({ success: true }, 200, cors);
    }

    const email = normalizeAndValidateEmail(body.email);
    if (!email) {
      return fail(res, 400, 'invalid_email', 'Invalid email address', cors);
    }

    // Optional while older forms are still in use; once sent it must be plausible.
    if (body.elapsed_ms !== undefined) {
      if (typeof body.elapsed_ms !== 'number' || !(body.elapsed_ms >= MIN_FORM_TIME_MS)) {
        return fail(res, 400, 'try_again', 'Please try again', cors);
      }
    }

    const config = mailerLiteConfig(site);
    if (!config) {
      error(`MailerLite is not configured for site ${site.name}.`);
      return fail(res, 503, 'subscription_unavailable', 'Subscription unavailable', cors);
    }

    log('Processing newsletter subscription request.');

    const result = await subscribeToGroup({ ...config, email });
    if (!result.ok) {
      error(`MailerLite subscription request failed with status ${result.status}.`);
      const failure = providerFailure(result);
      return fail(
        res,
        failure.status,
        failure.code,
        failure.error,
        cors,
        failure.code === 'rate_limited' && result.retryAfter ? { 'Retry-After': result.retryAfter } : {}
      );
    }

    await recordSignupEvent({ req, body, site, error, createTables });

    return res.json({ success: true }, 200, cors);
  };
}

export default createHandler();
