// next.config.ts

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['api.placeholder.com', 'localhost', 'placehold.co'],
  },
  output: 'standalone',
  generateBuildId: async () => {
    if (process.env.GIT_COMMIT_HASH) {
      return process.env.GIT_COMMIT_HASH;
    }
    return `${new Date().getTime()}`;
  },
  async rewrites() {
    return [
      {
        source: '/next/:path*',
        destination: '/_next/:path*',
      },
    ];
  },
};

module.exports = nextConfig; // Use module.exports
