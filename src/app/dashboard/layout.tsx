// src/app/dashboard/layout.tsx
"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import LoadingAnimation from "@/components/LoadingAnimation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  // Update CSS variable for sidebar width
  React.useEffect(() => {
    const setVar = () => {
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      const w = isDesktop ? (isDesktopOpen ? "16rem" : "72px") : "0px";
      document.documentElement.style.setProperty("--sidebar-w", w);
    };
    setVar();
    window.addEventListener("resize", setVar);
    return () => window.removeEventListener("resize", setVar);
  }, [isDesktopOpen]);

  if (status === "loading") {
    return <LoadingAnimation />;
  }

  return (
    <div className="relative min-h-screen bg-[hsl(var(--bg-base))]">
      {/* Sidebar */}
      <Sidebar
        isOpen={isDesktopOpen}
        isMobileOpen={isMobileOpen}
        toggleSidebar={() => setDesktopOpen((v) => !v)}
        closeMobileSidebar={() => setMobileOpen(false)}
      />

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <button
          aria-label="Fermer le menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden animate-fade-in"
        />
      )}

      {/* Main content wrapper */}
      <div className="lg:pl-[var(--sidebar-w)] transition-[padding] duration-200">
        {/* Header */}
        <Header
          onToggleMobileSidebar={() => setMobileOpen((v) => !v)}
          notificationCount={5}
        />

        {/* Page content */}
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  );
}
