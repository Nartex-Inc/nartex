// src/app/layout.tsx
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import SessionProviderWrapper from "./SessionProviderWrapper"; // Ensure this path is correct

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
    <html lang="fr" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable} h-full`}>
      <body
        // KEY FIXES:
        // 1. `h-full`: Ensures the body can fill the viewport.
        // 2. `bg-zinc-900`: Sets the dark grey background for the entire application.
        // 3. `overflow-hidden`: Prevents the body itself from ever showing a scrollbar.
        className="h-full bg-zinc-900 font-sans antialiased overflow-hidden"
      >
        <SessionProviderWrapper>
            {/* ThemeProvider is removed as it's not needed for a single dark theme */}
            {children}
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
