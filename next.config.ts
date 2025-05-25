import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['api.placeholder.com', 'localhost'],
  },
  // Add this back - it's essential for containerized Next.js apps
  output: 'standalone'
};

export default nextConfig;