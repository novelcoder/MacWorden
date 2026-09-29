import assert from 'node:assert/strict';
import test from 'node:test';
import handler from '../src/index.js';

const attributionEnvironment = {
  MAILERLITE_API_KEY: 'test-api-key',
  MAILERLITE_GROUP_ID: '12345',
  MAC_NEWSLETTER_ALLOWED_SOURCE_KEYS: 'gads_jc_b1_2026_09',
  MAC_NEWSLETTER_ALLOWED_SERIES_KEYS: 'jack-and-coke',
  MAILERLITE_MAC_SIGNUP_SOURCE_FIRST_FIELD_KEY: 'mac_signup_source_first',
  MAILERLITE_MAC_SIGNUP_SERIES_FIRST_FIELD_KEY: 'mac_signup_series_first',
  MAILERLITE_MAC_SIGNUP_PATH_FIRST_FIELD_KEY: 'mac_signup_path_first',
  MAILERLITE_MAC_SIGNUP_SOURCE_LATEST_FIELD_KEY: 'mac_signup_source_latest',
  MAILERLITE_MAC_SIGNUP_SERIES_LATEST_FIELD_KEY: 'mac_signup_series_latest',
  MAILERLITE_MAC_SIGNUP_PATH_LATEST_FIELD_KEY: 'mac_signup_path_latest',
};

function mockResponse() {
  return {
    json(body, status, headers) {
      return { body, status, headers };
    },
  };
}

test('handler sends only validated attribution through the MailerLite group upsert', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnvironment = Object.fromEntries(
    Object.keys(attributionEnvironment).map((key) => [key, process.env[key]])
  );
  const calls = [];

  Object.assign(process.env, attributionEnvironment);
  const logs = [];
  const errors = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (options.method !== 'POST') return new Response('', { status: 404 });
    return new Response('{}', { status: 200 });
  };

  try {
    const result = await handler({
      req: {
        method: 'POST',
        body: JSON.stringify({
          email: 'reader@example.com',
          attribution: {
            sourceKey: 'gads_jc_b1_2026_09',
            series: 'jack-and-coke',
            path: '/',
            gclid: 'raw-click-id',
            wbraid: 'raw-braid-id',
          },
        }),
      },
      res: mockResponse(),
      log(message) {
        logs.push(message);
      },
      error(message) {
        errors.push(message);
      },
    });

    assert.equal(result.status, 200);
    assert.equal(calls.length, 2);
    assert.match(calls[0].url, /\/subscribers\/reader%40example\.com$/);
    assert.match(calls[1].url, /\/groups\/12345\/subscribers$/);

    const payload = JSON.parse(calls[1].options.body);
    assert.equal(payload.fields.mac_signup_source_first, 'gads_jc_b1_2026_09');
    assert.equal(payload.fields.mac_signup_series_latest, 'jack-and-coke');
    assert.equal(JSON.stringify(payload).includes('gclid'), false);
    assert.equal(JSON.stringify(payload).includes('wbraid'), false);
    assert.equal(JSON.stringify({ logs, errors }).includes('reader@example.com'), false);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('handler does not persist subscriber details from a MailerLite failure in logs', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnvironment = Object.fromEntries(
    Object.keys(attributionEnvironment).map((key) => [key, process.env[key]])
  );
  const logs = [];
  const errors = [];

  Object.assign(process.env, attributionEnvironment);
  globalThis.fetch = async (_url, options = {}) => {
    if (options.method !== 'POST') return new Response('', { status: 404 });
    return new Response('{"message":"reader@example.com already exists"}', { status: 422 });
  };

  try {
    const result = await handler({
      req: {
        method: 'POST',
        body: JSON.stringify({ email: 'reader@example.com' }),
      },
      res: mockResponse(),
      log(message) {
        logs.push(message);
      },
      error(message) {
        errors.push(message);
      },
    });

    assert.equal(result.status, 502);
    assert.deepEqual(result.body, { error: 'Subscription failed' });
    assert.equal(JSON.stringify({ logs, errors, response: result.body }).includes('reader@example.com'), false);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
