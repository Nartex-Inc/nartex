// src/app/dashboard/layout.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Header } from "@/components/dashboard/header"; 
import { Sidebar } from "@/components/dashboard/sidebar";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/");
    },
  });

  const [isDesktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleDesktopSidebar = () => setDesktopSidebarOpen(prev => !prev);
  const toggleMobileSidebar = () => setMobileSidebarOpen(prev => !prev);
  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  useEffect(() => {
    if (isMobileSidebarOpen) { document.body.style.overflow = 'hidden'; } 
    else { document.body.style.overflow = 'auto'; }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isMobileSidebarOpen]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-muted/40">
      <Header 
        onToggleMobileSidebar={toggleMobileSidebar} 
        notificationCount={5}
      />
      <div className="flex flex-1 overflow-hidden">
        {isMobileSidebarOpen && (
          <div 
            onClick={toggleMobileSidebar}
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            aria-hidden="true"
          />
        )}
        <Sidebar
          isOpen={isDesktopSidebarOpen}
          isMobileOpen={isMobileSidebarOpen}
          toggleSidebar={toggleDesktopSidebar}
          closeMobileSidebar={closeMobileSidebar}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
