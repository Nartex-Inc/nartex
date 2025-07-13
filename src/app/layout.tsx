// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "./SessionProviderWrapper"; // Import your existing wrapper

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nartex Application",
  description: "Your Application Description",
};

/**
 * This is the root layout for the ENTIRE application.
 * By wrapping the children in `SessionProviderWrapper`, we ensure that the
 * `useSession` hook is available on every page, including the special
 * `/not-found` page, which resolves the build error.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProviderWrapper>
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
