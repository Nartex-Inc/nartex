import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // UPDATED: Added 'placehold.co' to support the new logo's fallback URL.
    domains: ['api.placeholder.com', 'localhost', 'placehold.co'],
  },
  
  // This is essential for containerized Next.js apps
  output: 'standalone',

  // This is the most robust solution to prevent ChunkLoadError issues
  // in a multi-container environment like ECS.
  generateBuildId: async () => {
    // Check if the GIT_COMMIT_HASH environment variable is available.
    if (process.env.GIT_COMMIT_HASH) {
      return process.env.GIT_COMMIT_HASH;
    }
    
    // Fallback to a timestamp for local development.
    return `${new Date().getTime()}`;
  },

  // This is a good defensive measure for certain proxy configurations.
  // It's safe to keep.
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
