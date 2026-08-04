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
  // Decap CMS lives at public/admin/index.html. Next's default trailing-slash
  // redirect turns /admin/ into /admin, which would 404 without this rewrite.
  // Config path is also pinned in public/admin/index.html via cms-config-url.
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
