"use client";

import { useEffect } from "react";

const NAV_CLEARANCE = 110;

export default function ScrollToHash() {
  useEffect(() => {
    if (!window.location.hash) return;
    const id = decodeURIComponent(window.location.hash.slice(1));

    const scrollToTarget = () => {
      const el = document.getElementById(id);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - NAV_CLEARANCE;
      window.scrollTo({ top: Math.max(top, 0) });
    };

    requestAnimationFrame(scrollToTarget);
    window.addEventListener("load", scrollToTarget);
    return () => window.removeEventListener("load", scrollToTarget);
  }, []);

  return null;
}
