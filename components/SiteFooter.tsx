import Link from "next/link";

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
            <Link href="/#signup">Newsletter</Link>
          </li>
          <li>
            <Link href="/#series">Series</Link>
          </li>
          <li>
            <Link href="/#about">About</Link>
          </li>
          <li>
            <Link href="/privacy">Privacy</Link>
          </li>
          <li>
            <a href="mailto:macworden@fickledragon.com">Contact</a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
