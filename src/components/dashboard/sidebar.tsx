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
  ChevronsUpDown,
  Building2,
  Check,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

// Companies for the selector
const COMPANIES = [
  { id: "sinto", name: "SINTO", plan: "Groupe principal" },
  { id: "prolab", name: "Prolab", plan: "Filiale" },
  { id: "lubrilab", name: "Lubri-Lab", plan: "Filiale" },
  { id: "otoprotec", name: "Otoprotec", plan: "Filiale" },
];

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
   Company Selector Component — Inspired by shadcn sidebar
   ═══════════════════════════════════════════════════════════════════════════════ */
function CompanySelector({ expanded }: { expanded: boolean }) {
  const [selectedCompany, setSelectedCompany] = React.useState(COMPANIES[0]);

  if (!expanded) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            className={cn(
              "flex items-center justify-center w-10 h-10 mx-auto rounded-lg",
              "bg-[hsl(var(--accent))] text-[hsl(var(--bg-base))]",
              "hover:opacity-90 transition-opacity"
            )}
          >
            <Building2 className="h-5 w-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          {selectedCompany.name}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg",
            "hover:bg-[hsl(var(--bg-elevated))] transition-colors",
            "outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]"
          )}
        >
          {/* Company Logo/Icon */}
          <div
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
              "bg-[hsl(var(--accent))] text-[hsl(var(--bg-base))]"
            )}
          >
            <Image
              src="/sinto-logo-icon.svg"
              alt={selectedCompany.name}
              width={20}
              height={20}
              className="h-5 w-5 object-contain"
              onError={(e) => {
                // Fallback to Building2 icon if image fails
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          {/* Company Info */}
          <div className="flex-1 text-left min-w-0">
            <div className="text-sm font-semibold text-[hsl(var(--text-primary))] truncate">
              {selectedCompany.name}
            </div>
            <div className="text-[11px] text-[hsl(var(--text-muted))] truncate">
              {selectedCompany.plan}
            </div>
          </div>

          {/* Dropdown Arrow */}
          <ChevronsUpDown className="h-4 w-4 text-[hsl(var(--text-muted))] shrink-0" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={4}
        className={cn(
          "w-[--radix-dropdown-menu-trigger-width] min-w-[220px] rounded-xl p-1.5",
          "bg-[hsl(var(--bg-surface))] border-[hsl(var(--border-default))]",
          "shadow-xl shadow-black/20"
        )}
      >
        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">
          Entreprises
        </DropdownMenuLabel>
        
        {COMPANIES.map((company) => (
          <DropdownMenuItem
            key={company.id}
            onClick={() => setSelectedCompany(company)}
            className={cn(
              "flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer",
              "text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))]",
              "hover:bg-[hsl(var(--bg-elevated))]",
              selectedCompany.id === company.id && "bg-[hsl(var(--bg-elevated))]"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-md shrink-0",
                "bg-[hsl(var(--accent-muted))] text-[hsl(var(--accent))]"
              )}
            >
              <Building2 className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{company.name}</div>
              <div className="text-[11px] text-[hsl(var(--text-muted))] truncate">
                {company.plan}
              </div>
            </div>
            {selectedCompany.id === company.id && (
              <Check className="h-4 w-4 text-[hsl(var(--accent))] shrink-0" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator className="my-1.5 bg-[hsl(var(--border-subtle))]" />

        <DropdownMenuItem className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-elevated))]">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[hsl(var(--bg-muted))]">
            <PlusCircle className="h-4 w-4" />
          </div>
          <span className="text-sm">Ajouter une entreprise</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
   Main Sidebar Component — Inspired by shadcn/ui
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
         Header — Company Selector & Collapse Toggle
         ───────────────────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex shrink-0 items-center border-b border-[hsl(var(--border-subtle))]",
          expanded ? "h-14 justify-between px-3" : "h-14 justify-center px-2"
        )}
      >
        {expanded ? (
          <>
            <div className="flex-1 min-w-0">
              <CompanySelector expanded={expanded} />
            </div>
            {!isMobile && (
              <button
                onClick={toggleSidebar}
                className="flex items-center justify-center h-7 w-7 rounded-md text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-elevated))] transition-all ml-2 shrink-0"
                aria-label="Réduire la barre latérale"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <CompanySelector expanded={false} />
            <button
              onClick={toggleSidebar}
              className="flex items-center justify-center h-7 w-7 rounded-md text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-elevated))] transition-all"
              aria-label="Agrandir la barre latérale"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
         Navigation Content
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

      {/* No SidebarFooter with user — user is in header */}
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
