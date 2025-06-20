// src/app/layout.tsx
import type { Metadata } from "next";
import { Poppins } from "next/font/google"; // <-- NEW: Import Poppins
import "./globals.css";
import SessionProviderWrapper from "./SessionProviderWrapper";

// --- NEW: Configure the Poppins font ---
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"], // Include various weights
  variable: "--font-poppins", // Set a CSS variable
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
    // Add the new font variable to the html tag
    <html lang="fr" suppressHydrationWarning className={`${poppins.variable} h-full`}>
      <body
        // Set the new font as the default sans-serif font
        className="h-full bg-zinc-900 font-sans antialiased overflow-hidden"
      >
        <SessionProviderWrapper>
            {children}
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
