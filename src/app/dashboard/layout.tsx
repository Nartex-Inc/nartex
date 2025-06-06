"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
// --- FIX: Corrected import paths to include the 'dashboard' subfolder ---
import { Header } from "@/components/dashboard/header"; 
import { Sidebar } from "@/components/dashboard/sidebar";
import { mockUserTasksData, mockApprovalRequestsData } from "@/lib/data";
import { TaskStatus } from "@/lib/types";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Responsive sidebar
  useEffect(() => {
    const checkSize = () => setIsSidebarOpen(window.innerWidth >= 1024);
    window.addEventListener('resize', checkSize);
    checkSize();
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  // Auth check
  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/");
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-600" />
          <p className="mt-4 text-gray-500 dark:text-gray-400 animate-pulse">
            Chargement de votre espace...
          </p>
        </div>
      </div>
    );
  }

  // Calculate badge counts to pass down
  const overdueTasksCount = mockUserTasksData.filter(t => t.status === TaskStatus.EN_RETARD).length;
  const pendingApprovalsCount = mockApprovalRequestsData.filter(a => a.status === 'pending').length;
  const openTasksCount = mockUserTasksData.filter(t => t.status !== TaskStatus.FAIT && t.status !== TaskStatus.NON_APPLICABLE).length;

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
      <Header
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        notificationCount={pendingApprovalsCount + overdueTasksCount}
      />
      <div className="flex-1 flex overflow-hidden">
        {isSidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-20 bg-black/40"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}
        <Sidebar
          isOpen={isSidebarOpen}
          toggleSidebar={() => setIsSidebarOpen(prev => !prev)}
          openTasksCount={openTasksCount}
          pendingApprovalsCount={pendingApprovalsCount}
        />
        <main className="flex-grow min-w-0 overflow-y-auto">
            {children}
        </main>
      </div>
    </div>
  );
}