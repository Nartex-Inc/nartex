// src/app/layout.tsx
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans"; // Corrected Geist Sans import
import { GeistMono } from "geist/font/mono";  // Corrected Geist Mono import
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "./SessionProviderWrapper";

// Initialize Geist Sans (the import itself is the font object with a .variable property)
// No need to call it as a function here
const geistFontSans = GeistSans;

// Initialize Geist Mono
const geistFontMono = GeistMono;

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
    <html lang="fr">
      <body
        className={`${geistFontSans.variable} ${geistFontMono.variable} ${inter.variable} antialiased`}
      >
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}