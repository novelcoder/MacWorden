export default async ({ req, res, log, error }) => {
  const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY;
  const MAILERLITE_GROUP_ID = process.env.MAILERLITE_GROUP_ID;

  if (req.method === 'OPTIONS') {
    return res.empty();
  }

  if (req.method !== 'POST') {
    return res.json({ error: 'Method not allowed' }, 405);
  }

  let email;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    email = body?.email?.trim();
  } catch {
    return res.json({ error: 'Invalid request body' }, 400);
  }

  if (!email || !email.includes('@')) {
    return res.json({ error: 'Invalid email address' }, 400);
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
    return res.json({ error: 'Subscription failed' }, 502);
  }

  return res.json({ success: true });
};
