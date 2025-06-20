import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import SessionProviderWrapper from "./SessionProviderWrapper"; // Assuming this is the correct path

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Nartex | Plateforme de gestion centralisée",
  description:
    "Nartex est une plateforme web de type SaaS pour simplifier la gestion des processus internes à valeur non ajoutée en entreprise grâce à l'automatisation, la collecte de données et la centralisation d'applications.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      // --- CHANGE HERE: Added `h-full` class ---
      // This ensures the root element can fill the entire viewport height.
      className={`${GeistSans.variable} ${GeistMono.variable} ${inter.variable} h-full bg-zinc-900`}
    >
      <body
        className={cn(
          // --- CHANGE HERE: Added `h-full` class ---
          // This allows the flex container on your login page to correctly use `min-h-screen`.
          "h-full min-h-screen bg-background font-sans antialiased"
        )}
      >
        <SessionProviderWrapper>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark" // Setting default to 'dark' for your premium theme
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
