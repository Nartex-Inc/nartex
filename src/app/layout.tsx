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
    <html lang="fr" suppressHydrationWarning className={`${poppins.variable} h-full`}>
      <body className="h-full bg-zinc-900 font-sans antialiased">
        {/*
          ==================================================================
          ===                  THE DEFINITIVE FIX                      ===
          ==================================================================
          The wrapper must also have `h-full` to create an unbroken
          chain of full-height containers for your page component.
        */}
        <SessionProviderWrapper className="h-full">
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
