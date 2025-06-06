// src/app/layout.tsx
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Inter } from "next/font/google";
import "./globals.css"; // Your global styles
import { ThemeProvider } from "@/components/theme-provider"; // For dark/light mode
import { cn } from "@/lib/utils"; // Utility for conditional class names
import SessionProviderWrapper from "./SessionProviderWrapper"; // Your NextAuth session provider wrapper

// Initialize Inter font (if you still use it alongside Geist)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// GeistSans.variable will default to "--font-geist-sans"
// GeistMono.variable will default to "--font-geist-mono"

export const metadata: Metadata = {
  // Using your original, more detailed metadata
  title: "Nartex | Plateforme de gestion centralisée",
  description:
    "Nartex est une plateforme web de type SaaS pour simplifier la gestion des processus internes à valeur non ajoutée en entreprise grâce à l'automatisation, la collecte de données et la centralisation d'applications.",
  // You can also add openGraph, icons, etc. here
  // icons: {
  //   icon: "/favicon.ico", // Example
  // },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode; // This children prop is for the content of the current route
}>) {
  return (
    <html
      lang="fr" // Retained from your original
      suppressHydrationWarning // Recommended for next-themes
      // Apply all font variables to the html tag
      // This makes --font-geist-sans, --font-geist-mono, --font-inter available globally
      className={`${GeistSans.variable} ${GeistMono.variable} ${inter.variable}`}
    >
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased"
          // The 'font-sans' class from Tailwind will use --font-geist-sans
          // due to your tailwind.config.js and the variable on the <html> tag.
        )}
      >
        {/* 
          SessionProviderWrapper MUST wrap ThemeProvider and children 
          to ensure useSession() hook works correctly across the app,
          including during the initial load and for client components
          that might be part of statically generated pages before hydration.
        */}
        <SessionProviderWrapper>
          <ThemeProvider
            attribute="class"
            defaultTheme="system" // Or "light", "dark"
            enableSystem
            disableTransitionOnChange // Prevents theme flash on FOUC for some setups
          >
            {children} {/* This is where your page.tsx (login) or dashboard/layout.tsx + dashboard/page.tsx will render */}
          </ThemeProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}