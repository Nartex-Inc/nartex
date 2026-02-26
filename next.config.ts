// next.config.ts
import type { NextConfig } from "next";

// Forcing a new deployment to clear cache - [Current Date]
const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Don’t fail the build on lint warnings in CI
  eslint: { ignoreDuringBuilds: true },

  // Allow your logo/fallback hosts
  images: {
    domains: ["api.placeholder.com", "localhost", "placehold.co", "www.prolabtechnolub.com"],
  },

  // CRITICAL: produce a self-contained server.js + node_modules
  output: "standalone",

  // Stable asset IDs across deployments (prevents ChunkLoadError behind CDNs)
  async generateBuildId() {
    return process.env.GIT_COMMIT_HASH || `${Date.now()}`;
  },

  // Security headers for all routes
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
    ];
  },

  // Harmless convenience; avoids proxies that strip "_"
  async rewrites() {
    return [{ source: "/next/:path*", destination: "/_next/:path*" }];
  },

  // If your repo has type errors that sometimes break CI, uncomment:
  // typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
