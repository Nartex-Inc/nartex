// src/app/dashboard/layout.tsx
"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionData = useSession(); // Get the whole object first
  const { data: session, status } = sessionData; // Destructure if sessionData is not undefined

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/");
    }
  }, [status]);

  if (status === "loading" || !sessionData) { // Add check for !sessionData
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "authenticated" && session) { // Ensure session is also truthy
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-6 bg-background overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Fallback or if status is neither loading, authenticated, nor unauthenticated
  // This path should ideally not be hit if redirects and loading states are correct.
  // If it's unauthenticated and somehow didn't redirect, show loading or redirect again.
  if (status === "unauthenticated") {
    // The useEffect should handle this, but as a failsafe:
    redirect("/");
    return null; // Or a loading indicator while redirecting
  }
  
  return ( // Default fallback if none of the above conditions met
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2">Verifying session...</p>
      </div>
    );
}