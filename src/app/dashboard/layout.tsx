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
  // Session management and loading state are perfect. No changes needed here.
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/");
    },
  });

  // State management for sidebars.
  const [isDesktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // --- FUNCTION DEFINITIONS ---
  
  // This toggles the desktop sidebar (collapse/expand). CORRECT.
  const toggleDesktopSidebar = () => setDesktopSidebarOpen(prev => !prev);
  
  // This toggles the mobile sidebar (open/close overlay). CORRECT.
  // This is used for the hamburger button in the header.
  const toggleMobileSidebar = () => setMobileSidebarOpen(prev => !prev);

  // --- FIX: Create a dedicated function to ONLY close the mobile sidebar ---
  // This is what the Sidebar component needs to close the menu when a link is clicked.
  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  // This effect to prevent body scroll is a great UX touch. No changes needed.
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

  return (
    <div className="flex h-screen flex-col bg-muted/40">
      <Header 
        onToggleMobileSidebar={toggleMobileSidebar} // The header button correctly TOGGLES the menu.
        notificationCount={5} // Example
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile backdrop correctly uses TOGGLE to close the menu. */}
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
          // --- FIX: Pass the new, correct function here ---
          closeMobileSidebar={closeMobileSidebar} // This now correctly passes the function that ONLY closes.
        />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
