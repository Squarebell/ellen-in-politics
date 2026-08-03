import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  // Canonicalize on www: permanently redirect the bare apex to www so the site
  // has a single canonical host. The host is matched exactly (Next anchors the
  // value as /^...$/), so www.elleninpolitics.com is never caught and cannot
  // loop. Only fires in production; local dev on localhost is unaffected.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "elleninpolitics\\.com" }],
        destination: "https://www.elleninpolitics.com/:path*",
        permanent: true,
      },
    ];
  },
  // Decap CMS lives at public/admin/index.html. Next's default trailing-slash
  // redirect turns /admin/ into /admin, which would 404 without this rewrite.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/admin", destination: "/admin/index.html" },
        { source: "/admin/", destination: "/admin/index.html" },
      ],
    };
  },
};

export default nextConfig;
