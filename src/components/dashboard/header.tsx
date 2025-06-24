"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Bell, Menu } from 'lucide-react'; // Import Menu icon
import { UserNav } from '@/components/dashboard/user-nav';
import { ModeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button'; // Import Button

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  notificationCount: number;
}

export function Header({ onToggleMobileSidebar, notificationCount }: HeaderProps) {
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
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="flex h-16 items-center px-4 sm:px-6">
        
        {/* --- Hamburger Menu for Mobile --- */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden mr-2" 
          onClick={onToggleMobileSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-6 w-6" />
        </Button>

        {/* Nartex Logo (Hidden on smaller screens for more space) */}
        <Link href="/dashboard" className="hidden sm:flex items-center gap-2">
          <Image
            src="/nartex-logo.svg"
            alt="Nartex Logo"
            width={74}
            height={19}
            priority
            className="dark:invert"
          />
        </Link>

        {/* Right side utilities */}
        <div className="ml-auto flex items-center space-x-2 sm:space-x-4">
          <div className="hidden md:flex items-center text-sm text-muted-foreground">
            <span>{currentDate}</span>
            <span className="mx-2 text-muted-foreground/50">|</span>
            <span className="font-mono tracking-tighter text-foreground">{currentTime}</span>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
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
