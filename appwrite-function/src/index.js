import { buildSignupEvent, createAppwriteTables } from './signupEvent.js';

const MAILERLITE_BASE_URL = 'https://api.mailerlite.com/api/v2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-appwrite-project, x-appwrite-jwt, x-appwrite-key',
};

function headerValue(headers, name) {
  if (!headers) return undefined;
  return headers[name] ?? headers[name.toLowerCase()];
}

// Records one anonymous event for a signup MailerLite already accepted. Failures are
// logged generically and never change the reader-facing result.
async function recordSignupEvent({ req, body, error, createTables }) {
  try {
    const tables = createTables({
      endpoint: process.env.APPWRITE_FUNCTION_API_ENDPOINT,
      projectId: process.env.APPWRITE_FUNCTION_PROJECT_ID,
      apiKey: headerValue(req.headers, 'x-appwrite-key'),
    });
    const event = await buildSignupEvent({
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
    const method = (req.method || '').toUpperCase();

    if (method === 'OPTIONS') {
      return res.json({}, 200, corsHeaders);
    }

    if (method !== 'POST') {
      return res.json({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return res.json({ error: 'Invalid request body' }, 400, corsHeaders);
    }

    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    if (!email || !email.includes('@')) {
      return res.json({ error: 'Invalid email address' }, 400, corsHeaders);
    }

    log('Processing newsletter subscription request.');

    const response = await fetch(
      `${MAILERLITE_BASE_URL}/groups/${process.env.MAILERLITE_GROUP_ID}/subscribers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MailerLite-ApiKey': process.env.MAILERLITE_API_KEY,
        },
        body: JSON.stringify({ email, resubscribe: true, autoresponders: true }),
      }
    );

    if (!response.ok) {
      error(`MailerLite subscription request failed with status ${response.status}.`);
      return res.json({ error: 'Subscription failed' }, 502, corsHeaders);
    }

    await recordSignupEvent({ req, body, error, createTables });

    return res.json({ success: true }, 200, corsHeaders);
  };
}

export default createHandler();
