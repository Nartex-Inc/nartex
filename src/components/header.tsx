// src/components/Header.tsx

"use client";

import NartexLogo from "@/components/nartex-logo";
import { ModeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/user-nav";
import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-black"> {/* Black primary header */}
      <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
          {/*
            QUICK FIX: Added the `invert` class.
            This CSS filter will turn the black parts of the SVG to white.
          */}
          <NartexLogo className="h-4 w-auto invert" />
        </Link>
        
        <div className="ml-auto flex items-center space-x-4">
          <ModeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  );
}