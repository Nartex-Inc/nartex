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
import { LogOut, Settings, User, HelpCircle, Keyboard } from "lucide-react";

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
        <button className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[hsl(var(--bg-elevated))] transition-colors">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image ?? ""} alt={display} />
            <AvatarFallback className="text-[11px] font-bold bg-[hsl(var(--accent))] text-[hsl(var(--bg-base))]">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-64 z-[60] bg-[hsl(var(--bg-surface))] border-[hsl(var(--border-default))] shadow-xl rounded-xl p-1"
        forceMount
      >
        {/* User Info */}
        <DropdownMenuLabel className="px-3 py-3 font-normal">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.image ?? ""} alt={display} />
              <AvatarFallback className="text-xs font-bold bg-[hsl(var(--accent))] text-[hsl(var(--bg-base))]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-0.5 min-w-0">
              <p className="text-sm font-semibold text-[hsl(var(--text-primary))] truncate">
                {display}
              </p>
              {user.email && (
                <p className="text-xs text-[hsl(var(--text-tertiary))] truncate">
                  {user.email}
                </p>
              )}
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-[hsl(var(--border-subtle))]" />

        <DropdownMenuGroup className="p-1">
          <DropdownMenuItem asChild>
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))] cursor-pointer transition-colors"
            >
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">Profil</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))] cursor-pointer transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">Paramètres</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              href="/dashboard/shortcuts"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))] cursor-pointer transition-colors"
            >
              <Keyboard className="h-4 w-4" />
              <span className="text-sm font-medium">Raccourcis</span>
              <kbd className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-muted))]">
                ?
              </kbd>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-[hsl(var(--border-subtle))]" />

        <DropdownMenuGroup className="p-1">
          <DropdownMenuItem asChild>
            <Link
              href="/help"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))] cursor-pointer transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Aide & Support</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-[hsl(var(--border-subtle))]" />

        <div className="p-1">
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-muted))] cursor-pointer transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">Déconnexion</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserNav;
