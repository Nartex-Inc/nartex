// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "./SessionProviderWrapper";
import { ThemeProvider } from "@/components/theme-provider"; // ⬅️ add this

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nartex Application",
  description: "Your Application Description",
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
