import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SITE_HOST, SITE_URL, WWW_HOST } from "@/lib/site";

/**
 * Keep https://elleninpolitics.com canonical:
 * - www → apex (301)
 * - http → https on production hosts (301)
 */
export default function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (host !== SITE_HOST && host !== WWW_HOST) {
    return NextResponse.next();
  }

  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    request.nextUrl.protocol.replace(":", "");

  const needsHostChange = host === WWW_HOST;
  const needsHttps = proto === "http";

  if (!needsHostChange && !needsHttps) {
    return NextResponse.next();
  }

  const destination = new URL(
    request.nextUrl.pathname + request.nextUrl.search,
    SITE_URL,
  );
  return NextResponse.redirect(destination, 301);
}

export const config = {
  matcher: "/:path*",
};
