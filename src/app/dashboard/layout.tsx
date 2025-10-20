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

  // Keep a CSS variable updated with the actual sidebar width so the main
  // content can reserve that space and never overlap the fixed sidebar.
  React.useEffect(() => {
    const setVar = () => {
      const w = window.matchMedia("(min-width: 1024px)").matches
        ? isDesktopOpen
          ? "16rem" // expanded width (w-64)
          : "84px"  // collapsed width
        : "0px";   // on mobile, content shouldn't be pushed
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
    // IMPORTANT: no page-level background classes here (transparent so body shows)
    <div className="relative min-h-screen">
      {/* Sticky app header (glass) */}
      <Header
        onToggleMobileSidebar={() => setMobileOpen((v) => !v)}
        notificationCount={5}
      />

      {/* Mobile backdrop (transparent overlay, no solid bg) */}
      {isMobileOpen && (
        <button
          aria-label="Fermer le menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Fixed sidebar (glass) */}
      <Sidebar
        isOpen={isDesktopOpen}
        isMobileOpen={isMobileOpen}
        toggleSidebar={() => setDesktopOpen((v) => !v)}
        closeMobileSidebar={() => setMobileOpen(false)}
      />

      {/* Main content – no bg so the body background image is visible */}
      <main className="relative z-10 with-sidebar-pad px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <div className="mx-auto w-full max-w-[1920px]">
          {children}
        </div>
      </main>
    </div>
  );
}
