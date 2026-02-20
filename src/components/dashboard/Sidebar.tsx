"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import useSWR from "swr";
import { useAccentColor } from "@/components/accent-color-provider";
import {
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
  PackageSearch,
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

// 1. Define allowed roles for type safety
type UserRole = "Gestionnaire" | "Analyste" | "Vérificateur" | string;

type NavItem = { 
  href: string; 
  title: string; 
  icon: React.ElementType;
  // 2. Add an optional array of roles. If undefined, it defaults to strictly "Gestionnaire"
  allowedRoles?: UserRole[]; 
};

interface SidebarProps {
  isOpen: boolean;
  isMobileOpen: boolean;
  toggleSidebar: () => void;
  closeMobileSidebar: () => void;
  // 3. Receive the current user's role
  userRole: UserRole; 
}

interface TenantData {
  id: string;
  name: string;
  slug: string;
  plan: string | null;
  logo: string | null;
  role: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Général",
    items: [
      { href: "/dashboard", title: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/pricelist", title: "Listes de prix", icon: PackageSearch },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/dashboard/sharepoint", title: "Arborescence", icon: FolderTree },
      { href: "/dashboard/admin/onboarding", title: "Onboarding", icon: UserPlus },
      { 
        href: "/dashboard/admin/returns", 
        title: "Retours", 
        icon: RefreshCcw,
        // 4. EXCEPTION: Explicitly allow Analyste & Vérificateur here
        allowedRoles: ["Gestionnaire", "Administrateur", "Analyste", "Vérificateur", "Facturation"]
      },
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
      { href: "/dashboard/support/new", title: "Nouveau billet", icon: PlusCircle, allowedRoles: ["Gestionnaire", "Administrateur", "Vérificateur", "Facturation", "user"] },
      { href: "/dashboard/support/tickets", title: "Billets", icon: Ticket, allowedRoles: ["Gestionnaire", "Administrateur", "Vérificateur", "Facturation", "user"] },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   Company Selector Component
   ═══════════════════════════════════════════════════════════════════════════════ */
function CompanySelector({ expanded }: { expanded: boolean }) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const { setTheme } = useTheme();
  const { setAccentKey } = useAccentColor();
  const { data: tenantsRes } = useSWR<{ ok: boolean; data: TenantData[] }>(
    "/api/tenants",
    fetcher
  );

  const tenants = tenantsRes?.data ?? [];
  const activeTenantId = session?.user?.activeTenantId;
  const activeTenant = tenants.find((t) => t.id === activeTenantId) ?? tenants[0];

  const handleSwitch = async (tenant: TenantData) => {
    if (tenant.id === activeTenantId) return;
    // Apply brand defaults for SINTO
    if (tenant.name?.toUpperCase() === "SINTO") {
      setTheme("dark");
      setAccentKey("red");
    }
    await update({ user: { activeTenantId: tenant.id } });
    router.refresh();
  };

  const displayName = activeTenant?.name ?? "...";
  const displayLogo = activeTenant?.logo ?? "/sinto-logo.svg";

  if (!expanded) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center">
            <Image
              src={displayLogo}
              alt={displayName}
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          {displayName}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-3 w-full px-2 py-2 rounded-lg",
            "hover:bg-[hsl(var(--bg-elevated))] transition-colors",
            "outline-none focus-visible:ring-2 focus-visible:ring-accent"
          )}
        >
          <div className="flex items-center justify-center shrink-0">
            <Image
              src={displayLogo}
              alt={displayName}
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
          </div>

          <div className="flex-1 text-left min-w-0">
            <div className="text-sm font-semibold text-[hsl(var(--text-primary))] truncate">
              {displayName}
            </div>
            {activeTenant?.plan && (
              <div className="text-[11px] text-[hsl(var(--text-muted))] truncate">
                {activeTenant.plan}
              </div>
            )}
          </div>

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

        {tenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            onClick={() => handleSwitch(tenant)}
            className={cn(
              "flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer",
              "text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))]",
              "hover:bg-[hsl(var(--bg-elevated))]",
              activeTenantId === tenant.id && "bg-[hsl(var(--bg-elevated))]"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-md shrink-0",
                "bg-accent-muted text-accent"
              )}
            >
              {tenant.logo ? (
                <Image
                  src={tenant.logo}
                  alt={tenant.name}
                  width={20}
                  height={20}
                  className="h-5 w-5 object-contain"
                />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{tenant.name}</div>
              {tenant.plan && (
                <div className="text-[11px] text-[hsl(var(--text-muted))] truncate">
                  {tenant.plan}
                </div>
              )}
            </div>
            {activeTenantId === tenant.id && (
              <Check className="h-4 w-4 text-accent shrink-0" />
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
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200",
        "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg-surface))]",
        active
          ? "bg-[hsl(var(--bg-elevated))] text-[hsl(var(--text-primary))]"
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
            ? "text-[hsl(var(--accent))]"
            : "text-[hsl(var(--text-tertiary))] group-hover:text-[hsl(var(--text-primary))]"
        )}
        strokeWidth={active ? 2 : 1.75}
      />
      {expanded && (
        <span className="truncate leading-none">{item.title}</span>
      )}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[hsl(var(--accent))] rounded-r-full transition-all duration-200 shadow-[0_0_8px_hsl(var(--accent)/0.4)]" />
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
        <h2 className="px-3 mb-2 text-[10px] font-medium tracking-widest uppercase text-[hsl(var(--text-muted))]">
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
  userRole,
}: SidebarProps) {
  const expanded = isOpen || isMobileOpen;
  const desktopWidth = isOpen ? "lg:w-64" : "lg:w-[68px]";

  React.useEffect(() => {
    const w = isOpen ? "16rem" : "68px";
    document.documentElement.style.setProperty("--sidebar-w", w);
  }, [isOpen]);

  const filteredNavGroups = React.useMemo(() => {
    return NAV_GROUPS.map((group) => {
      const visibleItems = group.items.filter((item) => {
        if (item.allowedRoles) {
          return item.allowedRoles.includes(userRole);
        }
        return userRole === "Gestionnaire" || userRole === "Administrateur";
      });
      return { ...group, items: visibleItems };
    }).filter((group) => group.items.length > 0);
  }, [userRole]);

  const sidebarContent = (isMobile: boolean) => (
    <div className="flex h-full flex-col">
      {/* ─────────────────────────────────────────────────────────────────────────
          1. Header — Company Selector ONLY (No Toggle Here)
          ───────────────────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "shrink-0 border-b border-[hsl(var(--border-subtle))]",
          expanded ? "px-3 py-3" : "px-2 py-3"
        )}
      >
        {expanded ? (
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <CompanySelector expanded={expanded} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <CompanySelector expanded={false} />
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          2. Navigation Content
          ───────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        <div className="flex flex-col gap-10">
          {filteredNavGroups.map((group) => (
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
          3. Footer — BIGGER Toggle Button (Moved to Bottom)
          ───────────────────────────────────────────────────────────────────────── */}
      {!isMobile && (
        <div className="shrink-0 px-3 py-2 border-t border-[hsl(var(--border-subtle))]">
          <button
            onClick={toggleSidebar}
            className={cn(
              "flex items-center justify-center w-full rounded-lg transition-all duration-200",
              "border border-[hsl(var(--border-subtle))] hover:border-[hsl(var(--border-default))]",
              "hover:bg-[hsl(var(--bg-elevated))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]",
              "h-8"
            )}
            title={expanded ? "Réduire le menu" : "Agrandir le menu"}
          >
            {expanded ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 -translate-x-full transition-transform duration-300 ease-out lg:hidden",
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

      <aside
        aria-label="Navigation principale"
        className={cn(
          "fixed inset-y-0 left-0 z-50 hidden transition-[width] duration-200 ease-out lg:block",
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
