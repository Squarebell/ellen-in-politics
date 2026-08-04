"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VISITOR_KEY = "ea_vid";

function getVisitorId(): string {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replace(/-/g, "")
        : `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return `anon${Date.now().toString(36)}`;
  }
}

function shouldTrack(pathname: string): boolean {
  if (!pathname) return false;
  if (pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/analytics")) return false;
  if (pathname.startsWith("/api")) return false;
  return true;
}

export function AnalyticsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!shouldTrack(pathname)) return;
    if (typeof window === "undefined") return;
    if (navigator.doNotTrack === "1") return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch("/api/analytics/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: pathname + window.location.search,
          referrer: document.referrer || "",
          visitorId: getVisitorId(),
        }),
        signal: controller.signal,
        keepalive: true,
      }).catch(() => {
        /* ignore */
      });
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [pathname]);

  return null;
}
