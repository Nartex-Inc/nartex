import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['api.placeholder.com', 'localhost'],
  },
  // Essential for containerized Next.js apps
  output: 'standalone',

  // ─────── Rewrites to map /next/* → /_next/* ─────────────
  // (only needed if something is stripping the "_" off)
  async rewrites() {
    return [
      {
        source: '/next/:path*',
        destination: '/_next/:path*',
      },
    ]
  },
  // ────────────────────────────────────────────────────────
}

export default nextConfig
