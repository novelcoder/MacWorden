"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureNewsletterSourceKey } from "@/lib/newsletterAttribution";

export default function NewsletterAttributionCapture() {
  const pathname = usePathname();

  useEffect(() => {
    captureNewsletterSourceKey();
  }, [pathname]);

  return null;
}
