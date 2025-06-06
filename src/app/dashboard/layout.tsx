"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
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
    // Set initial state based on screen size, but only on the client
    const checkSize = () => setIsSidebarOpen(window.innerWidth >= 1024);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/");
    }
  }, [status]);

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate notification count for the header
  const overdueTasksCount = mockUserTasksData.filter(t => t.status === TaskStatus.EN_RETARD).length;
  const pendingApprovalsCount = mockApprovalRequestsData.filter(a => a.status === 'pending').length;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      {/* Pass the toggle function to the Header */}
      <Header
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        notificationCount={pendingApprovalsCount + overdueTasksCount}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Pass the state and toggle function to the Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        
        <main className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex-grow p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}