import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  isBotUserAgent,
  normalizePath,
  normalizeReferrer,
} from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CollectBody = {
  path?: string;
  referrer?: string;
  visitorId?: string;
};

function badRequest(message: string) {
  return Response.json({ ok: false, error: message }, { status: 400 });
}

export async function POST(request: Request) {
  const ua = request.headers.get("user-agent");
  if (isBotUserAgent(ua)) {
    return Response.json({ ok: true, ignored: "bot" });
  }

  let body: CollectBody;
  try {
    body = (await request.json()) as CollectBody;
  } catch {
    return badRequest("Invalid JSON");
  }

  const path = normalizePath(typeof body.path === "string" ? body.path : "");
  if (!path) {
    return Response.json({ ok: true, ignored: "path" });
  }

  const visitorId =
    typeof body.visitorId === "string" &&
    /^[a-zA-Z0-9_-]{8,64}$/.test(body.visitorId)
      ? body.visitorId
      : null;

  if (!visitorId) {
    return badRequest("Missing visitor id");
  }

  const host = request.headers.get("host")?.split(":")[0] || "elleninpolitics.com";
  const referrer = normalizeReferrer(
    typeof body.referrer === "string" ? body.referrer : null,
    host.replace(/^www\./, ""),
  );

  try {
    const { env, cf } = await getCloudflareContext({ async: true });
    const db = env.ANALYTICS;
    if (!db) {
      return Response.json({ ok: true, ignored: "no-db" });
    }

    const country =
      typeof cf?.country === "string" && cf.country.length <= 8
        ? cf.country
        : "Unknown";

    await db
      .prepare(
        `INSERT INTO pageviews (path, referrer, country, visitor_id)
         VALUES (?, ?, ?, ?)`,
      )
      .bind(path, referrer, country, visitorId)
      .run();

    return Response.json({ ok: true });
  } catch {
    // Never break the public site if analytics is unavailable.
    return Response.json({ ok: true, ignored: "error" });
  }
}
