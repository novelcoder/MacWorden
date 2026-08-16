"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

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
      <Link href="/" className="nav-brand">
        Mac Worden
      </Link>
      <ul className="nav-links">
        <li>
          <Link href="/" className={onHome ? "active" : undefined}>
            Home
          </Link>
        </li>
        <li>
          <Link href="/#series" className={onSeries ? "active" : undefined}>
            Series
          </Link>
        </li>
        <li>
          <Link href="/books" className={onBooks ? "active" : undefined}>
            The Books
          </Link>
        </li>
        <li>
          <Link href="/#about">About</Link>
        </li>
        <li>
          <Link href="/#signup" className="btn-nav">
            Join the List
          </Link>
        </li>
      </ul>
    </nav>
  );
}
