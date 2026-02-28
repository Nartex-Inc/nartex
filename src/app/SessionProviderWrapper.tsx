// src/app/SessionProviderWrapper.tsx

"use client";

import { SessionProvider, signOut, useSession } from "next-auth/react";
import React, { useEffect, useRef, useCallback } from "react";

/* ---------------------------------------------------------------------------
   Inactivity Monitor
   - Tracks user activity (mouse, keyboard, click, scroll, touch)
   - Calls signOut() after 2 hours of inactivity
   - Refreshes the JWT every 5 minutes while the user is active
--------------------------------------------------------------------------- */
const INACTIVITY_LIMIT_MS = 2 * 60 * 60 * 1000; // 2 hours
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;       // refresh JWT every 5 min
const CHECK_INTERVAL_MS = 60 * 1000;              // check every 60 s

function InactivityMonitor() {
  const { status } = useSession();
  const lastActivity = useRef(Date.now());
  const lastRefresh = useRef(Date.now());

  const onActivity = useCallback(() => {
    lastActivity.current = Date.now();
  }, []);

  // Attach activity listeners only when authenticated
  useEffect(() => {
    if (status !== "authenticated") return;
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, [status, onActivity]);

  // Periodic check: sign out if idle, refresh JWT if active
  useEffect(() => {
    if (status !== "authenticated") return;
    const interval = setInterval(() => {
      const now = Date.now();
      const idle = now - lastActivity.current;

      if (idle >= INACTIVITY_LIMIT_MS) {
        signOut({ callbackUrl: "/" });
        return;
      }

      // User was active recently — extend the JWT if enough time has passed
      if (idle < REFRESH_INTERVAL_MS && now - lastRefresh.current >= REFRESH_INTERVAL_MS) {
        lastRefresh.current = now;
        // Ping the session endpoint to re-sign the JWT cookie server-side.
        // We intentionally avoid useSession().update() here — if that call
        // fails or returns an empty response, NextAuth sets the client-side
        // session to null (status → "unauthenticated"), which:
        //   1. Makes the profile picture disappear (shows "U")
        //   2. Kills the InactivityMonitor interval (status guard)
        //   3. Stops all future JWT refreshes (death spiral)
        //   4. JWT cookie eventually expires → forced logout on refresh
        // A direct fetch() refreshes the cookie without touching React state.
        fetch("/api/auth/session").catch(() => {});
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [status]);

  return null;
}

interface Props {
  children: React.ReactNode;
  className?: string;
}

const SessionProviderWrapper = ({ children, className }: Props) => {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <InactivityMonitor />
      <div className={className}>{children}</div>
    </SessionProvider>
  );
};

export default SessionProviderWrapper;
