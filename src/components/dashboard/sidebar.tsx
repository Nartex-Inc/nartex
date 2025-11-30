// src/components/dashboard/sidebar.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
   Main Sidebar Component
   ═══════════════════════════════════════════════════════════════════════════════ */
export function Sidebar({
  isOpen,
  isMobileOpen,
  toggleSidebar,
  closeMobileSidebar,
}: SidebarProps) {
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
          "flex h-16 shrink-0 items-center border-b border-[hsl(var(--border-subtle))]",
          expanded ? "justify-between px-4" : "justify-center px-2"
        )}
      >
        {expanded ? (
          <>
            <Link href="/dashboard" className="flex items-center gap-2 group">
              {/* SINTO Logo — TWICE AS BIG (200x56 instead of 100x28) */}
              <Image
                src="/sinto-logo.svg"
                alt="SINTO"
                width={200}
                height={56}
                priority
                className="h-12 w-auto object-contain transition-opacity group-hover:opacity-80"
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

      {/* No user section — moved to header */}
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
