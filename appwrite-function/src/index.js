import {
  buildMailerLitePayload,
  normalizeAttribution,
  readAttributionConfig,
  readAttributionFieldKeys,
} from './attribution.js';

const MAILERLITE_BASE_URL = 'https://api.mailerlite.com/api/v2';

async function findExistingSubscriber(email, apiKey) {
  const response = await fetch(`${MAILERLITE_BASE_URL}/subscribers/${encodeURIComponent(email)}`, {
    headers: {
      Accept: 'application/json',
      'X-MailerLite-ApiKey': apiKey,
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`MailerLite subscriber lookup failed with status ${response.status}`);
  }

  return response.json();
}

async function subscribe({ req, res, log, error }) {
  const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY;
  const MAILERLITE_GROUP_ID = process.env.MAILERLITE_GROUP_ID;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-appwrite-project, x-appwrite-jwt, x-appwrite-key',
  };

  const method = (req.method || '').toUpperCase();
  log(`Method: ${method}`);

  if (method === 'OPTIONS') {
    return res.json({}, 200, corsHeaders);
  }

  if (method !== 'POST') {
    return res.json({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  let email;
  let attributionInput;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    email = body?.email?.trim();
    attributionInput = body?.attribution;
  } catch {
    return res.json({ error: 'Invalid request body' }, 400, corsHeaders);
  }

  if (!email || !email.includes('@')) {
    return res.json({ error: 'Invalid email address' }, 400, corsHeaders);
  }

  log('Processing newsletter subscription request.');

  const attribution = normalizeAttribution(attributionInput, readAttributionConfig());
  const { fieldKeys, error: fieldConfigurationError } = readAttributionFieldKeys();
  let existingSubscriber = null;
  let writeFirstTouch = true;

  if (fieldConfigurationError) {
    error(fieldConfigurationError);
  } else if (fieldKeys && (attribution.sourceKey || attribution.series || attribution.path)) {
    try {
      existingSubscriber = await findExistingSubscriber(email, MAILERLITE_API_KEY);
    } catch (lookupError) {
      writeFirstTouch = false;
      error(`${lookupError.message}; continuing with latest-touch attribution only.`);
    }
  }

  const payload = buildMailerLitePayload({
    email,
    attribution,
    fieldKeys,
    existingSubscriber,
    writeFirstTouch,
  });

  const response = await fetch(
    `${MAILERLITE_BASE_URL}/groups/${MAILERLITE_GROUP_ID}/subscribers`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MailerLite-ApiKey': MAILERLITE_API_KEY,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    error(`MailerLite subscription request failed with status ${response.status}.`);
    return res.json({ error: 'Subscription failed' }, 502, corsHeaders);
  }

  return res.json({ success: true }, 200, corsHeaders);
}

export default subscribe;
