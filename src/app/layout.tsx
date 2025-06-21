// src/app/layout.tsx
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "./SessionProviderWrapper";

// Configure the Poppins font
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
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
    // Add the font variable to the html tag
    <html lang="fr" suppressHydrationWarning className={`${poppins.variable} h-full`}>
      {/*
        ==================================================================
        ===                        THE FIX                           ===
        ==================================================================
        The 'overflow-hidden' class has been removed from the body tag.
        This was preventing individual pages from handling their own
        scrolling and was the root cause of the layout breaking.
      */}
      <body
        // Set the font as the default sans-serif font
        className="h-full bg-zinc-900 font-sans antialiased"
      >
        <SessionProviderWrapper>
            {children}
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
