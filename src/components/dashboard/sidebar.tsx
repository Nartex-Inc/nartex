// src/components/dashboard/sidebar.tsx (FINAL AND CORRECTED)
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from 'next/image';
import {
  LayoutDashboard, ListChecks, Briefcase, UserPlus, RefreshCcw, Receipt,
  FlaskConical, Network, PlusCircle, Ticket, LogOut, ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  title: string;
  icon: React.ElementType;
}

interface SidebarProps {
  isOpen: boolean;
  isMobileOpen: boolean;
  toggleSidebar: () => void;
  closeMobileSidebar: () => void;
}

const NavLink = ({ item, isSidebarOpen, closeMobileSidebar, isMobile }: { item: NavItem; isSidebarOpen: boolean; closeMobileSidebar: () => void; isMobile: boolean }) => {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
  
  const handleLinkClick = () => {
    if (isMobile) {
      closeMobileSidebar();
    }
  };

  if (!isSidebarOpen && !isMobile) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              href={item.href}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted",
                isActive && "bg-primary/10 text-primary font-semibold"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="sr-only">{item.title}</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{item.title}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={handleLinkClick}
      className={cn(
        "flex items-center gap-4 rounded-md px-4 py-2.5 text-muted-foreground transition-all hover:text-foreground hover:bg-muted",
        isActive && "bg-primary/10 text-primary font-semibold"
      )}
    >
      <item.icon className="h-5 w-5" />
      <span className="truncate text-sm font-medium">{item.title}</span>
    </Link>
  );
};

const NavGroup = ({ title, children, isSidebarOpen }: { title: string; children: React.ReactNode; isSidebarOpen: boolean; }) => (
  <div>
    {isSidebarOpen && (
      <h2 className="px-4 pt-2 pb-1 text-xs font-semibold tracking-wider text-muted-foreground/60 uppercase">{title}</h2>
    )}
    <nav className={cn("flex flex-col gap-1", !isSidebarOpen && "items-center")}>
      {children}
    </nav>
  </div>
);

export function Sidebar({ isOpen, isMobileOpen, toggleSidebar, closeMobileSidebar }: SidebarProps) {
  const { data: session } = useSession();
  const handleLogout = () => signOut({ callbackUrl: "/" });
  const user = session?.user;
  const userDisplayName = user?.name || user?.email?.split('@')[0] || "User";
  const userImage = user?.image;

  const navItems = {
    general: [ { href: "/dashboard", title: "Tableau de Bord", icon: LayoutDashboard }, { href: "/dashboard/tasks", title: "Mes tâches", icon: ListChecks }, { href: "/dashboard/projects", title: "Mes projets", icon: Briefcase } ],
    admin: [ { href: "/dashboard/admin/onboarding", title: "Onboarding", icon: UserPlus }, { href: "/dashboard/admin/returns", title: "Gestion des retours", icon: RefreshCcw }, { href: "/dashboard/admin/collections", title: "Recouvrement", icon: Receipt } ],
    research: [ { href: "/dashboard/rd/requests", title: "Demandes de produits", icon: FlaskConical }, { href: "/dashboard/rd/pipeline", title: "Pipeline de produits", icon: Network } ],
    support: [ { href: "/dashboard/support/new", title: "Nouveau billet", icon: PlusCircle }, { href: "/dashboard/support/tickets", title: "Gestion des billets", icon: Ticket } ]
  };
  
  const isExpanded = isOpen || isMobileOpen;

  return (
    <aside
      className={cn(
        "flex-col transition-all duration-300 ease-in-out bg-card border-r",
        "fixed inset-y-0 left-0 z-50 w-64 -translate-x-full lg:relative lg:translate-x-0 lg:flex",
        isMobileOpen && "translate-x-0",
        isOpen ? "lg:w-64" : "lg:w-20"
      )}
    >
      <div className="flex h-16 shrink-0 items-center border-b px-4">
        <div className={cn("w-full flex", isExpanded ? "justify-between" : "justify-center")}>
          <Link href="/dashboard" className={cn("flex items-center gap-3 font-semibold text-lg", !isExpanded && "w-full justify-center")}>
            <Image src="/sinto-logo.svg" alt="Sinto Logo" width={32} height={32} className="shrink-0" />
            <span className={cn(
              "text-foreground origin-left transition-opacity duration-200", 
              isExpanded ? "opacity-100" : "opacity-0"
            )}>
              Sinto
            </span>
          </Link>
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className={cn("hidden", isOpen && "lg:flex")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <div className="flex flex-col gap-6 px-2">
          <NavGroup title="Général" isSidebarOpen={isExpanded}>
            {navItems.general.map(item => <NavLink key={item.href} item={item} isSidebarOpen={isExpanded} closeMobileSidebar={closeMobileSidebar} isMobile={isMobileOpen} />)}
          </NavGroup>
          <NavGroup title="Administration" isSidebarOpen={isExpanded}>
            {navItems.admin.map(item => <NavLink key={item.href} item={item} isSidebarOpen={isExpanded} isMobile={isMobileOpen} closeMobileSidebar={closeMobileSidebar} />)}
          </NavGroup>
          <NavGroup title="R&D" isSidebarOpen={isExpanded}>
            {navItems.research.map(item => <NavLink key={item.href} item={item} isSidebarOpen={isExpanded} isMobile={isMobileOpen} closeMobileSidebar={closeMobileSidebar} />)}
          </NavGroup>
          <NavGroup title="Support" isSidebarOpen={isExpanded}>
            {navItems.support.map(item => <NavLink key={item.href} item={item} isSidebarOpen={isExpanded} isMobile={isMobileOpen} closeMobileSidebar={closeMobileSidebar} />)}
          </NavGroup>
        </div>
      </div>

      <div className="mt-auto shrink-0 border-t p-2">
        {!isExpanded ? (
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex h-12 w-full cursor-pointer items-center justify-center rounded-lg p-2 text-sm font-medium">
                  <Image src={userImage || `https://avatar.vercel.sh/${user?.email}.svg`} alt={userDisplayName} width={36} height={36} className="rounded-full" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" align="start">
                  <p className="font-semibold">{userDisplayName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4"/>Déconnexion</Button>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="flex h-12 w-full items-center justify-start gap-3 rounded-lg p-2 text-sm font-medium">
            <Image src={userImage || `https://avatar.vercel.sh/${user?.email}.svg`} alt={userDisplayName} width={36} height={36} className="rounded-full"/>
            <div className="flex-1 truncate">
              <p className="font-semibold truncate">{userDisplayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild><Button variant="ghost" size="icon" className="shrink-0" onClick={handleLogout}><LogOut className="h-4 w-4"/></Button></TooltipTrigger>
                  <TooltipContent side="top">Déconnexion</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      <Button variant="outline" size="icon" onClick={toggleSidebar} className={cn("absolute top-16 -right-5 h-10 w-10 rounded-full border bg-background hover:bg-muted shadow-md", isOpen ? "hidden" : "hidden lg:flex")}>
        <ChevronLeft className="h-5 w-5 rotate-180" />
      </Button>
    </aside>
  );
}
