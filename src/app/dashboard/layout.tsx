"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
// --- FIX: Removed the .tsx extensions ---
import { Header } from "@/components/dashboard/header"; 
import { Sidebar } from "@/components/dashboard/sidebar";
import { mockApprovalRequestsData, mockUserTasksData } from "@/lib/data";
import { TaskStatus } from "@/lib/types";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const checkSize = () => setIsSidebarOpen(window.innerWidth >= 1024);
    window.addEventListener('resize', checkSize);
    checkSize();
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/");
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const overdueTasksCount = mockUserTasksData.filter(t => t.status === TaskStatus.EN_RETARD).length;
  const pendingApprovalsCount = mockApprovalRequestsData.filter(a => a.status === 'pending').length;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <Header
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        notificationCount={pendingApprovalsCount + overdueTasksCount}
      />
      <div className="flex-1 flex overflow-hidden">
        {isSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-20 bg-black/40" onClick={() => setIsSidebarOpen(false)}></div>
        )}
        <Sidebar
          isOpen={isSidebarOpen}
          toggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        />
        <main className="flex-grow min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}