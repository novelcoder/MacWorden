export default async ({ req, res, log, error }) => {
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
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    email = body?.email?.trim();
  } catch {
    return res.json({ error: 'Invalid request body' }, 400, corsHeaders);
  }

  if (!email || !email.includes('@')) {
    return res.json({ error: 'Invalid email address' }, 400, corsHeaders);
  }

  log(`Subscribing: ${email}`);

  const response = await fetch(
    `https://api.mailerlite.com/api/v2/groups/${MAILERLITE_GROUP_ID}/subscribers`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MailerLite-ApiKey': MAILERLITE_API_KEY,
      },
      body: JSON.stringify({ email, resubscribe: true }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    error(`MailerLite error ${response.status}: ${text}`);
    return res.json({ error: 'Subscription failed' }, 502, corsHeaders);
  }

  return res.json({ success: true }, 200, corsHeaders);
};
