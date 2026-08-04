import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAnalyticsStats, parseRange } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const range = parseRange(url.searchParams.get("range"));

  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = env.ANALYTICS;
    if (!db) {
      return Response.json(
        {
          range,
          pageviews: 0,
          visitors: 0,
          days: [],
          pages: [],
          referrers: [],
          countries: [],
          setupRequired: true,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const stats = await getAnalyticsStats(db, range);
    return Response.json(stats, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load analytics";
    return Response.json({ error: message }, { status: 500 });
  }
}
