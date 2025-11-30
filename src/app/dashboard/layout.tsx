// src/app/dashboard/layout.tsx
"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import LoadingAnimation from "@/components/LoadingAnimation";
import { cn } from "@/lib/utils";

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
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  // Update CSS variable for sidebar width
  React.useEffect(() => {
    const updateSidebarWidth = () => {
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      const w = isDesktop ? (isDesktopOpen ? "15rem" : "68px") : "0px";
      document.documentElement.style.setProperty("--sidebar-w", w);
    };
    updateSidebarWidth();
    window.addEventListener("resize", updateSidebarWidth);
    return () => window.removeEventListener("resize", updateSidebarWidth);
  }, [isDesktopOpen]);

  // Close mobile sidebar on route change (ESC key)
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isMobileOpen]);

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

      {/* Mobile backdrop with blur */}
      {isMobileOpen && (
        <div
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "fixed inset-0 z-40 lg:hidden",
            "bg-black/50 backdrop-blur-sm",
            "animate-in fade-in-0 duration-200"
          )}
        />
      )}

      {/* Main content area */}
      <div
        className={cn(
          "flex flex-col min-h-screen",
          "lg:pl-[var(--sidebar-w)]",
          "transition-[padding] duration-200 ease-out"
        )}
      >
        {/* Header */}
        <Header
          onToggleMobileSidebar={() => setMobileOpen((v) => !v)}
          notificationCount={5}
        />

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
