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
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
    title: "GÉNÉRAL",
    items: [
      { href: "/dashboard", title: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/tasks", title: "Mes tâches", icon: ListChecks },
      { href: "/dashboard/projects", title: "Mes projets", icon: Briefcase },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
      { href: "/dashboard/sharepoint", title: "Arborescence", icon: FolderTree },
      { href: "/dashboard/admin/onboarding", title: "Onboarding", icon: UserPlus },
      { href: "/dashboard/admin/returns", title: "Gestion des retours", icon: RefreshCcw },
      { href: "/dashboard/admin/collections", title: "Recouvrement", icon: Receipt },
    ],
  },
  {
    title: "R&D",
    items: [
      { href: "/dashboard/rd/requests", title: "Demandes produits", icon: FlaskConical },
      { href: "/dashboard/rd/pipeline", title: "Pipeline produits", icon: Network },
    ],
  },
  {
    title: "SUPPORT",
    items: [
      { href: "/dashboard/support/new", title: "Nouveau billet", icon: PlusCircle },
      { href: "/dashboard/support/tickets", title: "Gestion billets", icon: Ticket },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   Nav Link Component
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
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-all duration-150",
        active
          ? "bg-[hsl(var(--accent))] text-[hsl(var(--bg-base))]"
          : "text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))]",
        !expanded && "justify-center px-2"
      )}
      aria-current={active ? "page" : undefined}
    >
      <item.icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          active
            ? "text-[hsl(var(--bg-base))]"
            : "text-[hsl(var(--text-tertiary))] group-hover:text-[hsl(var(--text-primary))]"
        )}
        strokeWidth={2}
      />
      {expanded && <span className="truncate">{item.title}</span>}
    </Link>
  );

  if (expanded) return content;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent 
        side="right" 
        className="ml-2 bg-[hsl(var(--bg-elevated))] border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] font-medium"
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
        <h2 className="px-3 py-2 text-[10px] font-bold tracking-[0.12em] text-[hsl(var(--text-muted))]">
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
   User Card Component
   ═══════════════════════════════════════════════════════════════════════════════ */
function UserCard({
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

  if (!expanded) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--bg-elevated))] transition-colors hover:bg-[hsl(var(--bg-muted))]"
          >
            <Avatar className="h-7 w-7">
              <AvatarImage src={user?.image ?? ""} alt={display} />
              <AvatarFallback className="text-[10px] font-bold bg-[hsl(var(--accent))] text-[hsl(var(--bg-base))]">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          className="bg-[hsl(var(--bg-elevated))] border-[hsl(var(--border-default))]"
        >
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-[hsl(var(--text-primary))]">{display}</p>
            {user?.email && (
              <p className="text-xs text-[hsl(var(--text-tertiary))]">{user.email}</p>
            )}
            <p className="text-xs text-[hsl(var(--danger))] pt-1">Cliquer pour déconnexion</p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg bg-[hsl(var(--bg-elevated))] p-2.5">
      <Avatar className="h-9 w-9">
        <AvatarImage src={user?.image ?? ""} alt={display} />
        <AvatarFallback className="text-[11px] font-bold bg-[hsl(var(--accent))] text-[hsl(var(--bg-base))]">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[hsl(var(--text-primary))]">
          {display}
        </p>
        <p className="truncate text-xs text-[hsl(var(--text-tertiary))]">
          {user?.email}
        </p>
      </div>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-md p-1.5 text-[hsl(var(--text-tertiary))] transition-colors hover:bg-[hsl(var(--bg-muted))] hover:text-[hsl(var(--danger))]"
            aria-label="Déconnexion"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Déconnexion</TooltipContent>
      </Tooltip>
    </div>
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
  const desktopWidth = isOpen ? "lg:w-64" : "lg:w-[72px]";

  React.useEffect(() => {
    const w = isOpen ? "16rem" : "72px";
    document.documentElement.style.setProperty("--sidebar-w", w);
  }, [isOpen]);

  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* Logo Section */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-[hsl(var(--border-subtle))]",
          expanded ? "justify-between px-4" : "justify-center px-2"
        )}
      >
        {expanded ? (
          <>
            <div className="flex items-center gap-3">
              <Image
                src="/sinto-logo.svg"
                alt="SINTO"
                width={100}
                height={28}
                priority
                className="h-7 w-auto object-contain"
              />
            </div>
            {!isMobile && (
              <button
                onClick={toggleSidebar}
                className="rounded-md p-1.5 text-[hsl(var(--text-tertiary))] transition-colors hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))]"
                aria-label="Réduire"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <button
            onClick={toggleSidebar}
            className="rounded-md p-1.5 text-[hsl(var(--text-tertiary))] transition-colors hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))]"
            aria-label="Agrandir"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-6">
          {NAV_GROUPS.map((group) => (
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

      {/* User Section */}
      <div className="shrink-0 border-t border-[hsl(var(--border-subtle))] p-3">
        {user && <UserCard user={user} expanded={expanded} />}
      </div>
    </>
  );

  return (
    <TooltipProvider>
      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-64 -translate-x-full transition-transform duration-300 lg:hidden",
          "bg-[hsl(var(--bg-surface))] border-r border-[hsl(var(--border-subtle))]",
          isMobileOpen && "translate-x-0"
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex h-full flex-col">
          {sidebarContent(true)}
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside
        aria-label="Navigation principale"
        className={cn(
          "fixed left-0 top-0 z-30 hidden h-screen transition-[width] duration-200 lg:flex lg:flex-col",
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
