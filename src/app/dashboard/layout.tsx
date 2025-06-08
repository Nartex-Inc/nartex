// src/app/dashboard/layout.tsx
"use client";

import { useState, useEffect } from "react"; // Added useState
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
  const sessionHookData = useSession();
  const { status } = sessionHookData;
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // State to control the sidebar

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/");
    }
  }, [status]);

  if (status === "loading" || !sessionHookData) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "authenticated") {
    return (
      <div className="flex h-screen flex-col bg-muted/40">
        {/* Your MVP header, not the one from the old screenshot */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          notificationCount={0}
        />
        
        {/* FIX: This container is now the main layout area.
            - `flex-1`: Takes up all remaining vertical space.
            - `overflow-hidden`: CRITICAL FIX. Prevents this container from growing larger
              than the viewport, which stops the whole page from scrolling.
        */}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            isOpen={isSidebarOpen}
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return null; // Fallback while redirecting or for other states
}