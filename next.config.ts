import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['api.placeholder.com', 'localhost'],
  },
  
  // This is essential for containerized Next.js apps
  output: 'standalone',

  // -----------------------------------------------------------------
  // NEW: Generate a consistent Build ID based on the Git commit hash.
  // This is the most robust solution to prevent ChunkLoadError issues
  // in a multi-container environment like ECS.
  // -----------------------------------------------------------------
  generateBuildId: async () => {
    // Check if the GIT_COMMIT_HASH environment variable is available.
    // We will pass this variable during the `docker build` step in our buildspec.
    if (process.env.GIT_COMMIT_HASH) {
      return process.env.GIT_COMMIT_HASH;
    }
    
    // Fallback to a timestamp for local development where the Git hash isn't passed.
    // This ensures `next build` still works on your local machine.
    return `${new Date().getTime()}`;
  },

  // ─────── Rewrites to map /next/* → /_next/* ─────────────
  // This is a good defensive measure but is often not needed unless
  // you have a specific proxy or firewall rule causing issues.
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

// Use 'export default' for TypeScript configuration files.
export default nextConfig;
