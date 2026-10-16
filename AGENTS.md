<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Verify in a browser before opening a PR

Unit tests and `tsc` are not enough for changes that affect page behavior (UI, analytics events, routing, forms). Before opening a PR, run the app locally (`npx next dev`) and load the change in a real browser. Exercise the actual flow, confirm the expected result (for analytics, the events pushed to `window.dataLayer`), and note what you checked in the PR test plan. If you could not verify it in a browser, say so in the PR.
