// The only file that knows how MailerLite is called. Changing provider means changing the
// base URL, auth header and request shape here, plus the per-site env vars in sites.js.

export const MAILERLITE_BASE_URL = 'https://api.mailerlite.com/api/v2';
const REQUEST_TIMEOUT_MS = 10_000;

// Subscribes `email` to the group. Returns { ok: true } or { ok: false, status }, where
// status is 0 when MailerLite could not be reached.
export async function subscribeToGroup({ apiKey, groupId, email, fetchImpl = fetch }) {
  let response;
  try {
    response = await fetchImpl(`${MAILERLITE_BASE_URL}/groups/${groupId}/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MailerLite-ApiKey': apiKey,
      },
      body: JSON.stringify({ email, resubscribe: true, autoresponders: true }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, status: 0 };
  }
  return response.ok ? { ok: true } : { ok: false, status: response.status };
}
