import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * Enables React's Strict Mode for highlighting potential problems in an application.
   * This is a good default for development.
   */
  reactStrictMode: true,

  /**
   * --- IMPORTANT ---
   * This setting tells Next.js to not fail the build if there are ESLint errors.
   * While this can help unblock a failing pipeline, it is hiding underlying code quality issues.
   * ADVICE: Run `npm run lint` locally, fix all reported errors, and then remove this block.
   */
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  /**
   * Securely configures which external domains are allowed for image optimization.
   * `remotePatterns` is the modern, recommended approach. This is correctly configured.
   */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'commandites.sintoexpert.com',
      },
      {
        protocol: 'https',
        hostname: 'api.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
  
  /**
   * --- CORRECT & ESSENTIAL ---
   * This creates a standalone output folder (`.next/standalone`) with only the necessary
   * files to run the application, which is perfect for small Docker images.
   * This MUST be present for your Docker multi-stage build to work.
   */
  output: 'standalone',

  /**
   * --- CORRECT & ESSENTIAL ---
   * This generates a consistent build ID based on your Git commit hash.
   * This is a critical fix for `ChunkLoadError` issues in multi-server environments like ECS,
   * ensuring that a user's browser always requests assets from a matching build.
   */
  generateBuildId: async () => {
    if (process.env.GIT_COMMIT_HASH) {
      return process.env.GIT_COMMIT_HASH;
    }
    // Fallback for local development where the Git hash isn't passed as an env var.
    return `${new Date().getTime()}`;
  },

  /**
   * This is a specific workaround, often for reverse proxies.
   * It's safe to keep and might be necessary for your infrastructure.
   */
  async rewrites() {
    return [
      {
        source: '/next/:path*',
        destination: '/_next/:path*',
      },
    ];
  },
};

export default nextConfig;
