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

  // Keep a CSS variable updated with the *actual* sidebar width so the main
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
    // CHANGED: Removed opaque background to let body background show through
    <div className="flex min-h-screen flex-col">
      {/* Sticky app header with glass morphism */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/5 dark:bg-black/5 border-b border-white/10 dark:border-white/5">
        <Header
          onToggleMobileSidebar={() => setMobileOpen((v) => !v)}
          notificationCount={5}
        />
      </div>
      
      <div className="relative flex flex-1 overflow-hidden">
        {/* Mobile backdrop */}
        {isMobileOpen && (
          <div
            aria-hidden
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          />
        )}
        
        {/* Fixed sidebar with glass morphism */}
        <div className="relative z-40">
          <Sidebar
            isOpen={isDesktopOpen}
            isMobileOpen={isMobileOpen}
            toggleSidebar={() => setDesktopOpen((v) => !v)}
            closeMobileSidebar={() => setMobileOpen(false)}
          />
        </div>
        
        {/* Main content with transparent background */}
        <main className="relative z-0 flex-1 overflow-y-auto">
          <div className="lg:pl-[var(--sidebar-w)]">
            {/* Content wrapper with subtle glass effect for readability */}
            <div className="mx-auto w-full max-w-[1760px] 2xl:max-w-[2000px] px-2 sm:px-4 lg:px-6 xl:px-8 py-6 lg:py-8">
              {/* Optional: Add a very subtle background to content area for better readability */}
              <div className="relative">
                {/* Subtle backdrop for content readability */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-white/[0.01] dark:from-black/20 dark:to-black/10 rounded-3xl backdrop-blur-[2px]" />
                <div className="relative">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
