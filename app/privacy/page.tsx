import type { Metadata } from "next";
import Link from "next/link";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <section id="privacy" className={styles.privacy} data-screen-label="Privacy">
      <div className={styles.wrap}>
        <p className={styles.eyebrow}>The Fine Print</p>
        <h1 className={styles.title}>
          Privacy
          <br />
          <em>Policy</em>
        </h1>
        <p className={styles.stamp}>Last updated · May 2026</p>

        <p className={styles.lede}>
          The short version: Mac will use your email to send you news about <em>his own books</em>{" "}
          &mdash; and nothing else. No selling, no sharing, no surprises. The long version is
          below.
        </p>

        <div className={styles.section}>
          <h2 data-num="01">Who this policy is from</h2>
          <p>
            This site is operated by <strong>Mac Worden</strong>, an independent author of
            mystery and thriller novels. When this policy says &ldquo;we&rdquo; or &ldquo;the
            author,&rdquo; it means Mac and the small group of people who help him run the website
            and mailing list.
          </p>
        </div>

        <div className={styles.section}>
          <h2 data-num="02">What we collect</h2>
          <p>
            The only personal information this site collects is information{" "}
            <strong>you choose to give us</strong> &mdash; principally, your email address when
            you sign up for the reader list. We may also collect basic technical information your
            browser sends automatically (such as the page you visited and the date and time),
            used only to keep the site running and secure.
          </p>
          <ul className={styles.list}>
            <li>
              <strong>Email address</strong> &mdash; provided by you through the newsletter signup
              form.
            </li>
            <li>
              <strong>Basic site analytics</strong> &mdash; aggregate page-view data used to
              understand which pages are useful; not tied to your identity.
            </li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 data-num="03">How your email will be used</h2>
          <p>
            Your email address will be used by the author <em>only</em> to communicate news
            related to Mac Worden and his books. That means things like:
          </p>
          <ul className={styles.list}>
            <li>Release-day announcements for new novels.</li>
            <li>Cover reveals, pre-order links, and giveaways.</li>
            <li>Occasional notes from Mac about what he&rsquo;s writing next.</li>
            <li>Delivery of the free ebook offered at signup.</li>
          </ul>
          <p>
            That&rsquo;s it. Your email <strong>will never be sold, rented, or shared</strong>{" "}
            with advertisers, data brokers, other authors, or any third party for their own
            marketing purposes.
          </p>
        </div>

        <div className={styles.section}>
          <h2 data-num="04">Service providers</h2>
          <p>
            To actually deliver email, the mailing list is hosted by a reputable third-party email
            service provider. They store your address on the author&rsquo;s behalf so that
            messages can be sent and so that you can unsubscribe with a single click. They are
            contractually limited to handling your data on Mac&rsquo;s behalf and may not use it
            for their own marketing.
          </p>
        </div>

        <div className={styles.section}>
          <h2 data-num="05">Cookies</h2>
          <p>
            This site uses a small number of functional cookies needed for the site to work and to
            remember basic preferences. It does not use advertising or cross-site tracking
            cookies. You can clear or block cookies in your browser settings at any time.
          </p>
        </div>

        <div className={styles.section}>
          <h2 data-num="06">Your choices</h2>
          <p>You are in charge of your data. At any time, you may:</p>
          <ul className={styles.list}>
            <li>
              <strong>Unsubscribe</strong> &mdash; every email includes a one-click unsubscribe
              link.
            </li>
            <li>
              <strong>Request a copy</strong> of the information we hold about you.
            </li>
            <li>
              <strong>Ask us to delete</strong> your email address from the mailing list entirely.
            </li>
            <li>
              <strong>Correct</strong> any information you believe is inaccurate.
            </li>
          </ul>
          <p>To make any of these requests, just write to the address in the contact box below.</p>
        </div>

        <div className={styles.section}>
          <h2 data-num="07">Children&rsquo;s privacy</h2>
          <p>
            Mac&rsquo;s books are written for adult readers. This site is not directed to children
            under 13, and we do not knowingly collect personal information from them. If you
            believe a child has signed up, contact us and we will remove the record.
          </p>
        </div>

        <div className={styles.section}>
          <h2 data-num="08">Security</h2>
          <p>
            We take reasonable steps to protect the information we hold &mdash; encrypted
            connections, trusted hosting providers, and access limited to the few people who need
            it to run the mailing list. No online service can promise perfect security, but we
            treat your email like the favor it is.
          </p>
        </div>

        <div className={styles.section}>
          <h2 data-num="09">Changes to this policy</h2>
          <p>
            If this policy changes in any meaningful way, the &ldquo;Last updated&rdquo; date at
            the top of the page will change, and significant changes will be announced through the
            newsletter so subscribers hear about it directly.
          </p>
        </div>

        <div className={styles.contact}>
          <p className={styles.contactLabel}>Questions, requests, or corrections</p>
          <p className={styles.contactBody}>
            Write to <a href="mailto:macworden@fickledragon.com">macworden@fickledragon.com</a> and
            Mac (or someone helping him) will get back to you.
          </p>
        </div>

        <Link href="/" className={styles.back}>
          Back to the site
        </Link>
      </div>
    </section>
  );
}
