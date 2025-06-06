"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from 'next/image';
import {
  ListChecks, Briefcase, UserPlus, RefreshCcw, Receipt,
  FlaskConical, Network, PlusCircle, Ticket, LogOut, ChevronLeft
} from "lucide-react";
import { type NavItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// FIX: The interface is restored to accept the props it needs for collapsing
interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const NavLink = ({ item, isSidebarOpen }: { item: NavItem, isSidebarOpen: boolean }) => {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

  if (!isSidebarOpen) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link href={item.href} className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-primary md:h-8 md:w-8", isActive && "bg-muted text-primary")}>
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
    <Link href={item.href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary", isActive && "bg-muted text-primary")}>
      <item.icon className="h-4 w-4" />
      <span className="truncate">{item.title}</span>
    </Link>
  );
};

const NavGroup = ({ title, children, isSidebarOpen }: { title: string, children: React.ReactNode, isSidebarOpen: boolean }) => (
  <div className="space-y-1">
    <h2 className={cn("px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground/80 transition-opacity duration-300", isSidebarOpen ? "opacity-100" : "opacity-0 h-0 p-0")}>{title}</h2>
    <nav className={cn(!isSidebarOpen && "flex flex-col items-center")}>
        {children}
    </nav>
  </div>
);

export function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const { data: session } = useSession();
  const handleLogout = () => signOut({ callbackUrl: "/" });
  const user = session?.user;
  const userDisplayName = user?.name || user?.email?.split('@')[0] || "User";
  const userImage = user?.image;

  const generalNav: NavItem[] = [{ href: "/dashboard/tasks", title: "Mes tâches", icon: ListChecks },{ href: "/dashboard/projects", title: "Mes projets", icon: Briefcase }];
  const adminNav: NavItem[] = [{ href: "/dashboard/admin/onboarding", title: "Onboarding", icon: UserPlus },{ href: "/dashboard/admin/returns", title: "Gestion des retours", icon: RefreshCcw },{ href: "/dashboard/admin/collections", title: "Recouvrement", icon: Receipt }];
  const researchNav: NavItem[] = [{ href: "/dashboard/rd/requests", title: "Demandes de produits", icon: FlaskConical },{ href: "/dashboard/rd/pipeline", title: "Pipeline de produits", icon: Network }];
  const supportNav: NavItem[] = [{ href: "/dashboard/support/new", title: "Nouveau billet", icon: PlusCircle },{ href: "/dashboard/support/tickets", title: "Gestion des billets", icon: Ticket }];

  return (
    <aside className={cn("hidden lg:flex h-screen flex-col transition-all duration-300 ease-in-out", "bg-muted/40 dark:bg-muted/10 border-r", isOpen ? "w-64" : "w-20")}>
      <div className="flex h-full max-h-screen flex-col">
        <div className="flex h-16 items-center border-b px-4 lg:px-6 shrink-0">
          <Link href="/dashboard" className={cn("font-bold text-lg", !isOpen && "sr-only")}>
             Nartex
          </Link>
          {/* FIX: The toggle button is now part of the sidebar's header */}
          <Button variant="ghost" size="icon" className="ml-auto" onClick={toggleSidebar}>
            <ChevronLeft className={cn("h-5 w-5 transition-transform duration-300", !isOpen && "rotate-180")} />
          </Button>
        </div>
        
        <div className="flex-1 space-y-4 overflow-y-auto px-2 py-4">
          <NavGroup title="GÉNÉRAL" isSidebarOpen={isOpen}>{generalNav.map(item => <NavLink key={item.href} item={item} isSidebarOpen={isOpen} />)}</NavGroup>
          <NavGroup title="ADMINISTRATION" isSidebarOpen={isOpen}>{adminNav.map(item => <NavLink key={item.href} item={item} isSidebarOpen={isOpen} />)}</NavGroup>
          <NavGroup title="R&D" isSidebarOpen={isOpen}>{researchNav.map(item => <NavLink key={item.href} item={item} isSidebarOpen={isOpen} />)}</NavGroup>
          <NavGroup title="SUPPORT" isSidebarOpen={isOpen}>{supportNav.map(item => <NavLink key={item.href} item={item} isSidebarOpen={isOpen} />)}</NavGroup>
        </div>
        
        <div className="mt-auto border-t p-2">
          <div className={cn("flex h-12 w-full items-center justify-start gap-3 rounded-lg bg-background p-2 text-sm font-medium", !isOpen && "h-auto justify-center")}>
            <Image src={userImage || `https://avatar.vercel.sh/${user?.email}.svg`} alt={userDisplayName} width={32} height={32} className="rounded-full"/>
            <div className={cn("flex-1 truncate", !isOpen && "hidden")}>
                <p className="font-semibold truncate">{userDisplayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Button variant="ghost" size="icon" className={cn("shrink-0", !isOpen && "hidden")} onClick={handleLogout}><LogOut className="h-4 w-4"/></Button>
          </div>
        </div>
      </div>
    </aside>
  );
}