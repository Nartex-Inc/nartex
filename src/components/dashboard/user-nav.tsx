// src/components/dashboard/user-nav.tsx
"use client";

import * as React from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  User,
  Settings,
  CreditCard,
  Keyboard,
  HelpCircle,
  Sparkles,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Check,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { 
  useAccentColor, 
  ACCENT_PRESETS, 
  type AccentColorKey 
} from "@/components/accent-color-provider";

/**
 * Premium user navigation dropdown.
 * Includes theme toggle and accent color picker.
 * Fixed: modal={false} prevents body scroll lock and layout shift.
 */
export function UserNav() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { accentKey, setAccentKey, accent } = useAccentColor();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const user = session?.user;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  const currentAccentColor = mounted 
    ? (theme === "dark" ? accent.dark : accent.light)
    : accent.light;

  const accentKeys = Object.keys(ACCENT_PRESETS) as AccentColorKey[];

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center justify-center h-9 w-9 rounded-lg",
            "outline-none transition-all duration-200",
            "hover:ring-2 hover:ring-[var(--accent-current)]/30",
            "focus-visible:ring-2 focus-visible:ring-[var(--accent-current)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg-base))]"
          )}
          aria-label="Menu utilisateur"
        >
          <Avatar className="h-8 w-8 ring-2 ring-[hsl(var(--border-subtle))]">
            <AvatarImage src={user?.image ?? ""} alt={user?.name ?? "User"} />
            <AvatarFallback
              className="text-xs font-bold text-white"
              style={{
                background: `linear-gradient(135deg, ${currentAccentColor}, ${currentAccentColor}cc)`,
              }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={cn(
          "w-56 rounded-xl p-1.5 z-[60]",
          "bg-[hsl(var(--bg-surface))] border-[hsl(var(--border-default))]",
          "shadow-xl shadow-black/20"
        )}
      >
        {/* User Info Header */}
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-3 px-2 py-2.5">
            <Avatar className="h-10 w-10 ring-2 ring-[hsl(var(--border-subtle))]">
              <AvatarImage src={user?.image ?? ""} alt={user?.name ?? "User"} />
              <AvatarFallback
                className="text-sm font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, ${currentAccentColor}, ${currentAccentColor}cc)`,
                }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-[hsl(var(--text-primary))] truncate">
                {user?.name ?? "Utilisateur"}
              </span>
              <span className="text-xs text-[hsl(var(--text-muted))] truncate">
                {user?.email ?? ""}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-[hsl(var(--border-subtle))]" />

        {/* Main Menu Items */}
        <DropdownMenuGroup>
          <DropdownMenuItem className="gap-3 px-2 py-2 rounded-lg text-[13px] font-medium text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-elevated))] cursor-pointer">
            <User className="h-4 w-4" />
            Profil
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-3 px-2 py-2 rounded-lg text-[13px] font-medium text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-elevated))] cursor-pointer">
            <Settings className="h-4 w-4" />
            Paramètres
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-3 px-2 py-2 rounded-lg text-[13px] font-medium text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-elevated))] cursor-pointer">
            <CreditCard className="h-4 w-4" />
            Facturation
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-3 px-2 py-2 rounded-lg text-[13px] font-medium text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-elevated))] cursor-pointer justify-between">
            <div className="flex items-center gap-3">
              <Keyboard className="h-4 w-4" />
              Raccourcis
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-muted))] border border-[hsl(var(--border-subtle))]">
              ?
            </kbd>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-[hsl(var(--border-subtle))]" />

        {/* Theme Submenu */}
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-3 px-2 py-2 rounded-lg text-[13px] font-medium text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-elevated))] cursor-pointer">
              {mounted && theme === "dark" ? (
                <Moon className="h-4 w-4" />
              ) : mounted && theme === "light" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Monitor className="h-4 w-4" />
              )}
              Apparence
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                className={cn(
                  "min-w-[140px] rounded-xl p-1.5",
                  "bg-[hsl(var(--bg-surface))] border-[hsl(var(--border-default))]",
                  "shadow-xl shadow-black/20"
                )}
              >
                <DropdownMenuItem
                  onClick={() => setTheme("light")}
                  className={cn(
                    "gap-3 px-2 py-2 rounded-lg text-[13px] font-medium cursor-pointer",
                    theme === "light"
                      ? "bg-[hsl(var(--bg-elevated))]"
                      : "text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-elevated))]"
                  )}
                  style={theme === "light" ? { color: currentAccentColor } : undefined}
                >
                  <Sun className="h-4 w-4" />
                  Clair
                  {theme === "light" && <Check className="h-3 w-3 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "gap-3 px-2 py-2 rounded-lg text-[13px] font-medium cursor-pointer",
                    theme === "dark"
                      ? "bg-[hsl(var(--bg-elevated))]"
                      : "text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-elevated))]"
                  )}
                  style={theme === "dark" ? { color: currentAccentColor } : undefined}
                >
                  <Moon className="h-4 w-4" />
                  Sombre
                  {theme === "dark" && <Check className="h-3 w-3 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme("system")}
                  className={cn(
                    "gap-3 px-2 py-2 rounded-lg text-[13px] font-medium cursor-pointer",
                    theme === "system"
                      ? "bg-[hsl(var(--bg-elevated))]"
                      : "text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-elevated))]"
                  )}
                  style={theme === "system" ? { color: currentAccentColor } : undefined}
                >
                  <Monitor className="h-4 w-4" />
                  Système
                  {theme === "system" && <Check className="h-3 w-3 ml-auto" />}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          {/* Accent Color Submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-3 px-2 py-2 rounded-lg text-[13px] font-medium text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-elevated))] cursor-pointer">
              <div 
                className="h-4 w-4 rounded-full ring-1 ring-black/10"
                style={{ background: currentAccentColor }}
              />
              Couleur
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                className={cn(
                  "min-w-[180px] rounded-xl p-1.5",
                  "bg-[hsl(var(--bg-surface))] border-[hsl(var(--border-default))]",
                  "shadow-xl shadow-black/20"
                )}
              >
                {accentKeys.map((key) => {
                  const preset = ACCENT_PRESETS[key];
                  const isSelected = accentKey === key;
                  const previewColor = theme === "dark" ? preset.dark : preset.light;
                  
                  return (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => setAccentKey(key)}
                      className={cn(
                        "gap-3 px-2 py-2 rounded-lg text-[13px] font-medium cursor-pointer",
                        isSelected
                          ? "bg-[hsl(var(--bg-elevated))]"
                          : "text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-elevated))]"
                      )}
                    >
                      <div 
                        className="h-4 w-4 rounded-full ring-1 ring-black/10 flex items-center justify-center"
                        style={{ background: previewColor }}
                      >
                        {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <span style={isSelected ? { color: previewColor } : undefined}>
                        {preset.name}
                      </span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-[hsl(var(--border-subtle))]" />

        {/* Help & Support */}
        <DropdownMenuItem className="gap-3 px-2 py-2 rounded-lg text-[13px] font-medium text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-elevated))] cursor-pointer">
          <HelpCircle className="h-4 w-4" />
          Aide & Support
        </DropdownMenuItem>

        {/* Upgrade */}
        <DropdownMenuItem 
          className="gap-3 px-2 py-2 rounded-lg text-[13px] font-medium cursor-pointer hover:bg-[hsl(var(--bg-elevated))]"
          style={{ color: currentAccentColor }}
        >
          <Sparkles className="h-4 w-4" />
          Mettre à niveau
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-[hsl(var(--border-subtle))]" />

        {/* Sign Out */}
        <DropdownMenuItem
          onClick={() => signOut()}
          className="gap-3 px-2 py-2 rounded-lg text-[13px] font-medium text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-muted))] cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserNav;
