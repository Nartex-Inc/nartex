// src/app/SessionProviderWrapper.tsx

"use client";

import { SessionProvider } from "next-auth/react";
import React, { useEffect } from "react";

/* ---------------------------------------------------------------------------
   Stale Deployment Detector
   - After a rolling ECS deployment, users with cached client-side JS will
     get "Failed to find Server Action" errors because the old bundle
     references server action IDs that no longer exist.
   - This listener catches those errors globally and forces a full page
     reload to fetch the new client bundle.
--------------------------------------------------------------------------- */
function StaleDeploymentDetector() {
  useEffect(() => {
    const isStaleError = (msg: string) =>
      msg.includes("Failed to find Server Action") ||
      msg.includes("older or newer deployment");

    const handleError = (e: ErrorEvent) => {
      if (isStaleError(e.message || "")) {
        window.location.reload();
      }
    };

    const handleRejection = (e: PromiseRejectionEvent) => {
      const msg = e.reason?.message || e.reason?.digest || String(e.reason || "");
      if (isStaleError(msg)) {
        window.location.reload();
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}

interface Props {
  children: React.ReactNode;
  className?: string;
}

const SessionProviderWrapper = ({ children, className }: Props) => {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <StaleDeploymentDetector />
      <div className={className}>{children}</div>
    </SessionProvider>
  );
};

export default SessionProviderWrapper;
