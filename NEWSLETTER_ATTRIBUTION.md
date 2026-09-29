# Mac Worden newsletter attribution

Newsletter attribution is deliberately scoped to Mac Worden. The existing
`MAILERLITE_GROUP_ID` remains the delivery, resubscribe, and autoresponder group;
this implementation does not create or reuse a Jamie McFarlane group.

## Captured context

The public URL accepts a first-party `source_key`. Its format matches the shared
convention used by the Jamie site: 1–64 lowercase ASCII letters, digits, and
underscores, beginning and ending with a letter or digit. A syntactically valid
key is not trusted by itself: the Appwrite function accepts it only when it is
listed in `MAC_NEWSLETTER_ALLOWED_SOURCE_KEYS`.

The browser keeps only a syntactically valid source key and the last Mac series
slug visited in tab-scoped session storage. At form submission it sends those
values plus the normalized form pathname. It does not collect or send `gclid`,
`gbraid`, `wbraid`, a tracking template, or any other query parameter.

The Appwrite function independently validates all three values. Series values
must be listed in `MAC_NEWSLETTER_ALLOWED_SERIES_KEYS`; paths must be local,
lowercase paths made only of URL-safe slug segments. Invalid and non-allowlisted
values are discarded without preventing an otherwise valid organic signup.

## Repeated-subscriber behavior

The six fields retain both views of acquisition:

- First-touch fields are written only when none of the subscriber's first-touch
  fields already has a value. Existing first-touch data is never overwritten.
- Latest-touch fields are updated on each signup when the corresponding value is
  present and valid.
- An organic signup has no source key. It can still record a path and series, but
  it does not erase a previously recorded attributed source.
- For subscribers who predate this feature, “first” means the first signup
  observed after attribution is enabled, not necessarily their original signup.
- If the pre-upsert subscriber lookup fails, signup continues with latest-touch
  fields only so a transient lookup failure cannot overwrite first touch or block
  the reader-list request.

## MailerLite prerequisite

Before enabling attribution in production, create these six **text** fields in
the Mac Worden MailerLite account:

1. `Mac Signup Source First`
2. `Mac Signup Series First`
3. `Mac Signup Path First`
4. `Mac Signup Source Latest`
5. `Mac Signup Series Latest`
6. `Mac Signup Path Latest`

Do not assume MailerLite's generated keys. Read the actual keys back from the
MailerLite field list and assign them to the six
`MAILERLITE_MAC_SIGNUP_*_FIELD_KEY` function variables documented in
`appwrite-function/.env.example`. Configure both allowlists at the same time.
Attribution enrichment stays off unless every field key is present and valid;
ordinary email subscription through the existing Mac group continues.
