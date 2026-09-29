import assert from 'node:assert/strict';
import test from 'node:test';
import { createHandler } from '../src/index.js';
import {
  buildSignupEvent,
  chicagoDate,
  createAppwriteTables,
  normalizeSignupPath,
  parseMacGoogleSourceKey,
} from '../src/signupEvent.js';

const ENABLED_KEY = 'gads_mw_jc_b1_2026_09';
const DISABLED_KEY = 'gads_mw_preorders_2026_09';

const env = {
  MAILERLITE_API_KEY: 'test-api-key',
  MAILERLITE_GROUP_ID: '12345',
  APPWRITE_FUNCTION_API_ENDPOINT: 'https://appwrite.test/v1',
  APPWRITE_FUNCTION_PROJECT_ID: 'project-id',
};

const mockRes = { json: (body, status, headers) => ({ body, status, headers }) };

function fakeTables({ enabled = [ENABLED_KEY], failWrite = false, failLookup = false } = {}) {
  const events = [];
  const lookups = [];
  return {
    events,
    lookups,
    factory: () => ({
      async hasEnabledRoute(key) {
        lookups.push(key);
        if (failLookup) throw new Error('route lookup status 500');
        return enabled.includes(key);
      },
      async createEvent(data) {
        if (failWrite) throw new Error('event write status 500');
        events.push(data);
      },
    }),
  };
}

