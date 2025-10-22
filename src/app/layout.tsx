// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "./SessionProviderWrapper";
import { ThemeProvider } from "@/components/theme-provider"; // ⬅️ add this

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nartex | CRM visuel & BI | Automatisation et optimisation des processus connectés",
  description: "Nartex est une plateforme SaaS de CRM visuel et intelligence d'affaires (BI) qui automatise vos processus et connecte vos données pour des insights exploitables.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background text-foreground`}>
        {/* Mount next-themes at the root so it can toggle <html>. */}
        <ThemeProvider
          attribute="class"           // Tailwind expects the 'dark' class
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProviderWrapper>
            {children}
          </SessionProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
