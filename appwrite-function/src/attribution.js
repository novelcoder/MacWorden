const SOURCE_KEY_PATTERN = /^[a-z0-9](?:[a-z0-9_]{0,62}[a-z0-9])?$/;
const SERIES_KEY_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const SIGNUP_PATH_PATTERN = /^(?:\/$|\/[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*)$/;
const FIELD_KEY_PATTERN = /^[a-z0-9_]{1,64}$/;

const FIELD_ENVIRONMENT_NAMES = {
  firstSource: 'MAILERLITE_MAC_SIGNUP_SOURCE_FIRST_FIELD_KEY',
  firstSeries: 'MAILERLITE_MAC_SIGNUP_SERIES_FIRST_FIELD_KEY',
  firstPath: 'MAILERLITE_MAC_SIGNUP_PATH_FIRST_FIELD_KEY',
  latestSource: 'MAILERLITE_MAC_SIGNUP_SOURCE_LATEST_FIELD_KEY',
  latestSeries: 'MAILERLITE_MAC_SIGNUP_SERIES_LATEST_FIELD_KEY',
  latestPath: 'MAILERLITE_MAC_SIGNUP_PATH_LATEST_FIELD_KEY',
};

function parseAllowlist(value, pattern) {
  if (typeof value !== 'string' || !value.trim()) return new Set();

  return new Set(
    value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => pattern.test(item))
  );
}

export function readAttributionConfig(environment = process.env) {
  return {
    allowedSourceKeys: parseAllowlist(
      environment.MAC_NEWSLETTER_ALLOWED_SOURCE_KEYS,
      SOURCE_KEY_PATTERN
    ),
    allowedSeriesKeys: parseAllowlist(
      environment.MAC_NEWSLETTER_ALLOWED_SERIES_KEYS,
      SERIES_KEY_PATTERN
    ),
  };
}

export function readAttributionFieldKeys(environment = process.env) {
  const entries = Object.entries(FIELD_ENVIRONMENT_NAMES).map(([name, environmentName]) => [
    name,
    environment[environmentName]?.trim() || '',
  ]);
  const configuredCount = entries.filter(([, value]) => value).length;

  if (configuredCount === 0) {
    return { fieldKeys: null, error: null };
  }

  if (
    configuredCount !== entries.length ||
    entries.some(([, value]) => !FIELD_KEY_PATTERN.test(value))
  ) {
    return {
      fieldKeys: null,
      error:
        'All six Mac newsletter attribution field-key variables must be configured with lowercase MailerLite field keys.',
    };
  }

  return { fieldKeys: Object.fromEntries(entries), error: null };
}

function normalizeSourceKey(value, allowedSourceKeys) {
  if (typeof value !== 'string' || !SOURCE_KEY_PATTERN.test(value)) return undefined;
  return allowedSourceKeys.has(value) ? value : undefined;
}

function normalizeSeries(value, allowedSeriesKeys) {
  if (typeof value !== 'string' || !SERIES_KEY_PATTERN.test(value)) return undefined;
  return allowedSeriesKeys.has(value) ? value : undefined;
}

function normalizePath(value) {
  if (typeof value !== 'string' || value.length > 160) return undefined;

  const normalized = value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value;
  return SIGNUP_PATH_PATTERN.test(normalized) ? normalized : undefined;
}

export function normalizeAttribution(value, config) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return {
    sourceKey: normalizeSourceKey(value.sourceKey, config.allowedSourceKeys),
    series: normalizeSeries(value.series, config.allowedSeriesKeys),
    path: normalizePath(value.path),
  };
}

function existingFieldValues(subscriber) {
  if (!subscriber || !Array.isArray(subscriber.fields)) return new Map();

  return new Map(
    subscriber.fields
      .filter(
        (field) =>
          field &&
          typeof field === 'object' &&
          typeof field.key === 'string' &&
          typeof field.value === 'string'
      )
      .map((field) => [field.key, field.value])
  );
}

function hasAttribution(attribution) {
  return Boolean(attribution.sourceKey || attribution.series || attribution.path);
}

export function buildMailerLitePayload({
  email,
  attribution = {},
  fieldKeys = null,
  existingSubscriber = null,
  writeFirstTouch = true,
}) {
  const payload = {
    email,
    resubscribe: true,
    autoresponders: true,
  };

  if (!fieldKeys || !hasAttribution(attribution)) return payload;

  const fields = {};
  const existing = existingFieldValues(existingSubscriber);
  const hasRecordedFirstTouch = [
    fieldKeys.firstSource,
    fieldKeys.firstSeries,
    fieldKeys.firstPath,
  ].some((key) => existing.get(key)?.trim());

  if (writeFirstTouch && !hasRecordedFirstTouch) {
    if (attribution.sourceKey) fields[fieldKeys.firstSource] = attribution.sourceKey;
    if (attribution.series) fields[fieldKeys.firstSeries] = attribution.series;
    if (attribution.path) fields[fieldKeys.firstPath] = attribution.path;
  }

  if (attribution.sourceKey) fields[fieldKeys.latestSource] = attribution.sourceKey;
  if (attribution.series) fields[fieldKeys.latestSeries] = attribution.series;
  if (attribution.path) fields[fieldKeys.latestPath] = attribution.path;

  if (Object.keys(fields).length) payload.fields = fields;
  return payload;
}
