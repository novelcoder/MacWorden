import Link from "next/link";
import { CookieSettingsLink } from "@/components/AnalyticsConsent";

export default function SiteFooter() {
  return (
    <footer>
      <div className="footer-grid">
        <div>
          <div className="footer-brand">MAC WORDEN</div>
          <div className="footer-copy">&copy; 2026 Mac Worden &middot; All Rights Reserved</div>
        </div>
        <ul className="footer-links">
          <li>
            <Link
              href="/#signup"
              data-analytics-event="reader_list_cta_click"
              data-analytics-placement="footer"
              data-analytics-content-format="reader_list"
            >
              Newsletter
            </Link>
          </li>
          <li>
            <Link href="/#series">Series</Link>
          </li>
          <li>
            <Link href="/#about">About</Link>
          </li>
          <li>
            <Link href="/privacy">Privacy &amp; Cookies</Link>
          </li>
          <CookieSettingsLink />
          <li>
            <a href="mailto:macworden@fickledragon.com">Contact</a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
