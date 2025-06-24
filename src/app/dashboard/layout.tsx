// src/app/dashboard/layout.tsx (FINAL AND CORRECTED)

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

  // State 1: For the DESKTOP sidebar (expanded vs collapsed)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // State 2: For the MOBILE sidebar (visible vs hidden overlay)
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleDesktopSidebar = () => setIsSidebarOpen(prev => !prev);
  const toggleMobileSidebar = () => setMobileSidebarOpen(prev => !prev);

  // Lock body scroll when the mobile sidebar is open
  useEffect(() => {
    if (isMobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMobileSidebarOpen]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Once authenticated, render the layout
  return (
    <div className="flex h-screen w-full overflow-hidden bg-muted/40">
      
      {/* Backdrop for mobile sidebar overlay */}
      {isMobileSidebarOpen && (
        <div 
          onClick={toggleMobileSidebar}
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          aria-hidden="true"
        />
      )}

      {/* Sidebar now receives props for both states */}
      <Sidebar
        isOpen={isSidebarOpen}
        isMobileOpen={isMobileSidebarOpen}
        toggleSidebar={toggleDesktopSidebar}
        closeMobileSidebar={toggleMobileSidebar}
      />

      <div className="flex flex-col flex-1 w-full overflow-hidden">
        <Header 
          onToggleMobileSidebar={toggleMobileSidebar} 
          notificationCount={5} // Example
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
