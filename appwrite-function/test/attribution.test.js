import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMailerLitePayload,
  normalizeAttribution,
  readAttributionConfig,
  readAttributionFieldKeys,
} from '../src/attribution.js';

const fieldKeys = {
  firstSource: 'mac_signup_source_first',
  firstSeries: 'mac_signup_series_first',
  firstPath: 'mac_signup_path_first',
  latestSource: 'mac_signup_source_latest',
  latestSeries: 'mac_signup_series_latest',
  latestPath: 'mac_signup_path_latest',
};

const config = readAttributionConfig({
  MAC_NEWSLETTER_ALLOWED_SOURCE_KEYS: 'gads_jc_b1_2026_09,fb_hb_b1_2026_10',
  MAC_NEWSLETTER_ALLOWED_SERIES_KEYS: 'jack-and-coke,henry-biggston',
});

test('accepts allowlisted, normalized Mac attribution values', () => {
  assert.deepEqual(
    normalizeAttribution(
      {
        sourceKey: 'gads_jc_b1_2026_09',
        series: 'jack-and-coke',
        path: '/series/jack-and-coke/',
      },
      config
    ),
    {
      sourceKey: 'gads_jc_b1_2026_09',
      series: 'jack-and-coke',
      path: '/series/jack-and-coke',
    }
  );
});

test('allows absent attribution for organic signups', () => {
  assert.deepEqual(normalizeAttribution(undefined, config), {});
  assert.deepEqual(
    buildMailerLitePayload({ email: 'reader@example.com' }),
    {
      email: 'reader@example.com',
      resubscribe: true,
      autoresponders: true,
    }
  );
});

test('drops malformed attribution values without blocking the signup', () => {
  assert.deepEqual(
    normalizeAttribution(
      {
        sourceKey: 'GAds/Jack&Coke',
        series: '../jack-and-coke',
        path: '/series/jack-and-coke?gclid=raw-click-id',
      },
      config
    ),
    { sourceKey: undefined, series: undefined, path: undefined }
  );
});

test('drops a well-formed but non-allowlisted spoofed source and series', () => {
  assert.deepEqual(
    normalizeAttribution(
      {
        sourceKey: 'gads_fake_b1_2026_09',
        series: 'spaceship-mechanic',
        path: '/',
      },
      config
    ),
    { sourceKey: undefined, series: undefined, path: '/' }
  );
});

test('constructs a new-subscriber payload with first and latest touch fields only', () => {
  const attribution = normalizeAttribution(
    {
      sourceKey: 'gads_jc_b1_2026_09',
      series: 'jack-and-coke',
      path: '/',
      gclid: 'must-not-leave-the-server',
      trackingTemplate: '{lpurl}?gclid={gclid}',
    },
    config
  );
  const payload = buildMailerLitePayload({
    email: 'reader@example.com',
    attribution,
    fieldKeys,
  });

  assert.deepEqual(payload, {
    email: 'reader@example.com',
    resubscribe: true,
    autoresponders: true,
    fields: {
      mac_signup_source_first: 'gads_jc_b1_2026_09',
      mac_signup_series_first: 'jack-and-coke',
      mac_signup_path_first: '/',
      mac_signup_source_latest: 'gads_jc_b1_2026_09',
      mac_signup_series_latest: 'jack-and-coke',
      mac_signup_path_latest: '/',
    },
  });
  assert.equal(JSON.stringify(payload).includes('gclid'), false);
  assert.equal(JSON.stringify(payload).includes('trackingTemplate'), false);
});

test('preserves first touch and updates latest touch for a repeated subscriber', () => {
  const existingSubscriber = {
    email: 'reader@example.com',
    fields: [
      { key: fieldKeys.firstSource, value: 'fb_hb_b1_2026_10', type: 'TEXT' },
      { key: fieldKeys.firstSeries, value: 'henry-biggston', type: 'TEXT' },
      { key: fieldKeys.firstPath, value: '/series/henry-biggston', type: 'TEXT' },
    ],
  };
  const attribution = normalizeAttribution(
    {
      sourceKey: 'gads_jc_b1_2026_09',
      series: 'jack-and-coke',
      path: '/',
    },
    config
  );

  assert.deepEqual(
    buildMailerLitePayload({
      email: 'reader@example.com',
      attribution,
      fieldKeys,
      existingSubscriber,
    }).fields,
    {
      mac_signup_source_latest: 'gads_jc_b1_2026_09',
      mac_signup_series_latest: 'jack-and-coke',
      mac_signup_path_latest: '/',
    }
  );
});

test('does not risk first-touch data when the subscriber lookup is unavailable', () => {
  const attribution = normalizeAttribution(
    { sourceKey: 'gads_jc_b1_2026_09', series: 'jack-and-coke', path: '/' },
    config
  );

  assert.deepEqual(
    buildMailerLitePayload({
      email: 'reader@example.com',
      attribution,
      fieldKeys,
      writeFirstTouch: false,
    }).fields,
    {
      mac_signup_source_latest: 'gads_jc_b1_2026_09',
      mac_signup_series_latest: 'jack-and-coke',
      mac_signup_path_latest: '/',
    }
  );
});

test('requires all six Mac field keys before enabling MailerLite enrichment', () => {
  const incomplete = readAttributionFieldKeys({
    MAILERLITE_MAC_SIGNUP_SOURCE_FIRST_FIELD_KEY: fieldKeys.firstSource,
  });
  assert.equal(incomplete.fieldKeys, null);
  assert.match(incomplete.error, /All six/);

  const complete = readAttributionFieldKeys({
    MAILERLITE_MAC_SIGNUP_SOURCE_FIRST_FIELD_KEY: fieldKeys.firstSource,
    MAILERLITE_MAC_SIGNUP_SERIES_FIRST_FIELD_KEY: fieldKeys.firstSeries,
    MAILERLITE_MAC_SIGNUP_PATH_FIRST_FIELD_KEY: fieldKeys.firstPath,
    MAILERLITE_MAC_SIGNUP_SOURCE_LATEST_FIELD_KEY: fieldKeys.latestSource,
    MAILERLITE_MAC_SIGNUP_SERIES_LATEST_FIELD_KEY: fieldKeys.latestSeries,
    MAILERLITE_MAC_SIGNUP_PATH_LATEST_FIELD_KEY: fieldKeys.latestPath,
  });
  assert.deepEqual(complete, { fieldKeys, error: null });
});
