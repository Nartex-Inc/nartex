// src/components/dashboard/sidebar.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  ListChecks,
  Briefcase,
  UserPlus,
  RefreshCcw,
  Receipt,
  FlaskConical,
  Network,
  PlusCircle,
  Ticket,
  LogOut,
  ChevronLeft,
  FolderTree,
  LayoutDashboard,
  ChevronRight,
  ChevronsUpDown,
  Settings,
  Sparkles,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════════
   Types & Navigation Config
   ═══════════════════════════════════════════════════════════════════════════════ */
type NavItem = { href: string; title: string; icon: React.ElementType };

interface SidebarProps {
  isOpen: boolean;
  isMobileOpen: boolean;
  toggleSidebar: () => void;
  closeMobileSidebar: () => void;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Général",
    items: [
      { href: "/dashboard", title: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/tasks", title: "Mes tâches", icon: ListChecks },
      { href: "/dashboard/projects", title: "Mes projets", icon: Briefcase },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/dashboard/sharepoint", title: "Arborescence", icon: FolderTree },
      { href: "/dashboard/admin/onboarding", title: "Onboarding", icon: UserPlus },
      { href: "/dashboard/admin/returns", title: "Retours", icon: RefreshCcw },
      { href: "/dashboard/admin/collections", title: "Recouvrement", icon: Receipt },
    ],
  },
  {
    title: "R&D",
    items: [
      { href: "/dashboard/rd/requests", title: "Demandes", icon: FlaskConical },
      { href: "/dashboard/rd/pipeline", title: "Pipeline", icon: Network },
    ],
  },
  {
    title: "Support",
    items: [
      { href: "/dashboard/support/new", title: "Nouveau billet", icon: PlusCircle },
      { href: "/dashboard/support/tickets", title: "Billets", icon: Ticket },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   Nav Link Component — Premium Micro-interactions
   ═══════════════════════════════════════════════════════════════════════════════ */
function NavLink({
  item,
  expanded,
  isMobile,
  closeMobile,
}: {
  item: NavItem;
  expanded: boolean;
  isMobile: boolean;
  closeMobile: () => void;
}) {
  const pathname = usePathname();
  const active =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(item.href));

  const content = (
    <Link
      href={item.href}
      onClick={() => isMobile && closeMobile()}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200",
        "outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg-surface))]",
        active
          ? "bg-[hsl(var(--accent))] text-[hsl(var(--bg-base))] shadow-sm shadow-[hsl(var(--accent)/0.25)]"
          : "text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))]",
        !expanded && "justify-center px-0 w-10 mx-auto"
      )}
      aria-current={active ? "page" : undefined}
    >
      <item.icon
        className={cn(
          "shrink-0 transition-all duration-200",
          expanded ? "h-4 w-4" : "h-[18px] w-[18px]",
          active
            ? "text-[hsl(var(--bg-base))]"
            : "text-[hsl(var(--text-tertiary))] group-hover:text-[hsl(var(--text-primary))] group-hover:scale-105"
        )}
        strokeWidth={active ? 2.5 : 2}
      />
      {expanded && (
        <span className="truncate leading-none">{item.title}</span>
      )}
      {/* Active indicator line */}
      {active && expanded && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[hsl(var(--bg-base))] rounded-r-full opacity-80" />
      )}
    </Link>
  );

  if (expanded) return content;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={12}
        className="px-3 py-1.5 text-xs font-medium bg-[hsl(var(--bg-elevated))] border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] shadow-lg"
      >
        {item.title}
      </TooltipContent>
    </Tooltip>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Nav Group Component
   ═══════════════════════════════════════════════════════════════════════════════ */
