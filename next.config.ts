import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // --- CORRECTED & UPGRADED IMAGES CONFIGURATION ---
  images: {
    // We are using the modern `remotePatterns` instead of the deprecated `domains`.
    // This is more secure and flexible.
    remotePatterns: [
      // The new pattern for the Sinto logo
      {
        protocol: 'https',
        hostname: 'commandites.sintoexpert.com',
      },
      // Preserving your existing domains
      {
        protocol: 'https',
        hostname: 'api.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'http', // localhost is typically http
        hostname: 'localhost',
      },
      // Adding the Vercel avatar domain from your sidebar component
      {
        protocol: 'https',
        hostname: 'avatar.vercel.sh',
      },
    ],
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
