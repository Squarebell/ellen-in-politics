"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { AnalyticsRange, AnalyticsStats } from "@/lib/analytics";

const RANGES: { id: AnalyticsRange; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
];

function isCmsLoggedIn(): boolean {
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i) || "";
      if (!/cms-user|decap|netlify-cms/i.test(key)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      if (raw.includes("token") || raw.includes("access_token")) return true;
      try {
        const parsed = JSON.parse(raw) as { token?: string };
        if (parsed?.token) return true;
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
  return false;
}

function subscribeNoop() {
  return () => {};
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDay(day: string): string {
  const date = new Date(`${day}T12:00:00Z`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function countryLabel(code: string): string {
  if (!code || code === "Unknown") return "Unknown";
  try {
    const display = new Intl.DisplayNames(["en"], { type: "region" });
    return display.of(code) || code;
  } catch {
    return code;
  }
}

function pageLabel(path: string): string {
  if (path === "/") return "Home";
  if (path === "/watch") return "Watch";
  if (path.startsWith("/posts/")) {
    return path
      .replace("/posts/", "")
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return path;
}

export default function AdminAnalyticsPage() {
  const authed = useSyncExternalStore(subscribeNoop, isCmsLoggedIn, () => false);
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authed) return;

    const controller = new AbortController();

    void fetch(`/api/analytics/stats?range=${range}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load analytics");
        return (await res.json()) as AnalyticsStats;
      })
      .then((data) => {
        setStats(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Something went wrong");
      });

    return () => controller.abort();
  }, [authed, range]);

  const loading = !error && (!stats || stats.range !== range);

  const maxDayViews = useMemo(() => {
    if (!stats?.days.length) return 1;
    return Math.max(...stats.days.map((d) => d.pageviews), 1);
  }, [stats]);

  if (!authed) {
    return (
      <main className="analytics-shell analytics-center">
        <p className="eyebrow">Analytics</p>
        <h1 className="analytics-title">Sign in to view traffic</h1>
        <p className="analytics-lede">
          Open the content admin first, then come back here from your profile
          menu.
        </p>
        <a className="analytics-btn" href="/admin/">
          Go to admin
        </a>
      </main>
    );
  }

  return (
    <main className="analytics-shell">
      <header className="analytics-header">
        <div>
          <p className="eyebrow">Ellen in Politics</p>
          <h1 className="analytics-title">Site analytics</h1>
          <p className="analytics-lede">
            Real human visits — page views from browsers, not bots or crawlers.
          </p>
        </div>
        <div className="analytics-actions">
          <div className="analytics-ranges" role="tablist" aria-label="Date range">
            {RANGES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={range === item.id}
                className={range === item.id ? "is-active" : undefined}
                onClick={() => setRange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <a className="analytics-btn analytics-btn--ghost" href="/admin/">
            Back to admin
          </a>
        </div>
      </header>

      {error ? <p className="analytics-error">{error}</p> : null}

      <section className="analytics-hero-metrics" aria-live="polite">
        <div>
          <p className="analytics-metric-label">Visitors</p>
          <p className="analytics-metric-value">
            {loading || !stats ? "—" : formatNumber(stats.visitors)}
          </p>
        </div>
        <div>
          <p className="analytics-metric-label">Page views</p>
          <p className="analytics-metric-value">
            {loading || !stats ? "—" : formatNumber(stats.pageviews)}
          </p>
        </div>
      </section>

      <section className="analytics-panel">
        <div className="analytics-panel-head">
          <h2>Visits over time</h2>
          <p>Daily page views for the selected range</p>
        </div>
        <div className="analytics-bars" aria-hidden={loading}>
          {(stats?.days ?? []).length === 0 && !loading ? (
            <p className="analytics-empty">
              No visits yet. Numbers appear as people browse the public site.
            </p>
          ) : (
            (stats?.days ?? []).map((day) => (
              <div key={day.day} className="analytics-bar-col">
                <div
                  className="analytics-bar"
                  style={{
                    height: `${Math.max(8, (day.pageviews / maxDayViews) * 100)}%`,
                  }}
                  title={`${day.pageviews} views`}
                />
                <span>{formatDay(day.day)}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="analytics-grid">
        <section className="analytics-panel">
          <div className="analytics-panel-head">
            <h2>Top pages</h2>
            <p>Where people spent time</p>
          </div>
          <ul className="analytics-list">
            {(stats?.pages ?? []).length === 0 && !loading ? (
              <li className="analytics-empty">No page data yet</li>
            ) : (
              (stats?.pages ?? []).map((page) => (
                <li key={page.path}>
                  <span>
                    <strong>{pageLabel(page.path)}</strong>
                    <small>{page.path}</small>
                  </span>
                  <em>{formatNumber(page.pageviews)}</em>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="analytics-panel">
          <div className="analytics-panel-head">
            <h2>How they found you</h2>
            <p>Referrers and direct visits</p>
          </div>
          <ul className="analytics-list">
            {(stats?.referrers ?? []).length === 0 && !loading ? (
              <li className="analytics-empty">No referrer data yet</li>
            ) : (
              (stats?.referrers ?? []).map((row) => (
                <li key={row.referrer}>
                  <span>
                    <strong>{row.referrer}</strong>
                  </span>
                  <em>{formatNumber(row.pageviews)}</em>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="analytics-panel">
          <div className="analytics-panel-head">
            <h2>Countries</h2>
            <p>Where visits came from</p>
          </div>
          <ul className="analytics-list">
            {(stats?.countries ?? []).length === 0 && !loading ? (
              <li className="analytics-empty">No country data yet</li>
            ) : (
              (stats?.countries ?? []).map((row) => (
                <li key={row.country}>
                  <span>
                    <strong>{countryLabel(row.country)}</strong>
                  </span>
                  <em>{formatNumber(row.pageviews)}</em>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}