function NavGroup({
  title,
  expanded,
  children,
}: {
  title: string;
  expanded: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      {expanded && (
        <h2 className="px-3 mb-2 text-[10px] font-semibold tracking-widest uppercase text-[hsl(var(--text-muted))]">
          {title}
        </h2>
      )}
      <nav className={cn("flex flex-col gap-0.5", !expanded && "items-center")}>
        {children}
      </nav>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   User Account Switcher — Premium Dropdown
   ═══════════════════════════════════════════════════════════════════════════════ */
function UserAccountSwitcher({
  user,
  expanded,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
  expanded: boolean;
}) {
  const display = user?.name || user?.email?.split("@")[0] || "Utilisateur";
  const initials = display
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  const trigger = (
    <button
      className={cn(
        "flex items-center gap-3 w-full rounded-lg transition-all duration-200",
        "hover:bg-[hsl(var(--bg-elevated))] active:scale-[0.98]",
        "outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]",
        expanded ? "p-2" : "p-2 justify-center"
      )}
    >
      <Avatar className={cn("ring-2 ring-[hsl(var(--border-subtle))]", expanded ? "h-9 w-9" : "h-8 w-8")}>
        <AvatarImage src={user?.image ?? ""} alt={display} />
        <AvatarFallback className="text-[10px] font-bold bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(187,100%,40%)] text-white">
          {initials}
        </AvatarFallback>
      </Avatar>
      {expanded && (
        <>
          <div className="flex-1 min-w-0 text-left">
            <p className="truncate text-sm font-semibold text-[hsl(var(--text-primary))] leading-tight">
              {display}
            </p>
            <p className="truncate text-[11px] text-[hsl(var(--text-muted))] leading-tight mt-0.5">
              {user?.email}
            </p>
          </div>
          <ChevronsUpDown className="h-4 w-4 text-[hsl(var(--text-muted))] shrink-0" />
        </>
      )}
    </button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {expanded ? (
          trigger
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={12}
              className="px-3 py-2 bg-[hsl(var(--bg-elevated))] border-[hsl(var(--border-default))] shadow-lg"
            >
              <p className="text-sm font-semibold text-[hsl(var(--text-primary))]">{display}</p>
              <p className="text-xs text-[hsl(var(--text-tertiary))]">{user?.email}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={expanded ? "top" : "right"}
        align={expanded ? "start" : "center"}
        sideOffset={8}
        className="w-64 p-1.5 bg-[hsl(var(--bg-surface))] border-[hsl(var(--border-default))] shadow-xl rounded-xl"
      >
        <DropdownMenuLabel className="px-2 py-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-[hsl(var(--border-subtle))]">
              <AvatarImage src={user?.image ?? ""} alt={display} />
              <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(187,100%,40%)] text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-[hsl(var(--text-primary))]">{display}</p>
              <p className="truncate text-xs text-[hsl(var(--text-tertiary))]">{user?.email}</p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-[hsl(var(--border-subtle))] my-1" />

        <DropdownMenuItem asChild>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))] cursor-pointer"
          >
            <Settings className="h-4 w-4" />
            <span className="text-sm font-medium">Paramètres</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href="/dashboard/upgrade"
            className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))] cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Mettre à niveau</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-[hsl(var(--border-subtle))] my-1" />

        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-muted))] cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm font-medium">Déconnexion</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Main Sidebar Component
   ═══════════════════════════════════════════════════════════════════════════════ */
export function Sidebar({
  isOpen,
  isMobileOpen,
  toggleSidebar,
  closeMobileSidebar,
}: SidebarProps) {
  const { data } = useSession();
  const user = data?.user;
  const expanded = isOpen || isMobileOpen;
  const desktopWidth = isOpen ? "lg:w-60" : "lg:w-[68px]";

  React.useEffect(() => {
    const w = isOpen ? "15rem" : "68px";
    document.documentElement.style.setProperty("--sidebar-w", w);
  }, [isOpen]);

  const sidebarContent = (isMobile: boolean) => (
    <div className="flex h-full flex-col">
      {/* ─────────────────────────────────────────────────────────────────────────
         Header — Logo & Collapse Toggle
         ───────────────────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-[hsl(var(--border-subtle))]",
          expanded ? "justify-between px-4" : "justify-center px-2"
        )}
      >
        {expanded ? (
          <>
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <Image
                src="/sinto-logo.svg"
                alt="SINTO"
                width={88}
                height={24}
                priority
                className="h-6 w-auto object-contain transition-opacity group-hover:opacity-80"
              />
            </Link>
            {!isMobile && (
              <button
                onClick={toggleSidebar}
                className="flex items-center justify-center h-7 w-7 rounded-md text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-elevated))] transition-all"
                aria-label="Réduire la barre latérale"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center h-8 w-8 rounded-md text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-elevated))] transition-all"
            aria-label="Agrandir la barre latérale"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
         Navigation
         ───────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        <div className="flex flex-col gap-6">
          {NAV_GROUPS.map((group, idx) => (
            <NavGroup key={group.title} title={group.title} expanded={expanded}>
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  expanded={expanded}
                  isMobile={isMobile}
                  closeMobile={closeMobileSidebar}
                />
              ))}
            </NavGroup>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
         Footer — User Account
         ───────────────────────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-[hsl(var(--border-subtle))] p-3">
        {user && <UserAccountSwitcher user={user} expanded={expanded} />}
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 -translate-x-full transition-transform duration-300 ease-out lg:hidden",
          "bg-[hsl(var(--bg-surface))] border-r border-[hsl(var(--border-subtle))]",
          "shadow-2xl shadow-black/20",
          isMobileOpen && "translate-x-0"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation mobile"
      >
        {sidebarContent(true)}
      </aside>

      {/* Desktop Sidebar */}
      <aside
        aria-label="Navigation principale"
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-200 ease-out lg:block",
          "bg-[hsl(var(--bg-surface))] border-r border-[hsl(var(--border-subtle))]",
          desktopWidth
        )}
      >
        {sidebarContent(false)}
      </aside>
    </TooltipProvider>
  );
}

export default Sidebar;
