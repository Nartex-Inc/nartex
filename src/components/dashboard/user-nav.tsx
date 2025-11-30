// src/components/dashboard/user-nav.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LogOut,
  Settings,
  User,
  HelpCircle,
  Keyboard,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function UserNav() {
  const { data } = useSession();
  const user = data?.user;

  if (!user) return null;

  const display = user.name || user.email?.split("@")[0] || "Utilisateur";
  const initials = display
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center justify-center h-9 w-9 rounded-lg",
            "hover:bg-[hsl(var(--bg-elevated))] transition-colors",
            "outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg-base))]"
          )}
          aria-label="Menu utilisateur"
        >
          <Avatar className="h-7 w-7 ring-2 ring-[hsl(var(--border-subtle))] transition-all hover:ring-[hsl(var(--border-default))]">
            <AvatarImage src={user.image ?? ""} alt={display} />
            <AvatarFallback className="text-[10px] font-bold bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(187,100%,40%)] text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 p-1.5 bg-[hsl(var(--bg-surface))] border-[hsl(var(--border-default))] shadow-xl rounded-xl z-[60]"
        forceMount
      >
        {/* User Info Header */}
        <DropdownMenuLabel className="px-2 py-2.5">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-[hsl(var(--border-subtle))]">
              <AvatarImage src={user.image ?? ""} alt={display} />
              <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(187,100%,40%)] text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-[hsl(var(--text-primary))]">
                {display}
              </p>
              {user.email && (
                <p className="truncate text-xs text-[hsl(var(--text-tertiary))]">
                  {user.email}
                </p>
              )}
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-[hsl(var(--border-subtle))] my-1" />

        {/* Navigation Items */}
        <DropdownMenuGroup className="space-y-0.5">
          <DropdownMenuItem asChild>
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))] cursor-pointer transition-colors"
            >
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">Profil</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))] cursor-pointer transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">Paramètres</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              href="/dashboard/billing"
              className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))] cursor-pointer transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              <span className="text-sm font-medium">Facturation</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <button
              className="w-full flex items-center justify-between gap-2.5 px-2 py-2 rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))] cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Keyboard className="h-4 w-4" />
                <span className="text-sm font-medium">Raccourcis</span>
              </div>
              <kbd className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-muted))] border border-[hsl(var(--border-subtle))]">
                ?
              </kbd>
            </button>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-[hsl(var(--border-subtle))] my-1" />

        {/* Help & Support */}
        <DropdownMenuGroup className="space-y-0.5">
          <DropdownMenuItem asChild>
            <Link
              href="/help"
              className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))] cursor-pointer transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Aide & Support</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              href="/dashboard/upgrade"
              className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-muted))] cursor-pointer transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Mettre à niveau</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-[hsl(var(--border-subtle))] my-1" />

        {/* Sign Out */}
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-muted))] cursor-pointer transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm font-medium">Déconnexion</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserNav;
