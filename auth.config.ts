// auth.config.ts

// Do NOT import NextAuthConfig from 'next-auth' (v5-only)

export const authConfig = {
  pages: {
    signIn: '/',            // where unauthenticated users get sent
    error: '/auth/error',
  },
  // Providers are configured in your main auth handler (e.g., /api/auth/[...nextauth].ts)
  // Leave callbacks that belong to middleware OUT of here for v4; see middleware.ts below.
} as const;
