// Email validation ported from jamiemcfarlane.com's `normalizeAndValidateEmail` so both
// sites accept and reject the same addresses.

const EMAIL_MAX_LENGTH = 254;
const EMAIL_LOCAL_PART_MAX_LENGTH = 64;
const EMAIL_LOCAL_PART_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i;
const DOMAIN_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

// Returns the trimmed, lower-cased address, or null when it is not valid.
export function normalizeAndValidateEmail(value) {
  if (typeof value !== 'string') return null;

  const email = value.trim().toLowerCase();
  if (!email || email.length > EMAIL_MAX_LENGTH) return null;

  const atIndex = email.indexOf('@');
  if (atIndex <= 0 || atIndex !== email.lastIndexOf('@')) return null;

  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);

  if (
    localPart.length > EMAIL_LOCAL_PART_MAX_LENGTH ||
    localPart.startsWith('.') ||
    localPart.endsWith('.') ||
    localPart.includes('..') ||
    !EMAIL_LOCAL_PART_PATTERN.test(localPart)
  ) {
    return null;
  }

  const labels = domain.split('.');
  if (labels.length < 2 || labels.some((label) => !DOMAIN_LABEL_PATTERN.test(label))) return null;

  return email;
}
