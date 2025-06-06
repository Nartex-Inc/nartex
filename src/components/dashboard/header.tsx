"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, Bell } from 'lucide-react';

// --- FIX: Corrected relative import paths ---
// Assuming UserNav is also a dashboard-specific component
import { UserNav } from './user-nav'; 
// Assuming ModeToggle is a general component, so we go up one level from 'dashboard'
import { ModeToggle } from '../theme-toggle'; 

interface HeaderProps {
  onToggleSidebar: () => void;
  notificationCount: number;
}

export function Header({ onToggleSidebar, notificationCount }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    };
    updateDateTime();
    const intervalId = setInterval(updateDateTime, 60000); // Update every minute
    return () => clearInterval(intervalId);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-gray-700 py-3 shadow-sm">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 max-w-full mx-auto">
        <div className="flex items-center">
          <button
            onClick={onToggleSidebar}
            className="text-gray-400 hover:text-white transition-colors duration-150 p-2 -ml-2 mr-2 rounded-md focus:outline-none active:text-green-500 active:bg-gray-700/50"
            aria-label="Toggle navigation menu"
          >
            <Menu size={20} />
          </button>
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/nartex-logo.svg"
              alt="Nartex Logo"
              width={110}
              height={28}
              priority
              className="inline-block filter invert brightness-125 contrast-150"
            />
          </Link>
        </div>

        <div className="flex items-center space-x-4 md:space-x-6">
          <div className="hidden md:flex items-center">
            <div className="text-sm text-gray-400 mr-4">{currentDate}</div>
            <div className="bg-gray-800/70 backdrop-blur-sm px-3.5 py-1.5 rounded-lg border border-gray-700">
              <span className="text-green-400 font-medium">{currentTime}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 md:space-x-4">
            <ModeToggle />
            <Link
              href="/dashboard/notifications"
              className="text-gray-400 hover:text-white transition relative p-2 rounded-full hover:bg-gray-700/50"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {notificationCount > 0 && (
                <span className="absolute top-0 right-0 flex h-3 w-3 -mt-0.5 -mr-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              )}
            </Link>
            <UserNav />
          </div>
        </div>
      </div>
    </header>
  );
}