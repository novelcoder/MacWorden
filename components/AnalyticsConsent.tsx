"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ANALYTICS_CONSENT_COOKIE,
  ANALYTICS_COOKIE_MAX_AGE_SECONDS,
  type AnalyticsConsentChoice,
} from "@/lib/analytics";
import styles from "./AnalyticsConsent.module.css";

type ConsentState = "loading" | "undecided" | AnalyticsConsentChoice;
type AnalyticsParameters = Record<string, unknown>;
type Gtag = (...args: unknown[]) => void;

type AnalyticsRuntime = {
  active: boolean;
  initialized: boolean;
  measurementId: string;
  navigationNumber: number;
  lastPagePath: string | null;
  currentPageLocation: string | null;
  scriptRequested: boolean;
  viewedItems: Set<string>;
  viewedLists: Set<string>;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    __macWordenAnalytics?: AnalyticsRuntime;
  }
}

const DENIED_CONSENT = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
} as const;

const GRANTED_ANALYTICS_CONSENT = {
  ...DENIED_CONSENT,
  analytics_storage: "granted",
} as const;

const AnalyticsSettingsContext = createContext<{
  configured: boolean;
  openSettings: () => void;
}>({
  configured: false,
  openSettings: () => undefined,
});

function getRuntime(measurementId: string): AnalyticsRuntime {
  if (!window.__macWordenAnalytics || window.__macWordenAnalytics.measurementId !== measurementId) {
    window.__macWordenAnalytics = {
      active: false,
      initialized: false,
      measurementId,
      navigationNumber: 0,
      lastPagePath: null,
      currentPageLocation: null,
      scriptRequested: false,
      viewedItems: new Set<string>(),
      viewedLists: new Set<string>(),
    };
  }

  return window.__macWordenAnalytics;
}

function safePageLocation(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

function safeReferrer(value: string): string | undefined {
  if (!value) return undefined;

  try {
    const referrer = new URL(value);
    return `${referrer.origin}${referrer.pathname}`;
  } catch {
    return undefined;
  }
}

function pageContext(): AnalyticsParameters {
  const pageReferrer = safeReferrer(document.referrer);
  return {
    page_location: safePageLocation(),
    page_path: window.location.pathname,
    page_title: document.title,
    ...(pageReferrer ? { page_referrer: pageReferrer } : {}),
  };
}

function gtag(...args: unknown[]) {
  window.dataLayer?.push(args);
}

function requestAnalyticsScript(measurementId: string, runtime: AnalyticsRuntime) {
  if (runtime.scriptRequested || document.getElementById("macworden-google-analytics")) return;

  const script = document.createElement("script");
  script.id = "macworden-google-analytics";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.addEventListener("error", () => {
    runtime.scriptRequested = false;
    script.remove();
  });

  runtime.scriptRequested = true;
  document.head.appendChild(script);
}

function initializeAnalytics(measurementId: string) {
  const runtime = getRuntime(measurementId);
  const disabledFlag = `ga-disable-${measurementId}`;
  (window as unknown as Record<string, unknown>)[disabledFlag] = false;

  window.dataLayer ??= [];
  window.gtag ??= gtag;

  if (!runtime.initialized) {
    window.gtag("consent", "default", DENIED_CONSENT);
    window.gtag("consent", "update", GRANTED_ANALYTICS_CONSENT);
    window.gtag("set", "allow_google_signals", false);
    window.gtag("set", "allow_ad_personalization_signals", false);
    window.gtag("set", "ads_data_redaction", true);
    window.gtag("set", pageContext());
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      ...pageContext(),
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: ANALYTICS_COOKIE_MAX_AGE_SECONDS,
      cookie_flags:
        window.location.protocol === "https:" ? "SameSite=Lax;Secure" : "SameSite=Lax",
      cookie_path: "/",
      cookie_update: false,
      send_page_view: false,
    });
    runtime.initialized = true;
  } else {
    window.gtag("consent", "update", GRANTED_ANALYTICS_CONSENT);
    window.gtag("config", measurementId, {
      ...pageContext(),
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      send_page_view: false,
    });
  }

  runtime.active = true;
  requestAnalyticsScript(measurementId, runtime);
}

