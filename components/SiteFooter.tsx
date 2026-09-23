"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CookieSettingsLink } from "@/components/AnalyticsConsent";
import { sourceKeyFromSearchParams, withAttribution } from "@/lib/attribution-routing";

function SiteFooterView({ sourceKey }: { sourceKey: string | null }) {
  const attributedPath = (path: string) => withAttribution(path, sourceKey);

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
              href={attributedPath("/#signup")}
              data-analytics-event="reader_list_cta_click"
              data-analytics-placement="footer"
              data-analytics-content-format="reader_list"
            >
              Newsletter
            </Link>
          </li>
          <li>
            <Link href={attributedPath("/series")}>Series</Link>
          </li>
          <li>
            <Link href={attributedPath("/#about")}>About</Link>
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

export function SiteFooterFallback() {
  return <SiteFooterView sourceKey={null} />;
}

export default function SiteFooter() {
  const searchParams = useSearchParams();
  return <SiteFooterView sourceKey={sourceKeyFromSearchParams(searchParams)} />;
}
