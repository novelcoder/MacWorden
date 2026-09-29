# Mac Worden newsletter signup events

When MailerLite accepts a reader-list signup, the `MacWordenMailerLite` Appwrite function
writes one anonymous row to the shared `newsletter_signup_events` table. That is the whole
feature: a count of accepted signup requests by site, day, source and page. It does not
distinguish new, existing or resubscribed readers, and it adds nothing to MailerLite.

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
