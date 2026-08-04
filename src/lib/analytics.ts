export type AnalyticsRange = "7d" | "30d" | "90d";

export type AnalyticsStats = {
  range: AnalyticsRange;
  pageviews: number;
  visitors: number;
  days: { day: string; pageviews: number; visitors: number }[];
  pages: { path: string; pageviews: number }[];
  referrers: { referrer: string; pageviews: number }[];
  countries: { country: string; pageviews: number }[];
};

const BOT_UA =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora|pinterest|redditbot|applebot|semrush|ahrefs|dotbot|mj12bot|petalbot|bytespider|gptbot|claudebot|chatgpt|anthropic|python-requests|curl|wget|headless/i;

export function isBotUserAgent(ua: string | null): boolean {
  if (!ua) return true;
  return BOT_UA.test(ua);
}

export function normalizePath(raw: string): string | null {
  try {
    const url = new URL(raw, "https://elleninpolitics.com");
    let path = url.pathname || "/";
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    if (
      path.startsWith("/admin") ||
      path.startsWith("/analytics") ||
      path.startsWith("/api") ||
      path.startsWith("/_next") ||
      path.startsWith("/uploads/") ||
      path.includes(".")
    ) {
      return null;
    }
    if (path.length > 200) return null;
    return path;
  } catch {
    return null;
  }
}

export function normalizeReferrer(raw: string | null, siteHost: string): string {
  if (!raw) return "Direct";
  try {
    const url = new URL(raw);
    if (url.hostname === siteHost || url.hostname.endsWith(`.${siteHost}`)) {
      return "Direct";
    }
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "Direct";
  }
}

export function rangeStartIso(range: AnalyticsRange): string {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);
  return start.toISOString().slice(0, 19).replace("T", " ");
}

export function parseRange(value: string | null): AnalyticsRange {
  if (value === "7d" || value === "30d" || value === "90d") return value;
  return "30d";
}

export async function getAnalyticsStats(
  db: D1Database,
  range: AnalyticsRange,
): Promise<AnalyticsStats> {
  const since = rangeStartIso(range);

  const [totals, days, pages, referrers, countries] = await Promise.all([
    db
      .prepare(
        `SELECT
          COUNT(*) AS pageviews,
          COUNT(DISTINCT visitor_id) AS visitors
         FROM pageviews
         WHERE created_at >= ?`,
      )
      .bind(since)
      .first<{ pageviews: number; visitors: number }>(),
    db
      .prepare(
        `SELECT
          substr(created_at, 1, 10) AS day,
          COUNT(*) AS pageviews,
          COUNT(DISTINCT visitor_id) AS visitors
         FROM pageviews
         WHERE created_at >= ?
         GROUP BY day
         ORDER BY day ASC`,
      )
      .bind(since)
      .all<{ day: string; pageviews: number; visitors: number }>(),
    db
      .prepare(
        `SELECT path, COUNT(*) AS pageviews
         FROM pageviews
         WHERE created_at >= ?
         GROUP BY path
         ORDER BY pageviews DESC
         LIMIT 12`,
      )
      .bind(since)
      .all<{ path: string; pageviews: number }>(),
    db
      .prepare(
        `SELECT COALESCE(referrer, 'Direct') AS referrer, COUNT(*) AS pageviews
         FROM pageviews
         WHERE created_at >= ?
         GROUP BY referrer
         ORDER BY pageviews DESC
         LIMIT 8`,
      )
      .bind(since)
      .all<{ referrer: string; pageviews: number }>(),
    db
      .prepare(
        `SELECT COALESCE(country, 'Unknown') AS country, COUNT(*) AS pageviews
         FROM pageviews
         WHERE created_at >= ?
         GROUP BY country
         ORDER BY pageviews DESC
         LIMIT 8`,
      )
      .bind(since)
      .all<{ country: string; pageviews: number }>(),
  ]);

  return {
    range,
    pageviews: Number(totals?.pageviews ?? 0),
    visitors: Number(totals?.visitors ?? 0),
    days: (days.results ?? []).map((row) => ({
      day: row.day,
      pageviews: Number(row.pageviews),
      visitors: Number(row.visitors),
    })),
    pages: (pages.results ?? []).map((row) => ({
      path: row.path,
      pageviews: Number(row.pageviews),
    })),
    referrers: (referrers.results ?? []).map((row) => ({
      referrer: row.referrer,
      pageviews: Number(row.pageviews),
    })),
    countries: (countries.results ?? []).map((row) => ({
      country: row.country,
      pageviews: Number(row.pageviews),
    })),
  };
}
