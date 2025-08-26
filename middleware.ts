// middleware.ts
import NextAuth from 'next-auth';
import { authConfig } from './auth.config'; // Import the SAFE config

export default NextAuth(authConfig).auth;

export const config = {
  // This matcher protects all routes except for API, Next.js assets, and static files.
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
