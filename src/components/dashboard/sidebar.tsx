// src/components/sidebar.tsx
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
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Assuming NavItem type is defined something like this in @/lib/types
interface NavItem {
  href: string;
  title: string;
  icon: React.ElementType;
}

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const NavLink = ({ item, isSidebarOpen }: { item: NavItem, isSidebarOpen:boolean }) => {
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
    {isSidebarOpen && (
      <h2 className="px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground/80">{title}</h2>
    )}
    <nav className={cn("flex flex-col", !isSidebarOpen && "items-center")}>
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
  // Add more items to test scrolling if needed
  const extraNav: NavItem[] = [{ href: "#", title: "Extra Item 1", icon: Ticket }, { href: "#", title: "Extra Item 2", icon: Ticket }, { href: "#", title: "Extra Item 3", icon: Ticket }];

  return (
    // FIX: Removed h-screen. The height is now controlled by the parent flex container in DashboardLayout.
    <aside className={cn(
      "hidden lg:flex flex-col transition-all duration-300 ease-in-out", 
      "bg-muted/40 dark:bg-muted/10 border-r", 
      isOpen ? "w-64" : "w-20"
    )}>
      
      {/* 1. Sidebar Header (Non-scrollable) */}
      <div className="flex h-16 shrink-0 items-center justify-end border-b px-4 lg:px-6">
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <ChevronLeft className={cn("h-5 w-5 transition-transform duration-300", !isOpen && "rotate-180")} />
        </Button>
      </div>
      
      {/* 2. Main Navigation (Scrollable Area) */}
      {/* FIX: This structure makes this div scrollable while the header/footer are fixed. */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="flex flex-col gap-4 px-2">
          <NavGroup title="GÉNÉRAL" isSidebarOpen={isOpen}>{generalNav.map(item => <NavLink key={item.href} item={item} isSidebarOpen={isOpen} />)}</NavGroup>
          <NavGroup title="ADMINISTRATION" isSidebarOpen={isOpen}>{adminNav.map(item => <NavLink key={item.href} item={item} isSidebarOpen={isOpen} />)}</NavGroup>
          <NavGroup title="R&D" isSidebarOpen={isOpen}>{researchNav.map(item => <NavLink key={item.href} item={item} isSidebarOpen={isOpen} />)}</NavGroup>
          <NavGroup title="SUPPORT" isSidebarOpen={isOpen}>{supportNav.map(item => <NavLink key={item.href} item={item} isSidebarOpen={isOpen} />)}</NavGroup>
          {/* <NavGroup title="EXTRA" isSidebarOpen={isOpen}>{extraNav.map(item => <NavLink key={item.href} item={item} isSidebarOpen={isOpen} />)}</NavGroup> */}
        </div>
      </div>
      
      {/* 3. Sidebar Footer (User Profile - Non-scrollable and Sticky) */}
      <div className="shrink-0 border-t p-2">
        {!isOpen ? (
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex h-12 w-full cursor-pointer items-center justify-center rounded-lg bg-background p-2 text-sm font-medium">
                  <Image src={userImage || `https://avatar.vercel.sh/${user?.email}.svg`} alt={userDisplayName} width={32} height={32} className="rounded-full"/>
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
          <div className="flex h-12 w-full items-center justify-start gap-3 rounded-lg bg-background p-2 text-sm font-medium">
            <Image src={userImage || `https://avatar.vercel.sh/${user?.email}.svg`} alt={userDisplayName} width={32} height={32} className="rounded-full"/>
            <div className="flex-1 truncate">
                <p className="font-semibold truncate">{userDisplayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={handleLogout}><LogOut className="h-4 w-4"/></Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Déconnexion</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </aside>
  );
}