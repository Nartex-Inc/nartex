"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
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
  Sparkles,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type NavItem = { 
  href: string; 
  title: string; 
  icon: React.ElementType;
  badge?: string;
  premium?: boolean;
};

interface SidebarProps {
  isOpen: boolean;
  isMobileOpen: boolean;
  toggleSidebar: () => void;
  closeMobileSidebar: () => void;
}

/* ------------------------- Enhanced Nav Structure ------------------------- */
const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "GÉNÉRAL",
    items: [
      { href: "/dashboard/tasks", title: "Mes tâches", icon: ListChecks, badge: "12" },
      { href: "/dashboard/projects", title: "Mes projets", icon: Briefcase },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
      { href: "/dashboard/admin/onboarding", title: "Onboarding", icon: UserPlus },
      { href: "/dashboard/admin/returns", title: "Gestion des retours", icon: RefreshCcw },
      { href: "/dashboard/admin/collections", title: "Recouvrement", icon: Receipt },
    ],
  },
  {
    title: "R&D",
    items: [
      { href: "/dashboard/rd/requests", title: "Demandes de produits", icon: FlaskConical, badge: "New" },
      { href: "/dashboard/rd/pipeline", title: "Pipeline de produits", icon: Network },
    ],
  },
  {
    title: "SUPPORT",
    items: [
      { href: "/dashboard/support/new", title: "Nouveau billet", icon: PlusCircle },
      { href: "/dashboard/support/tickets", title: "Gestion des billets", icon: Ticket, badge: "3" },
    ],
  },
];

/* ------------------------------- Premium NavLink -------------------------------- */
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

  const linkClasses = cn(
    "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ease-out",
    active
      ? "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] before:absolute before:inset-0 before:rounded-xl before:ring-1 before:ring-inset before:ring-primary/20"
      : "text-muted-foreground hover:text-foreground hover:bg-gradient-to-r hover:from-muted/80 hover:to-muted/40 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
  );

  const iconClasses = cn(
    "h-4 w-4 shrink-0 transition-all duration-200",
    active && "text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
  );

  const content = (
    <Link
      href={item.href}
      onClick={() => (isMobile ? closeMobile() : undefined)}
      className={linkClasses}
      aria-current={active ? "page" : undefined}
    >
      <div className="relative">
        <item.icon className={iconClasses} />
        {active && (
          <div className="absolute inset-0 -z-10 blur-md">
            <item.icon className="h-4 w-4 text-primary opacity-40" />
          </div>
        )}
      </div>
      
      {expanded && (
        <>
          <span className={cn(
            "flex-1 truncate transition-all duration-200",
            active && "font-semibold translate-x-0.5"
          )}>
            {item.title}
          </span>
          
          {item.badge && (
            <span className={cn(
              "ml-auto flex h-5 items-center rounded-full px-2 text-[10px] font-bold transition-all duration-200",
              item.badge === "New" 
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)]"
                : active 
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
            )}>
              {item.badge}
            </span>
          )}
        </>
      )}
      
      {active && (
        <div className="absolute left-0 top-1/2 h-8 w-1 -translate-x-3 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary via-primary to-primary/60 shadow-[0_0_12px_rgba(var(--primary-rgb),0.5)]" />
      )}
    </Link>
  );

  if (expanded) return content;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent 
        side="right" 
        className="ml-2 border-muted/20 bg-popover/95 backdrop-blur-xl"
      >
        <div className="flex items-center gap-2">
          <span>{item.title}</span>
          {item.badge && (
            <span className={cn(
              "flex h-4 items-center rounded-full px-1.5 text-[10px] font-bold",
              item.badge === "New" 
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                : "bg-primary/20 text-primary"
            )}>
              {item.badge}
            </span>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/* ------------------------------- Premium NavGroup -------------------------------- */
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
        <h2 className="flex items-center gap-2 px-4 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-muted-foreground/20 to-transparent" />
          <span>{title}</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-muted-foreground/20 to-transparent" />
        </h2>
      )}
      <nav className={cn("flex flex-col gap-0.5", !expanded && "items-center")}>
        {children}
      </nav>
    </div>
  );
}

