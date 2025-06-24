"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Header } from "@/components/dashboard/header"; 
import { Sidebar } from "@/components/dashboard/sidebar";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/"); // This is more robust than the useEffect method
    },
  });

  // STATE 1: For the DESKTOP sidebar (expanded vs collapsed)
  const [isDesktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  
  // STATE 2: For the MOBILE sidebar (visible vs hidden overlay)
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleDesktopSidebar = () => setDesktopSidebarOpen(prev => !prev);
  const toggleMobileSidebar = () => setMobileSidebarOpen(prev => !prev);

  // Best Practice: Lock body scroll when the mobile sidebar is open
  useEffect(() => {
    if (isMobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    // Cleanup function to restore scroll if the component unmounts
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMobileSidebarOpen]);


  // Show a full-screen loader while the session is being verified
  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Once authenticated, render the main layout
  return (
    <div className="flex h-screen w-full overflow-hidden bg-muted/40">
      
      {/* --- ADDED ---: Backdrop for mobile sidebar overlay */}
      {isMobileSidebarOpen && (
        <div 
          onClick={toggleMobileSidebar} // Close sidebar on backdrop click
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          aria-hidden="true"
        />
      )}

      {/* Sidebar now receives props for both mobile and desktop states */}
      <Sidebar
        isOpen={isDesktopSidebarOpen}
        isMobileOpen={isMobileSidebarOpen}
        toggleSidebar={toggleDesktopSidebar} // For desktop collapse button
        closeMobileSidebar={toggleMobileSidebar} // For mobile links to close the menu
      />

      <div className="flex flex-col flex-1 w-full overflow-hidden">
        {/* Header now receives a function to toggle the MOBILE sidebar */}
        <Header 
          onToggleMobileSidebar={toggleMobileSidebar} 
          notificationCount={5} // Example count
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