function analyticsCookieDomains(): string[] {
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname.includes(":") || /^\d+(?:\.\d+){3}$/.test(hostname)) {
    return [];
  }

  const labels = hostname.split(".");
  const registrableDomain = labels.length > 1 ? labels.slice(-2).join(".") : hostname;
  return Array.from(new Set([hostname, `.${hostname}`, registrableDomain, `.${registrableDomain}`]));
}

function deleteAnalyticsCookies() {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const cookieNames = document.cookie
    .split(";")
    .map((cookie) => cookie.trim().split("=")[0])
    .filter((name) => /^_ga(?:_|$)/.test(name));

  for (const name of cookieNames) {
    const expired = `${name}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/; SameSite=Lax${secure}`;
    document.cookie = expired;
    for (const domain of analyticsCookieDomains()) {
      document.cookie = `${expired}; Domain=${domain}`;
    }
  }
}

function disableAnalytics(measurementId: string) {
  const runtime = getRuntime(measurementId);
  if (runtime.initialized) {
    window.gtag?.("consent", "update", DENIED_CONSENT);
  }
  runtime.active = false;
  (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = true;
  deleteAnalyticsCookies();
}

function sendAnalyticsEvent(name: string, parameters: AnalyticsParameters = {}) {
  const runtime = window.__macWordenAnalytics;
  if (!runtime?.active || !window.gtag) return;

  try {
    window.gtag("event", name, {
      ...pageContext(),
      ...parameters,
      send_to: runtime.measurementId,
    });
  } catch {
    // Analytics must never interrupt navigation or site interactions.
  }
}

function recordPageView(pathname: string) {
  const runtime = window.__macWordenAnalytics;
  if (!runtime?.active || runtime.lastPagePath === pathname) return;

  const nextLocation = safePageLocation();
  const pageReferrer = runtime.currentPageLocation ?? safeReferrer(document.referrer);
  runtime.lastPagePath = pathname;
  runtime.currentPageLocation = nextLocation;
  runtime.navigationNumber += 1;
  runtime.viewedItems.clear();
  runtime.viewedLists.clear();

  window.gtag?.("set", pageContext());
  sendAnalyticsEvent("page_view", {
    ...(pageReferrer ? { page_referrer: pageReferrer } : {}),
  });
}

function analyticsItem(element: HTMLElement, list?: HTMLElement): AnalyticsParameters | null {
  const itemId = element.dataset.analyticsItemId?.trim();
  const itemName = element.dataset.analyticsItemName?.trim();
  if (!itemId && !itemName) return null;

  const index = Number(element.dataset.analyticsItemIndex);
  const item: AnalyticsParameters = {
    ...(itemId ? { item_id: itemId } : {}),
    ...(itemName ? { item_name: itemName } : {}),
    ...(Number.isInteger(index) && index >= 0 ? { index } : {}),
  };

  const listId = element.dataset.analyticsListId ?? list?.dataset.analyticsListId;
  const listName = element.dataset.analyticsListName ?? list?.dataset.analyticsListName;
  const contentFormat =
    element.dataset.analyticsContentFormat ?? list?.dataset.analyticsContentFormat;
  const itemCategory = element.dataset.analyticsItemCategory;
  const itemVariant = element.dataset.analyticsItemVariant;

  if (listId) item.item_list_id = listId;
  if (listName) item.item_list_name = listName;
  if (contentFormat) item.content_format = contentFormat;
  if (itemCategory) item.item_category = itemCategory;
  if (itemVariant) item.item_variant = itemVariant;

  return item;
}

function recordItemLists() {
  const runtime = window.__macWordenAnalytics;
  if (!runtime?.active) return;

  document.querySelectorAll<HTMLElement>("[data-analytics-view-list]").forEach((list) => {
    const listId = list.dataset.analyticsListId?.trim();
    const listName = list.dataset.analyticsListName?.trim();
    if (!listId || !listName || runtime.viewedLists.has(listId)) return;

    const items = Array.from(list.querySelectorAll<HTMLElement>("[data-analytics-item]"))
      .map((element) => analyticsItem(element, list))
      .filter((item): item is AnalyticsParameters => item !== null);
    if (!items.length) return;

    runtime.viewedLists.add(listId);
    sendAnalyticsEvent("view_item_list", {
      item_list_id: listId,
      item_list_name: listName,
      content_format: list.dataset.analyticsContentFormat,
      items,
    });
  });
}

function recordHashItem() {
  const runtime = window.__macWordenAnalytics;
  const hash = window.location.hash.slice(1);
  if (!runtime?.active || !hash) return;

  let target: HTMLElement | null = null;
  try {
    target = document.getElementById(decodeURIComponent(hash));
  } catch {
    return;
  }
  if (!target?.matches("[data-analytics-view-item]")) return;

  const item = analyticsItem(target);
  const itemId = String(item?.item_id ?? item?.item_name ?? "");
  if (!item || !itemId || runtime.viewedItems.has(itemId)) return;

  runtime.viewedItems.add(itemId);
  sendAnalyticsEvent("view_item", {
    content_format: target.dataset.analyticsContentFormat,
    items: [item],
  });
}

function linkText(element: HTMLElement): string {
  return (element.dataset.analyticsLinkText || element.textContent || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

function recordClick(event: MouseEvent) {
  if (!(event.target instanceof Element)) return;

  const customEvent = event.target.closest<HTMLElement>("[data-analytics-event]");
  if (customEvent) {
    const eventName = customEvent.dataset.analyticsEvent;
    if (!eventName) return;

    const anchor = customEvent instanceof HTMLAnchorElement ? customEvent : customEvent.closest("a");
    let destinationDomain: string | undefined;
    if (anchor?.href) {
      try {
        destinationDomain = new URL(anchor.href).hostname;
      } catch {
        destinationDomain = undefined;
      }
    }

    sendAnalyticsEvent(eventName, {
      ...(customEvent.dataset.analyticsItemId
        ? { item_id: customEvent.dataset.analyticsItemId }
        : {}),
      ...(customEvent.dataset.analyticsItemName
        ? { item_name: customEvent.dataset.analyticsItemName }
        : {}),
      ...(customEvent.dataset.analyticsPlacement
        ? { placement: customEvent.dataset.analyticsPlacement }
        : {}),
      ...(destinationDomain ? { destination_domain: destinationDomain } : {}),
      link_text: linkText(customEvent),
      content_format: customEvent.dataset.analyticsContentFormat,
    });
    return;
  }

  const selectedItem = event.target.closest<HTMLElement>("[data-analytics-select-item]");
  if (!selectedItem) return;
  const item = analyticsItem(selectedItem);
  if (!item) return;

  sendAnalyticsEvent("select_item", {
    item_list_id: item.item_list_id,
    item_list_name: item.item_list_name,
    content_format: selectedItem.dataset.analyticsContentFormat,
    items: [item],
  });
}

function readConsentCookie(): AnalyticsConsentChoice | null {
  const prefix = `${ANALYTICS_CONSENT_COOKIE}=`;
  const value = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);

  return value === "granted" || value === "denied" ? value : null;
}

function writeConsentCookie(choice: AnalyticsConsentChoice) {
  const expires = new Date();
  expires.setMonth(expires.getMonth() + 6);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${choice}; Expires=${expires.toUTCString()}; Path=/; SameSite=Lax${secure}`;
}

export function AnalyticsProvider({
  children,
  measurementId,
}: {
  children: ReactNode;
  measurementId: string | null;
}) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<ConsentState>("loading");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const previousFocus = useRef<HTMLElement | null>(null);
  const closeButton = useRef<HTMLButtonElement | null>(null);

  const openSettings = useCallback(() => {
    previousFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    requestAnimationFrame(() => previousFocus.current?.focus());
  }, []);

  const chooseConsent = useCallback(
    (choice: AnalyticsConsentChoice) => {
      if (!measurementId) return;
      writeConsentCookie(choice);
      setConsent(choice);
      setSettingsOpen(false);
    },
    [measurementId]
  );

  useEffect(() => {
    if (!measurementId) return;
    const savedConsent = readConsentCookie();
    if (!savedConsent) disableAnalytics(measurementId);
    const frame = requestAnimationFrame(() => setConsent(savedConsent ?? "undecided"));
    return () => cancelAnimationFrame(frame);
  }, [measurementId]);

  useEffect(() => {
    if (!measurementId || consent === "loading") return;
    if (consent !== "granted") {
      disableAnalytics(measurementId);
      return;
    }

    initializeAnalytics(measurementId);
    const frame = requestAnimationFrame(() => {
      recordPageView(pathname);
      recordItemLists();
      recordHashItem();
    });
    return () => cancelAnimationFrame(frame);
  }, [consent, measurementId, pathname]);

  useEffect(() => {
    if (!measurementId) return;
    document.addEventListener("click", recordClick, true);
    return () => document.removeEventListener("click", recordClick, true);
  }, [measurementId]);

  useEffect(() => {
    if (!measurementId || consent !== "granted") return;
    const onHashChange = () => requestAnimationFrame(recordHashItem);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [consent, measurementId]);

  useEffect(() => {
    if (!settingsOpen) return;
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSettings();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeSettings, settingsOpen]);

  return (
    <AnalyticsSettingsContext.Provider
      value={{ configured: Boolean(measurementId), openSettings }}
    >
      {children}

      {measurementId && consent === "undecided" && !settingsOpen && (
        <section className={styles.banner} role="region" aria-label="Analytics cookie choices">
          <p className={styles.copy}>
            <strong>Optional analytics.</strong> Allow anonymous usage measurement to help Mac
            understand which books and pages readers find useful. Nothing is sent to Google
            Analytics unless you allow it. <Link href="/privacy">Privacy &amp; Cookies</Link>
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.choiceButton}
              onClick={() => chooseConsent("denied")}
            >
              Decline
            </button>
            <button
              type="button"
              className={styles.choiceButton}
              onClick={() => chooseConsent("granted")}
            >
              Allow analytics
            </button>
          </div>
        </section>
      )}

      {measurementId && settingsOpen && (
        <div
          className={styles.backdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeSettings();
          }}
        >
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="analytics-settings-title"
          >
            <button
              ref={closeButton}
              type="button"
              className={styles.closeButton}
              aria-label="Close cookie settings"
              onClick={closeSettings}
            >
              &times;
            </button>
            <p className={styles.eyebrow}>Your choice</p>
            <h2 className={styles.title} id="analytics-settings-title">
              Cookie settings
            </h2>
            <p className={styles.description}>
              Analytics is optional. Declining or withdrawing consent does not change how the
              website works.
            </p>
            <p className={styles.status}>
              Current setting:{" "}
              <strong>
                {consent === "granted"
                  ? "Allowed"
                  : consent === "denied"
                    ? "Declined"
                    : "Not chosen"}
              </strong>
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.choiceButton}
                onClick={() => chooseConsent("denied")}
              >
                Decline
              </button>
              <button
                type="button"
                className={styles.choiceButton}
                onClick={() => chooseConsent("granted")}
              >
                Allow analytics
              </button>
            </div>
          </section>
        </div>
      )}
    </AnalyticsSettingsContext.Provider>
  );
}

export function CookieSettingsLink() {
  const { configured, openSettings } = useContext(AnalyticsSettingsContext);
  if (!configured) return null;

  return (
    <li>
      <button type="button" onClick={openSettings}>
        Cookie settings
      </button>
    </li>
  );
}
