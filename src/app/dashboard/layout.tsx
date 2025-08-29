// src/app/dashboard/layout.tsx
"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth gate for everything under /dashboard
  const { status } = useSession({
    required: true,
    onUnauthenticated: () => redirect("/"),
  });

  const [isDesktopOpen, setDesktopOpen] = React.useState(true);
  const [isMobileOpen, setMobileOpen] = React.useState(false);

  // Lock body scroll when mobile nav is open
  React.useEffect(() => {
    document.body.style.overflow = isMobileOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isMobileOpen]);

  // Keep a CSS variable updated with the *actual* sidebar width so the main
  // content can reserve that space and never overlap the fixed sidebar.
  React.useEffect(() => {
    const setVar = () => {
      const w = window.matchMedia("(min-width: 1024px)").matches
        ? isDesktopOpen
          ? "16rem" // expanded width (w-64)
          : "84px" // collapsed width
        : "0px"; // on mobile, content shouldn't be pushed
      document.documentElement.style.setProperty("--sidebar-w", w);
    };
    setVar();
    window.addEventListener("resize", setVar);
    return () => window.removeEventListener("resize", setVar);
  }, [isDesktopOpen]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Chargement…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {/* Sticky app header */}
      <Header
        onToggleMobileSidebar={() => setMobileOpen((v) => !v)}
        notificationCount={5}
      />

      <div className="relative flex flex-1 overflow-hidden">
        {/* Mobile backdrop */}
        {isMobileOpen && (
          <div
            aria-hidden
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          />
        )}

        {/* Fixed sidebar (renders itself fixed below the header) */}
        <Sidebar
          isOpen={isDesktopOpen}
          isMobileOpen={isMobileOpen}
          toggleSidebar={() => setDesktopOpen((v) => !v)}
          closeMobileSidebar={() => setMobileOpen(false)}
        />

        {/* Main content; reserve space for the sidebar on lg+ via CSS var */}
        <main className="relative z-0 flex-1 overflow-y-auto">
          <div className="lg:pl-[var(--sidebar-w)]">
            <div className="mx-auto max-w-[1400px] px-3 sm:px-4 py-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