async function run(body, { mailerLiteStatus = 200, tables = fakeTables() } = {}) {
  const originalFetch = globalThis.fetch;
  const saved = Object.fromEntries(Object.keys(env).map((k) => [k, process.env[k]]));
  Object.assign(process.env, env);
  const mailerLiteCalls = [];
  const logs = [];
  globalThis.fetch = async (url, options) => {
    mailerLiteCalls.push({ url: String(url), body: JSON.parse(options.body) });
    return new Response('{}', { status: mailerLiteStatus });
  };
  try {
    const result = await createHandler({ createTables: tables.factory })({
      req: { method: 'POST', headers: { 'x-appwrite-key': 'dynamic-key' }, body: JSON.stringify(body) },
      res: mockRes,
      log: (m) => logs.push(m),
      error: (m) => logs.push(m),
    });
    return { result, mailerLiteCalls, logs, events: tables.events, lookups: tables.lookups };
  } finally {
    globalThis.fetch = originalFetch;
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test('a valid enabled Mac Google source becomes google_ads with the exact key', async () => {
  const { result, events } = await run({
    email: 'reader@example.com',
    source_key: ENABLED_KEY,
    signup_path: '/series/jack-and-cocoa/',
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(events.length, 1);
  assert.deepEqual(Object.keys(events[0]).sort(), [
    'event_date', 'signup_path', 'site_key', 'source_key', 'source_type',
  ]);
  assert.equal(events[0].site_key, 'mac_worden');
  assert.equal(events[0].source_type, 'google_ads');
  assert.equal(events[0].source_key, ENABLED_KEY);
  assert.equal(events[0].signup_path, '/series/jack-and-cocoa');
  assert.match(events[0].event_date, /^\d{4}-\d{2}-\d{2}$/);
});

for (const [label, sourceKey] of [
  ['absent', undefined],
  ['malformed', 'GADS_MW_BAD!'],
  ['duplicate (array)', [ENABLED_KEY, ENABLED_KEY]],
  ['spoofed (no route)', 'gads_mw_made_up_2026_09'],
  ['disabled', DISABLED_KEY],
  ['non-Google', 'meta_mw_jc_b1_2026_09'],
  ['other brand', 'gads_sm_b1_2026_09'],
]) {
  test(`${label} source becomes website_unattributed without a source key`, async () => {
    const { events } = await run({ email: 'reader@example.com', source_key: sourceKey, signup_path: '/' });
    assert.equal(events.length, 1);
    assert.equal(events[0].source_type, 'website_unattributed');
    assert.equal('source_key' in events[0], false);
  });
}

test('only syntactically valid Mac Google keys are looked up', async () => {
  const { lookups } = await run({ email: 'reader@example.com', source_key: 'gads_sm_b1_2026_09' });
  assert.deepEqual(lookups, []);
});

test('a MailerLite failure creates no event and reports failure', async () => {
  const { result, events } = await run(
    { email: 'reader@example.com', source_key: ENABLED_KEY, signup_path: '/' },
    { mailerLiteStatus: 500 }
  );
  assert.equal(result.status, 502);
  assert.equal(events.length, 0);
});

test('MailerLite receives only the email with resubscribe and autoresponders', async () => {
  const { mailerLiteCalls } = await run({
    email: ' reader@example.com ',
    source_key: ENABLED_KEY,
    signup_path: '/',
    gclid: 'raw-click-id',
  });
  assert.equal(mailerLiteCalls.length, 1);
  assert.match(mailerLiteCalls[0].url, /\/groups\/12345\/subscribers$/);
  assert.deepEqual(mailerLiteCalls[0].body, {
    email: 'reader@example.com',
    resubscribe: true,
    autoresponders: true,
  });
});

test('an event write failure still returns success and logs no PII', async () => {
  const { result, logs } = await run(
    { email: 'reader@example.com', source_key: ENABLED_KEY, signup_path: '/' },
    { tables: fakeTables({ failWrite: true }) }
  );
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.ok(logs.some((m) => m.startsWith('Newsletter signup event was not recorded')));
  assert.equal(JSON.stringify(logs).includes('reader@example.com'), false);
});

test('a route lookup failure still returns success', async () => {
  const { result, events } = await run(
    { email: 'reader@example.com', source_key: ENABLED_KEY },
    { tables: fakeTables({ failLookup: true }) }
  );
  assert.equal(result.status, 200);
  assert.equal(events.length, 0);
});

test('event payload and logs never contain the email or click identifiers', async () => {
  const { events, logs } = await run({
    email: 'reader@example.com',
    source_key: ENABLED_KEY,
    signup_path: '/?email=reader@example.com',
    gclid: 'raw-click-id',
  });
  const serialized = JSON.stringify({ events, logs });
  assert.equal(serialized.includes('reader@example.com'), false);
  assert.equal(serialized.includes('raw-click-id'), false);
  assert.equal(events[0].signup_path, '/unknown');
});

test('invalid email is rejected before MailerLite or Appwrite', async () => {
  const { result, mailerLiteCalls, events } = await run({ email: 'not-an-email' });
  assert.equal(result.status, 400);
  assert.equal(mailerLiteCalls.length, 0);
  assert.equal(events.length, 0);
});

test('only canonical local pathnames are retained', () => {
  assert.equal(normalizeSignupPath('/'), '/');
  assert.equal(normalizeSignupPath('/books/stray-evidence/'), '/books/stray-evidence');
  for (const bad of [
    'https://evil.example/', '//evil.example', '/Books', '/a?b=c', '/a#b', '/a/../b', '', null, 42,
    `/${'a'.repeat(300)}`,
  ]) {
    assert.equal(normalizeSignupPath(bad), '/unknown', String(bad));
  }
});

test('Mac Google key parsing requires gads_ prefix and mw brand segment', () => {
  assert.equal(parseMacGoogleSourceKey(ENABLED_KEY), ENABLED_KEY);
  assert.equal(parseMacGoogleSourceKey('gads_sm_b1_2026_09'), null);
  assert.equal(parseMacGoogleSourceKey('mw_gads_2026'), null);
  assert.equal(parseMacGoogleSourceKey('gads_mw_'), null);
});

test('event dates align to America/Chicago', () => {
  // 03:00 UTC on Sept 30 is still Sept 29 in Chicago.
  assert.equal(chicagoDate(new Date('2026-09-30T03:00:00Z')), '2026-09-29');
  assert.equal(chicagoDate(new Date('2026-09-30T06:00:00Z')), '2026-09-30');
});

test('Mac and Jamie unattributed events stay distinguishable by site_key', async () => {
  const event = await buildSignupEvent({ signupPath: '/', hasEnabledRoute: async () => false });
  assert.equal(event.site_key, 'mac_worden');
  assert.notEqual(event.site_key, 'jamie_mcfarlane');
});

test('Appwrite REST client uses the dynamic key and TablesDB endpoints', async () => {
  const calls = [];
  const tables = createAppwriteTables({
    endpoint: 'https://appwrite.test/v1',
    projectId: 'project-id',
    apiKey: 'dynamic-key',
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), options });
      return new Response(JSON.stringify({ total: 1, rows: [{}] }), { status: 200 });
    },
  });

  assert.equal(await tables.hasEnabledRoute(ENABLED_KEY), true);
  await tables.createEvent({ site_key: 'mac_worden' });

  assert.match(calls[0].url, /\/tablesdb\/6a0b628900008b8506e3\/tables\/attribution_routes\/rows\?queries/);
  assert.ok(decodeURIComponent(calls[0].url).includes(`"values":["${ENABLED_KEY}"]`));
  assert.ok(decodeURIComponent(calls[0].url).includes('"attribute":"enabled","values":[true]'));
  assert.equal(calls[0].options.headers['X-Appwrite-Key'], 'dynamic-key');
  assert.match(calls[1].url, /\/tables\/newsletter_signup_events\/rows$/);
  assert.equal(calls[1].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    rowId: 'unique()',
    data: { site_key: 'mac_worden' },
  });
});
