// src/components/dashboard/sidebar.tsx

"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from 'next/image';
import {
  ListChecks, Briefcase, UserPlus, RefreshCcw, Receipt,
  FlaskConical, Network, PlusCircle, Ticket, LogOut
} from "lucide-react";
import { type NavItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// FIX: Add the 'isOpen' and 'toggleSidebar' props back to the interface.
// The sidebar needs to know its state and how to change it, even if the button is now in the layout.
// We will remove the toggle button from the sidebar visuals, but keep the prop for state management.
interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const NavLink = ({ item, isSidebarOpen }: { item: NavItem, isSidebarOpen: boolean }) => {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={item.href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary", isActive && "bg-muted text-primary", !isSidebarOpen && "justify-center")}>
            <item.icon className="h-4 w-4" />
            <span className={cn("truncate", isSidebarOpen ? "block" : "hidden")}>{item.title}</span>
          </Link>
        </TooltipTrigger>
        {!isSidebarOpen && (<TooltipContent side="right">{item.title}</TooltipContent>)}
      </Tooltip>
    </TooltipProvider>
  );
};

const NavGroup = ({ title, children, isSidebarOpen }: { title: string, children: React.ReactNode, isSidebarOpen: boolean }) => (
  <div className="space-y-1">
    <h2 className={cn("px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground/80 transition-opacity duration-300", isSidebarOpen ? "opacity-100" : "opacity-0 h-0 p-0")}>{title}</h2>
    {children}
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
    // The sidebar width is controlled by the 'isOpen' prop.
    <aside className={cn("hidden lg:block h-screen transition-all duration-300 ease-in-out", "bg-muted/40 dark:bg-muted/10 border-r", isOpen ? "w-64" : "w-20")}>
      <div className="flex h-full max-h-screen flex-col">
        {/* REMOVED the header from within the sidebar */}
        <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-4 mt-16"> {/* Added mt-16 to account for the main header */}
          <NavGroup title="GÉNÉRAL" isSidebarOpen={isOpen}>{generalNav.map(item => <NavLink key={item.href} item={item} isSidebarOpen={isOpen} />)}</NavGroup>
          <NavGroup title="ADMINISTRATION" isSidebarOpen={isOpen}>{adminNav.map(item => <NavLink key={item.href} item={item} isSidebarOpen={isOpen} />)}</NavGroup>
          <NavGroup title="R&D" isSidebarOpen={isOpen}>{researchNav.map(item => <NavLink key={item.href} item={item} isSidebarOpen={isOpen} />)}</NavGroup>
          <NavGroup title="SUPPORT" isSidebarOpen={isOpen}>{supportNav.map(item => <NavLink key={item.href} item={item} isSidebarOpen={isOpen} />)}</NavGroup>
        </nav>
        <div className="sticky bottom-0 mt-auto border-t p-2">
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