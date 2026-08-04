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
  async rewrites() {
    // Serve Decap at /admin without a trailing-slash redirect loop.
    // Config path is pinned in public/admin/index.html via cms-config-url.
    return [{ source: "/admin", destination: "/admin/index.html" }];
  },
};

export default nextConfig;
