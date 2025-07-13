// src/components/dashboard/header.tsx
"use client";

import React from 'react';
import Image from 'next/image';
import { Bell, Menu } from 'lucide-react';
import { UserNav } from '@/components/dashboard/user-nav';
import { ModeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

// --- FIX: Correctly typed props ---
interface HeaderProps {
  onToggleMobileSidebar: () => void;
  notificationCount: number;
}

export function Header({ onToggleMobileSidebar, notificationCount }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-card">
      <div className="flex h-16 items-center px-4 sm:px-6">
        <div className="flex items-center gap-4">
          {/* Hamburger Menu (mobile only) */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden" 
            onClick={onToggleMobileSidebar} // This now works correctly
            aria-label="Toggle sidebar"
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Logo */}
          <Image
            src="/nartex-logo.svg"
            alt="Nartex Logo"
            width={80}
            height={20}
            priority
            className="dark:invert"
          />
        </div>

        {/* Right side utilities */}
        <div className="ml-auto flex items-center space-x-2 sm:space-x-4">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <ModeToggle />
            <Button variant="ghost" size="icon" className="rounded-full relative">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
              )}
            </Button>
            <UserNav />
          </div>
        </div>
      </div>
    </header>
  );
}
