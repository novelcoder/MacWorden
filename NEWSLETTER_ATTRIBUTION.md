# Mac Worden newsletter signup events

When MailerLite accepts a reader-list signup, the `MacWordenMailerLite` Appwrite function
writes one anonymous row to the shared `newsletter_signup_events` table. That is the whole
feature: a count of accepted signup requests by site, day, source and page. It does not
distinguish new, existing or resubscribed readers, and it adds nothing to MailerLite.

## Request

The function serves both author sites. The form posts
`{ site, email, source_key?, signup_path, website, elapsed_ms }`:

- `site` is `macworden` or `jamiemcfarlane`; it picks the MailerLite group and the row's
  `site_key` server-side. A missing `site` means `macworden` (the original request shape).
  Unknown sites are rejected, and a group ID in the request is never used.
- `website` is a hidden honeypot. When filled, the function returns success without calling
  MailerLite or writing a row.
- `elapsed_ms` is the time the form was on screen. Under one second is rejected with a
  retryable error; a missing value is accepted for older forms.
- Browsers are limited by CORS to the two sites' origins.

## Responses

Success is `200 { success: true }`. Errors are `{ error, code }`, where `error` is
human-readable text and `code` is stable:

| status | code                       | when                                                   |
| ------ | -------------------------- | ------------------------------------------------------ |
| 400    | `invalid_request`          | the body is not a JSON object                          |
| 400    | `unknown_site`             | `site` is not `macworden` or `jamiemcfarlane`          |
| 400    | `invalid_email`            | the address is malformed, or MailerLite rejected it    |
| 400    | `try_again`                | `elapsed_ms` is under one second                       |
| 405    | `method_not_allowed`       | not `POST` or `OPTIONS`                                |
| 503    | `rate_limited`             | MailerLite returned 429; `Retry-After` is passed on    |
| 503    | `subscription_unavailable` | the site's MailerLite config is missing or rejected    |
| 502    | `provider_unavailable`     | MailerLite failed or could not be reached              |

## Row

| column        | value                                                              |
| ------------- | ------------------------------------------------------------------ |
| `site_key`    | always `mac_worden` (Jamie McFarlane's site writes `jamie_mcfarlane`) |
| `event_date`  | `YYYY-MM-DD` in `America/Chicago`                                  |
| `source_type` | `google_ads` or `website_unattributed`                             |
| `source_key`  | only for `google_ads`: the exact validated key                     |
| `signup_path` | the local pathname of the form, or `/unknown`                      |

The row never contains the email address, subscriber ID, name, IP address, click IDs,
UTM parameters, full URLs or MailerLite response data. The function never logs the email.

`website_unattributed` is not "organic": it also covers direct, referral and untagged
paid traffic.

## Source attribution

1. On page load the site keeps a single, syntactically valid Mac `source_key` (it must
   contain the `mw` segment) in tab-scoped `sessionStorage`, so it survives navigation.
2. The form posts `{ email, source_key?, signup_path }` to the function.
3. The function reports `google_ads` only when the key starts with `gads_`, contains the
   `mw` segment and has at least one **enabled** row in `attribution_routes`. Anything else
   (missing, malformed, duplicated, spoofed, disabled or non-Google) is
   `website_unattributed` with no `source_key`.

## Order and failure handling

- MailerLite is called first. If it rejects the request, no row is written and the reader
  sees the error.
- If the route lookup or row write fails after MailerLite succeeded, the function logs a
  generic "Newsletter signup event was not recorded" message and still returns success.

## Appwrite setup

- The function's execution scopes are `rows.read` and `rows.write`; it uses the dynamic
  per-execution key, so no API key variable is needed.
- The function needs only `MAILERLITE_API_KEY` and `MAILERLITE_GROUP_ID`.
- The function deploys from `main` (`/appwrite-function`).

Native Meta Lead Ads do not pass through this site and are out of scope; a future
integration could write `source_type: meta_lead_ad` with `site_key: mac_worden`.