/* -------------------------------- Premium Sidebar -------------------------------- */
export function Sidebar({
  isOpen,
  isMobileOpen,
  toggleSidebar,
  closeMobileSidebar,
}: SidebarProps) {
  const { data } = useSession();
  const user = data?.user;
  const display = user?.name || user?.email?.split("@")[0] || "User";

  const expanded = isOpen || isMobileOpen;
  const desktopWidth = isOpen ? "lg:w-[280px]" : "lg:w-[88px]";

  return (
    <TooltipProvider>
      {/* Mobile drawer with backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}
      
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] -translate-x-full border-r border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl transition-all duration-300 ease-out lg:hidden",
          isMobileOpen && "translate-x-0"
        )}
        role="dialog"
        aria-modal="true"
      >
        <aside className="flex h-full flex-col">
          {/* Premium Header */}
          <div className="relative flex h-16 items-center justify-between border-b border-border/50 bg-gradient-to-r from-background via-muted/20 to-background px-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="absolute inset-0 blur-md">
                  <Sparkles className="h-5 w-5 text-primary opacity-50" />
                </div>
                <Sparkles className="relative h-5 w-5 text-primary" />
              </div>
              <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-lg font-bold text-transparent">
                Sinto
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeMobileSidebar}
              className="transition-transform hover:scale-110 active:scale-95"
            >
              <ChevronLeft className="h-5 w-5 rotate-180" />
            </Button>
          </div>

          {/* Scrollable Nav */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/10">
            <div className="flex flex-col gap-6">
              {NAV_GROUPS.map((group) => (
                <NavGroup key={group.title} title={group.title} expanded>
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      expanded
                      isMobile
                      closeMobile={closeMobileSidebar}
                    />
                  ))}
                </NavGroup>
              ))}
            </div>
          </div>

          {/* Premium User Section */}
          <div className="border-t border-border/50 bg-gradient-to-t from-muted/30 to-transparent p-3">
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-muted/80 via-muted/50 to-muted/30 p-3 transition-all duration-300 hover:from-muted hover:via-muted/70 hover:to-muted/50">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              
              <div className="relative flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-primary/0 blur-md" />
                  <Image
                    src={user?.image || `https://avatar.vercel.sh/${user?.email}.svg`}
                    alt={display}
                    width={36}
                    height={36}
                    className="relative rounded-full ring-2 ring-background/50"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                </div>
                
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {display}
                  </p>
                  <p className="truncate text-xs text-muted-foreground/80">
                    {user?.email}
                  </p>
                </div>
                
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground transition-all hover:text-foreground hover:scale-110 active:scale-95"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="h-8 w-8 text-muted-foreground transition-all hover:text-destructive hover:scale-110 active:scale-95"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Desktop Sidebar */}
      <aside
        aria-label="Barre latérale"
        className={cn(
          "relative z-30 hidden shrink-0 border-r border-border/50 bg-background/95 backdrop-blur-xl transition-all duration-300 ease-out lg:block",
          desktopWidth
        )}
      >
        {/* Premium Header */}
        <div className="flex h-16 items-center justify-between border-b border-border/50 bg-gradient-to-r from-background via-muted/20 to-background px-3">
          <div className={cn(
            "flex items-center gap-2 transition-all duration-300",
            !expanded && "opacity-0 scale-95"
          )}>
            <div className="relative">
              <div className="absolute inset-0 blur-md">
                <Sparkles className="h-5 w-5 text-primary opacity-50" />
              </div>
              <Sparkles className="relative h-5 w-5 text-primary" />
            </div>
            <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-lg font-bold text-transparent">
              Sinto
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="transition-all hover:bg-muted/80 hover:scale-110 active:scale-95"
          >
            <ChevronLeft
              className={cn(
                "h-5 w-5 transition-transform duration-300",
                !isOpen && "rotate-180"
              )}
            />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex h-[calc(100%-4rem)] flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/10">
            <div className="flex flex-col gap-6">
              {NAV_GROUPS.map((group) => (
                <NavGroup
                  key={group.title}
                  title={group.title}
                  expanded={expanded}
                >
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      expanded={expanded}
                      isMobile={false}
                      closeMobile={() => {}}
                    />
                  ))}
                </NavGroup>
              ))}
            </div>
          </div>

          {/* Premium User Section */}
          <div className="border-t border-border/50 bg-gradient-to-t from-muted/30 to-transparent p-2">
            {expanded ? (
              <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-muted/80 via-muted/50 to-muted/30 p-3 transition-all duration-300 hover:from-muted hover:via-muted/70 hover:to-muted/50">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                
                <div className="relative flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-primary/0 blur-md" />
                    <Image
                      src={user?.image || `https://avatar.vercel.sh/${user?.email}.svg`}
                      alt={display}
                      width={36}
                      height={36}
                      className="relative rounded-full ring-2 ring-background/50"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {display}
                    </p>
                    <p className="truncate text-xs text-muted-foreground/80">
                      {user?.email}
                    </p>
                  </div>
                  
                  <div className="flex gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground transition-all hover:text-foreground hover:scale-110 active:scale-95"
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Paramètres</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => signOut({ callbackUrl: "/" })}
                          className="h-8 w-8 text-muted-foreground transition-all hover:text-destructive hover:scale-110 active:scale-95"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Déconnexion</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="group mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-muted/80 to-muted/40 transition-all hover:from-muted hover:to-muted/60 hover:scale-110 active:scale-95">
                    <div className="relative">
                      <Image
                        src={user?.image || `https://avatar.vercel.sh/${user?.email}.svg`}
                        alt={display}
                        width={32}
                        height={32}
                        className="rounded-full ring-2 ring-background/50"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="border-muted/20 bg-popover/95 backdrop-blur-xl">
                  <div className="space-y-1 p-1">
                    <p className="text-sm font-semibold">{display}</p>
                    {user?.email && (
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                      >
                        <Settings className="h-3 w-3" />
                        Paramètres
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="h-7 gap-1.5 text-xs text-destructive"
                      >
                        <LogOut className="h-3 w-3" />
                        Déconnexion
                      </Button>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

export default Sidebar;
