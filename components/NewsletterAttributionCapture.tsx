"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureNewsletterAttribution } from "@/lib/newsletterAttribution";

export default function NewsletterAttributionCapture() {
  const pathname = usePathname();

  useEffect(() => {
    captureNewsletterAttribution(pathname);
  }, [pathname]);

  return null;
}
