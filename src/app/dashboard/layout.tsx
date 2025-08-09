"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  // Keep the auth gate here so every /dashboard route is protected
  const { status } = useSession({
    required: true,
    onUnauthenticated: () => redirect("/"),
  });

  const [isDesktopOpen, setDesktopOpen] = React.useState(true);
  const [isMobileOpen, setMobileOpen] = React.useState(false);

  // Lock body scroll when mobile nav is open
  React.useEffect(() => {
    document.body.style.overflow = isMobileOpen ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [isMobileOpen]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Chargement…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      {/* Sticky app header */}
      <Header
        onToggleMobileSidebar={() => setMobileOpen(v => !v)}
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

        {/* Left navigation rail */}
        <Sidebar
          isOpen={isDesktopOpen}
          isMobileOpen={isMobileOpen}
          toggleSidebar={() => setDesktopOpen(v => !v)}
          closeMobileSidebar={() => setMobileOpen(false)}
        />

        {/* Main content */}
        <main className="relative z-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
