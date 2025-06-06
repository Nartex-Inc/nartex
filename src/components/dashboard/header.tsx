"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Bell } from 'lucide-react';
import { UserNav } from '@/components/dashboard/user-nav'; // Standardized path alias
import { ModeToggle } from '@/components/theme-toggle';   // Standardized path alias

// FIX: Correctly define the props the component receives from layout.tsx
interface HeaderProps {
  onToggleSidebar: () => void; // This was missing
  notificationCount: number;
}

// FIX: Correctly destructure the props from the function argument
export function Header({ onToggleSidebar, notificationCount }: HeaderProps) {
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    };
    updateDateTime();
    const intervalId = setInterval(updateDateTime, 60000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="flex h-16 items-center px-6">
        {/* Nartex Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/nartex-logo.svg"
            alt="Nartex Logo"
            width={74} // 33% smaller
            height={19}
            priority
            className="dark:invert"
          />
        </Link>

        {/* Right side utilities */}
        <div className="ml-auto flex items-center space-x-4">
          <div className="hidden md:flex items-center text-sm text-muted-foreground">
            <span>{currentDate}</span>
            <span className="mx-2 text-muted-foreground/50">|</span>
            <span className="font-mono tracking-tighter text-foreground">{currentTime}</span>
          </div>

          <div className="flex items-center space-x-2">
            <ModeToggle />
            <Link
              href="/dashboard/notifications"
              className="group relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
              )}
            </Link>
            <UserNav />
          </div>
        </div>
      </div>
    </header>
  );
}