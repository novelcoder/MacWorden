"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { sourceKeyFromSearchParams, withAttribution } from "@/lib/attribution-routing";

function SiteNavView({ sourceKey }: { sourceKey: string | null }) {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const attributedPath = (path: string) => withAttribution(path, sourceKey);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 60);
    }
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onHome = pathname === "/";
  const onSeries = pathname.startsWith("/series");
  const onBooks = pathname.startsWith("/books");

  return (
    <nav id="main-nav" className={scrolled ? "scrolled" : undefined}>
      <Link href={attributedPath("/")} className="nav-brand">
        Mac Worden
      </Link>
      <ul className="nav-links">
        <li>
          <Link href={attributedPath("/")} className={onHome ? "active" : undefined}>
            Home
          </Link>
        </li>
        <li>
          <Link href={attributedPath("/series")} className={onSeries ? "active" : undefined}>
            Series
          </Link>
        </li>
        <li>
          <Link href={attributedPath("/books")} className={onBooks ? "active" : undefined}>
            The Books
          </Link>
        </li>
        <li>
          <Link href={attributedPath("/#about")}>About</Link>
        </li>
        <li>
          <Link
            href={attributedPath("/#signup")}
            className="btn-nav"
            data-analytics-event="reader_list_cta_click"
            data-analytics-placement="navigation"
            data-analytics-content-format="reader_list"
          >
            Join the List
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export function SiteNavFallback() {
  return <SiteNavView sourceKey={null} />;
}

export default function SiteNav() {
  const searchParams = useSearchParams();
  return <SiteNavView sourceKey={sourceKeyFromSearchParams(searchParams)} />;
}
