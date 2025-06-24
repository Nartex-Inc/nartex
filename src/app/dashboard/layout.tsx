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

  const [isDesktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleDesktopSidebar = () => setDesktopSidebarOpen(prev => !prev);
  const toggleMobileSidebar = () => setMobileSidebarOpen(prev => !prev);

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
    // The root container is now a COLUMN, forcing the header to the top.
    <div className="flex h-screen flex-col bg-muted/40">
      <Header 
        onToggleMobileSidebar={toggleMobileSidebar} 
        notificationCount={5} // Example
      />
      
      {/* This new container holds the content BELOW the header in a ROW. */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile backdrop is placed here */}
        {isMobileSidebarOpen && (
          <div 
            onClick={toggleMobileSidebar}
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            aria-hidden="true"
          />
        )}
        
        {/* Sidebar now lives inside this flex row */}
        <Sidebar
          isOpen={isDesktopSidebarOpen}
          isMobileOpen={isMobileSidebarOpen}
          toggleSidebar={toggleDesktopSidebar}
          closeMobileSidebar={toggleMobileSidebar}
        />
        
        {/* Main content area is the sibling to the sidebar */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
