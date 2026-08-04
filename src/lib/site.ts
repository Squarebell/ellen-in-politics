/** Canonical public origin — always HTTPS apex (no www). */
export const SITE_HOST = "elleninpolitics.com";
export const SITE_URL = `https://${SITE_HOST}` as const;
export const WWW_HOST = `www.${SITE_HOST}`;

export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized === "/" ? SITE_URL : `${SITE_URL}${normalized}`;
}
