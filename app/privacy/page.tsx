import type { Metadata } from "next";
import Link from "next/link";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Privacy & Cookies",
  description: "How the Mac Worden website handles reader-list information and optional analytics.",
};

export default function PrivacyPage() {
  return (
    <section id="privacy" className={styles.privacy} data-screen-label="Privacy & Cookies">
      <div className={styles.wrap}>
        <p className={styles.eyebrow}>The Fine Print</p>
        <h1 className={styles.title}>
          Privacy
          <br />
          <em>&amp; Cookies</em>
        </h1>
        <p className={styles.stamp}>Last updated · September 23, 2026</p>

        <p className={styles.lede}>
          You can browse this site without allowing analytics. If you join Mac&rsquo;s reader list,
          your email is used for that list; if you allow analytics, limited usage data helps us
          understand which pages and books readers find useful.
        </p>

        <div className={styles.section}>
          <h2 data-num="01">Who runs this site</h2>
          <p>
            This site is operated by <strong>Mac Worden</strong>, an independent mystery and
            thriller author, with help from a small team. Questions can be sent to the contact
            address below.
          </p>
        </div>

        <div className={styles.section}>
          <h2 data-num="02">Reader list</h2>
          <p>
            The reader-list form collects the email address you choose to submit. It is used to
            deliver the offered ebook and send Mac Worden book news. The form is handled through
            the site&rsquo;s service providers, and every mailing includes an unsubscribe option.
            The address is not sent to Google Analytics.
          </p>
        </div>

        <div className={styles.section}>
          <h2 data-num="03">Optional analytics</h2>
          <p>
            Google Analytics 4 loads only after you select <strong>Allow analytics</strong>. It can
            receive the page path and title, a referring page, the date and time, approximate
            location, browser and device information, and selected interactions with series,
            books, reader-list links, and outbound retailer links.
          </p>
          <p>
            Interaction details are limited to non-personal context such as an item ID and name,
            list name, placement, destination domain, link text, and content format. We do not send
            names, email addresses, form contents, URL query strings, or purchase claims to
            Analytics. A retailer-link event means only that the link was selected.
          </p>
          <p>
            Google receives an IP address during transmission to derive approximate location, then
            discards it before the address is logged. Google&rsquo;s handling of Analytics data is
            described in its{" "}
            <a
              href="https://support.google.com/analytics/answer/6004245"
              target="_blank"
              rel="noopener noreferrer"
            >
              Analytics privacy documentation
            </a>
            .
          </p>
        </div>

        <div className={styles.section}>
          <h2 data-num="04">Cookies</h2>
          <ul className={styles.list}>
            <li>
              <strong>macworden_analytics_consent</strong> stores only whether you allowed or
              declined analytics. It is a first-party preference cookie kept for six months with
              a site-wide path, SameSite=Lax, and Secure protection on HTTPS.
            </li>
            <li>
              <strong>_ga and _ga_*</strong> are first-party Google Analytics cookies that hold
              pseudonymous visitor and session identifiers. They are created only after consent
              and are configured to expire within six months of the first analytics-enabled visit.
            </li>
          </ul>
          <p>
            Withdrawing consent disables Analytics and removes accessible first-party _ga cookies
            from this site.
          </p>
        </div>

        <div className={styles.section}>
          <h2 data-num="05">Advertising and retailer measurement</h2>
          <p>
            Analytics advertising storage, advertising user data, and ad personalization remain
            denied even when analytics is allowed. Google Signals and advertising-personalization
            signals are also disabled.
          </p>
          <p>
            Some paid links to this site include a limited first-party <strong>source_key</strong>
            campaign marker. The site can carry a valid marker between relevant Mac Worden pages
            and, only when you choose a retailer purchase or preorder button, select the matching
            book-specific Amazon Attribution link. Merely landing on or browsing the site does not
            contact an Amazon Attribution link.
          </p>
          <p>
            The campaign marker is not a Google click identifier and does not contain an email
            address. Google click identifiers, UTM values, and unrelated page parameters are not
            appended to Amazon links. Amazon receives the normal request information only after
            you choose the outbound link and reports aggregated retailer activity through Amazon
            Attribution. This routing works independently of the optional Google Analytics choice.
          </p>
        </div>

        <div className={styles.section}>
          <h2 data-num="06">Your choice</h2>
          <p>
            Analytics is optional. Declining it does not affect site functionality. Use the
            persistent <strong>Cookie settings</strong> control in the footer to allow, decline, or
            withdraw consent later. You can also clear cookies in your browser.
          </p>
        </div>

        <div className={styles.section}>
          <h2 data-num="07">Changes</h2>
          <p>
            If this policy or the site&rsquo;s data practices change materially, this page and its
            last-updated date will be revised.
          </p>
        </div>

        <div className={styles.contact}>
          <p className={styles.contactLabel}>Questions, requests, or corrections</p>
          <p className={styles.contactBody}>
            Write to <a href="mailto:macworden@fickledragon.com">macworden@fickledragon.com</a>.
          </p>
        </div>

        <Link href="/" className={styles.back}>
          Back to the site
        </Link>
      </div>
    </section>
  );
}
