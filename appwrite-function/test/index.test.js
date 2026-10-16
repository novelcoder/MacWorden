import assert from 'node:assert/strict';
import test from 'node:test';
import { createHandler } from '../src/index.js';
import { normalizeAndValidateEmail } from '../src/email.js';
import { mailerLiteConfig, resolveSite } from '../src/sites.js';
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
  MAILERLITE_GROUP_ID_JAMIEMCFARLANE: '67890',
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

async function run(
  body,
  { mailerLiteStatus = 200, tables = fakeTables(), headers = {}, extraEnv = {}, removeEnv = [] } = {}
) {
  const originalFetch = globalThis.fetch;
  const merged = { ...env, ...extraEnv };
  const touched = [...Object.keys(merged), ...removeEnv];
  const saved = Object.fromEntries(touched.map((k) => [k, process.env[k]]));
  Object.assign(process.env, merged);
  for (const k of removeEnv) delete process.env[k];
  const mailerLiteCalls = [];
  const logs = [];
  globalThis.fetch = async (url, options) => {
    mailerLiteCalls.push({
      url: String(url),
      body: JSON.parse(options.body),
      apiKey: options.headers['X-MailerLite-ApiKey'],
    });
    return new Response('{}', { status: mailerLiteStatus });
  };
  try {
    const result = await createHandler({ createTables: tables.factory })({
      req: {
        method: 'POST',
        headers: { 'x-appwrite-key': 'dynamic-key', ...headers },
        body: JSON.stringify(body),
      },
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

test('a request without a site keeps the original Mac Worden behaviour', async () => {
  const { mailerLiteCalls, events } = await run({ email: 'reader@example.com', signup_path: '/' });
  assert.match(mailerLiteCalls[0].url, /\/groups\/12345\/subscribers$/);
  assert.equal(events[0].site_key, 'mac_worden');
});

test('site selects the MailerLite group and labels the event', async () => {
  const { mailerLiteCalls, events } = await run({
    site: 'jamiemcfarlane',
    email: 'reader@example.com',
    signup_path: '/',
  });
  assert.match(mailerLiteCalls[0].url, /\/groups\/67890\/subscribers$/);
  assert.equal(events[0].site_key, 'jamie_mcfarlane');
});

test('a group ID in the request is ignored and unknown sites are rejected', async () => {
  const { mailerLiteCalls } = await run({
    site: 'macworden',
    group_id: '999',
    email: 'reader@example.com',
  });
  assert.match(mailerLiteCalls[0].url, /\/groups\/12345\//);

  for (const site of ['evil', '', 42, '__proto__', 'constructor']) {
    const { result, mailerLiteCalls: calls, events } = await run({ site, email: 'reader@example.com' });
    assert.equal(result.status, 400, String(site));
    assert.equal(calls.length, 0);
    assert.equal(events.length, 0);
  }
});

test('a site can use its own MailerLite key, otherwise the shared one', async () => {
  const own = await run(
    { site: 'jamiemcfarlane', email: 'reader@example.com' },
    { extraEnv: { MAILERLITE_API_KEY_JAMIEMCFARLANE: 'jamie-key' } }
  );
  assert.equal(own.mailerLiteCalls[0].apiKey, 'jamie-key');

  const shared = await run({ site: 'jamiemcfarlane', email: 'reader@example.com' });
  assert.equal(shared.mailerLiteCalls[0].apiKey, 'test-api-key');
});

test('a site with no group configured fails without calling MailerLite', async () => {
  const { result, mailerLiteCalls, events } = await run(
    { site: 'jamiemcfarlane', email: 'reader@example.com' },
    { removeEnv: ['MAILERLITE_GROUP_ID_JAMIEMCFARLANE'] }
  );
  assert.equal(result.status, 503);
  assert.equal(mailerLiteCalls.length, 0);
  assert.equal(events.length, 0);
});

test('Jamie google keys need only the gads_ prefix and an enabled route, never an mw key', async () => {
  const key = 'gads_sm_b1_2026_09';
  const { events } = await run(
    { site: 'jamiemcfarlane', email: 'reader@example.com', source_key: key, signup_path: '/' },
    { tables: fakeTables({ enabled: [key] }) }
  );
  assert.deepEqual(events[0], {
    site_key: 'jamie_mcfarlane',
    event_date: events[0].event_date,
    source_type: 'google_ads',
    source_key: key,
    signup_path: '/',
  });

  const noSegment = 'gads_pt_2026_10';
  const open = await run(
    { site: 'jamiemcfarlane', email: 'reader@example.com', source_key: noSegment, signup_path: '/' },
    { tables: fakeTables({ enabled: [noSegment] }) }
  );
  assert.equal(open.events[0].source_type, 'google_ads');

  // A Mac Worden key, even with an enabled route, is not a Jamie source.
  const macKey = 'gads_mw_jc_b1_2026_09';
  const other = await run(
    { site: 'jamiemcfarlane', email: 'reader@example.com', source_key: macKey, signup_path: '/' },
    { tables: fakeTables({ enabled: [macKey] }) }
  );
  assert.equal(other.events[0].source_type, 'website_unattributed');
  assert.equal('source_key' in other.events[0], false);
  assert.deepEqual(other.lookups, []);

  // And Jamie's keys are not Mac Worden sources.
  const mac = await run(
    { email: 'reader@example.com', source_key: key, signup_path: '/' },
    { tables: fakeTables({ enabled: [key] }) }
  );
  assert.equal(mac.events[0].source_type, 'website_unattributed');
});

test('a filled honeypot looks like success but contacts nothing', async () => {
  const { result, mailerLiteCalls, events } = await run({
    email: 'reader@example.com',
    website: 'http://spam.example',
  });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { success: true });
  assert.equal(mailerLiteCalls.length, 0);
  assert.equal(events.length, 0);

  const blank = await run({ email: 'reader@example.com', website: '   ' });
  assert.equal(blank.mailerLiteCalls.length, 1);
});

test('implausibly fast or malformed form timing is rejected, a plausible one passes', async () => {
  for (const elapsed_ms of [0, 200, 999, -5, 'fast', null, NaN]) {
    const { result, mailerLiteCalls } = await run({ email: 'reader@example.com', elapsed_ms });
    assert.equal(result.status, 400, String(elapsed_ms));
    assert.equal(mailerLiteCalls.length, 0);
  }
  const ok = await run({ email: 'reader@example.com', elapsed_ms: 4200 });
  assert.equal(ok.result.status, 200);
  assert.equal(ok.mailerLiteCalls.length, 1);
});

test('email validation accepts normal addresses and rejects malformed ones', () => {
  assert.equal(normalizeAndValidateEmail('  Reader@Example.COM '), 'reader@example.com');
  assert.equal(normalizeAndValidateEmail('first.last+tag@sub.example.co'), 'first.last+tag@sub.example.co');
  for (const bad of [
    '', 'a@b', '@example.com', 'a@@example.com', 'a b@example.com', '.a@example.com',
    'a.@example.com', 'a..b@example.com', 'a@exa mple.com', 'a@-example.com', 'a@example..com',
    `${'a'.repeat(65)}@example.com`, `a@${'b'.repeat(250)}.com`, 'a@example.com\nBcc: x@y.z', null, 42, {},
  ]) {
    assert.equal(normalizeAndValidateEmail(bad), null, String(bad));
  }
});

test('CORS reflects only the sites that use this function', async () => {
  const allowed = await run({ email: 'reader@example.com' }, { headers: { origin: 'https://www.macworden.com' } });
  assert.equal(allowed.result.headers['Access-Control-Allow-Origin'], 'https://www.macworden.com');

  const jamie = await run({ email: 'reader@example.com' }, { headers: { origin: 'https://jamiemcfarlane.com' } });
  assert.equal(jamie.result.headers['Access-Control-Allow-Origin'], 'https://jamiemcfarlane.com');

  for (const origin of ['https://evil.example', 'http://macworden.com', 'null', undefined]) {
    const { result } = await run({ email: 'reader@example.com' }, { headers: { origin } });
    assert.equal('Access-Control-Allow-Origin' in result.headers, false, String(origin));
    assert.equal(result.headers.Vary, 'Origin');
  }
});

test('site config only accepts numeric group IDs', () => {
  const site = resolveSite('macworden');
  assert.equal(mailerLiteConfig(site, { MAILERLITE_API_KEY: 'k', MAILERLITE_GROUP_ID: '12345' }).groupId, '12345');
  assert.equal(mailerLiteConfig(site, { MAILERLITE_API_KEY: 'k', MAILERLITE_GROUP_ID: '../x' }), null);
  assert.equal(mailerLiteConfig(site, { MAILERLITE_GROUP_ID: '12345' }), null);
  assert.equal(resolveSite(undefined).name, 'macworden');
  assert.equal(resolveSite('toString'), null);
});
