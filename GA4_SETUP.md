# GA4 setup

The site reads the GA4 measurement ID from `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` at build time. Set it in the Appwrite Sites environment using the `G-XXXXXXXXXX` format. Do not put the real value in a tracked environment file.

The in-site consent UI uses basic consent mode: it does not load Google's tag or send anything to Google Analytics until a visitor explicitly allows analytics. Advertising storage, advertising user data, and ad personalization remain denied.

## Required GA4 data-stream settings

This application records one manual `page_view` per Next.js route navigation and a curated retailer-link event. In the GA4 web data stream's Enhanced Measurement settings:

1. Open the Page views advanced settings and turn off **Page changes based on browser history events**.
2. Turn off **Outbound clicks**.
3. Leave Google Signals disabled.

These property-side settings prevent GA4 from duplicating the application's manual route views or retailer-link events. They cannot be enforced by the website code.

## Events

- `page_view`: one sanitized page location per route navigation; URL queries and fragments are omitted.
- `view_item_list`: series or books shown in a list.
- `select_item`: a series or book selected from a list.
- `view_item`: a specific book section opened through a book link.
- `retailer_link_click`: an outbound retailer link selected; this is not a purchase.
- `reader_list_cta_click`: a link to the reader-list form selected; this is not a completed signup.

No event includes a name, email address, form contents, or full outbound URL.
