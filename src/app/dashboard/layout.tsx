// src/app/dashboard/layout.tsx
"use client";

import * as React from "react";
import { useSession, signIn } from "next-auth/react";
import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import LoadingAnimation from "@/components/LoadingAnimation";
import { AccentColorProvider } from "@/components/accent-color-provider";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ---------------------------------------------------------------------------
  // SESSION — do NOT use `required: true` because it calls onUnauthenticated
  // on every transient "loading" → "unauthenticated" flicker (e.g. when
  // InactivityMonitor calls update() to refresh the JWT). That redirect
  // unmounts all children and destroys form state.
  // ---------------------------------------------------------------------------
  const { data: session, status } = useSession();

  // Track whether the user has ever been authenticated in this mount.
  // Once true, we never show the loading skeleton again — child pages
  // stay mounted even during background session refreshes.
  const wasAuthenticated = React.useRef(false);
  if (status === "authenticated") wasAuthenticated.current = true;

  // Session recovery: if the user was authenticated but the session is now
  // lost (stale deployment, network error, etc.), reload once to let the
  // server re-read the JWT cookie and restore the session.
  const recoveryAttempted = React.useRef(false);
  React.useEffect(() => {
    if (status === "unauthenticated" && wasAuthenticated.current && !recoveryAttempted.current) {
      recoveryAttempted.current = true;
      window.location.reload();
      return;
    }
    if (status === "unauthenticated" && !wasAuthenticated.current) {
      signIn();
    }
  }, [status]);

  const [isDesktopOpen, setDesktopOpen] = React.useState(true);
  const [isMobileOpen, setMobileOpen] = React.useState(false);

  // ---------------------------------------------------------------------------
  // ROLE CHECK
  // ---------------------------------------------------------------------------
  React.useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const userEmail = session.user.email;
      const userRole = (session.user as any).role;
      
      const allowedRoles = [
        "ventes-exec",
        "ventes_exec",
        "Gestionnaire",
        "GestionnaireTest",
        "Expert",
        "admin"
      ];

      const isBypassed = userEmail === "n.labranche@sinto.ca";
      const isAllowed = isBypassed || (userRole && allowedRoles.includes(userRole));

      if (!isAllowed) {
        console.warn("Access Denied by Layout. Role:", userRole);
      }
    }
  }, [status, session]);

  // ---------------------------------------------------------------------------
  // UI LOGIC
  // ---------------------------------------------------------------------------

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

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isMobileOpen]);

  // Only show the loading skeleton on the very first load.
  // After that, keep children mounted to preserve form state.
  if (!wasAuthenticated.current && status === "loading") {
    return <LoadingAnimation />;
  }

  // Safely access the role for the sidebar prop
  const currentUserRole = (session?.user as any)?.role || "";

  return (
    <AccentColorProvider>
      <div className="relative min-h-screen bg-[hsl(var(--bg-base))]">
        {/* Sidebar */}
        <Sidebar
          isOpen={isDesktopOpen}
          isMobileOpen={isMobileOpen}
          toggleSidebar={() => setDesktopOpen((v) => !v)}
          closeMobileSidebar={() => setMobileOpen(false)}
          // *** FIX: Pass the userRole prop here ***
          userRole={currentUserRole}
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
          />

          {/* Page content */}
          <main className="flex-1 pt-1 lg:pt-2 page-enter">{children}</main>
        </div>
      </div>
    </AccentColorProvider>
  );
}
