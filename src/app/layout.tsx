// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "./SessionProviderWrapper";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title:
    "Nartex | CRM visuel & BI | Automatisation et optimisation des processus connectés",
  description:
    "Nartex est une plateforme SaaS de CRM visuel et intelligence d'affaires (BI) qui automatise vos processus et connecte vos données pour des insights exploitables.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen antialiased text-foreground selection:bg-primary/20 selection:text-primary`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProviderWrapper>{children}</SessionProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
