"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from 'next/image';
import {
  LayoutDashboard,
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
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Define the NavItem type right here for clarity
interface NavItem {
  href: string;
  title: string;
  icon: React.ElementType;
}

// Define the component's props
interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

// Sub-component for navigation links for cleaner code
const NavLink = ({ item, isSidebarOpen }: { item: NavItem, isSidebarOpen: boolean }) => {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

  if (!isSidebarOpen) {
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

// Sub-component for navigation groups
const NavGroup = ({ title, children, isSidebarOpen }: { title: string, children: React.ReactNode, isSidebarOpen: boolean }) => (
  <div>
    {isSidebarOpen && (
      <h2 className="px-4 pt-2 pb-1 text-xs font-semibold tracking-wider text-muted-foreground/60 uppercase">{title}</h2>
    )}
    <nav className={cn("flex flex-col gap-1", !isSidebarOpen && "items-center")}>
      {children}
    </nav>
  </div>
);

// --- The MAIN EXPORTED COMPONENT ---
export function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const { data: session } = useSession();
  const handleLogout = () => signOut({ callbackUrl: "/" });

  const user = session?.user;
  const userDisplayName = user?.name || user?.email?.split('@')[0] || "User";
  const userImage = user?.image;

  // Navigation items defined clearly
  const generalNav: NavItem[] = [
    { href: "/dashboard", title: "Tableau de Bord", icon: LayoutDashboard },
    { href: "/dashboard/tasks", title: "Mes tâches", icon: ListChecks },
    { href: "/dashboard/projects", title: "Mes projets", icon: Briefcase }
  ];
  const adminNav: NavItem[] = [
    { href: "/dashboard/admin/onboarding", title: "Onboarding", icon: UserPlus },
    { href: "/dashboard/admin/returns", title: "Gestion des retours", icon: RefreshCcw },
    { href: "/dashboard/admin/collections", title: "Recouvrement", icon: Receipt }
  ];
  const researchNav: NavItem[] = [
    { href: "/dashboard/rd/requests", title: "Demandes de produits", icon: FlaskConical },
    { href: "/dashboard/rd/pipeline", title: "Pipeline de produits", icon: Network }
  ];
  const supportNav: NavItem[] = [
    { href: "/dashboard/support/new", title: "Nouveau billet", icon: PlusCircle },
    { href: "/dashboard/support/tickets", title: "Gestion des billets", icon: Ticket }
  ];

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col transition-all duration-300 ease-in-out relative",
        "bg-card border-r", 
        isOpen ? "w-64" : "w-20"
      )}
    >
      <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-br from-background to-muted/20 -z-10" />

      {/* --- FINAL CORRECTED Sidebar Header --- */}
      <div className={cn("flex h-16 shrink-0 items-center border-b px-4", !isOpen && "justify-center")}>
        <Link href="/dashboard" className="flex items-center gap-3 font-semibold text-lg">
          <Image 
            src="https://commandites.sintoexpert.com/static/media/sinto-logo.07666849b84f5f505c45.png" 
            alt="Sinto Logo" 
            // 1. Logo size adjusted
            width={48}
            height={48}
            // 2. `dark:invert` is removed as requested
            className="shrink-0" 
          />
          {/* 3. Text is now visible and animates correctly */}
          <span className={cn(
            "text-foreground origin-left transition-all duration-200", 
            isOpen ? "opacity-100 scale-100" : "opacity-0 scale-0 w-0"
          )}>
            Sinto
          </span>
        </Link>
      </div>

      {/* Main Scrollable Navigation Area */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="flex flex-col gap-6 px-2">
          <NavGroup title="Général" isSidebarOpen={isOpen}>
            {generalNav.map(item => <NavLink key={item.href} item={item} isSidebarOpen={isOpen} />)}
          </NavGroup>
          <NavGroup title="Administration" isSidebarOpen={isOpen}>
            {adminNav.map(item => <NavLink key={item.href} item={item} isSidebarOpen={isOpen} />)}
          </NavGroup>
          <NavGroup title="R&D" isSidebarOpen={isOpen}>
            {researchNav.map(item => <NavLink key={item.href} item={item} isSidebarOpen={isOpen} />)}
          </NavGroup>
          <NavGroup title="Support" isSidebarOpen={isOpen}>
            {supportNav.map(item => <NavLink key={item.href} item={item} isSidebarOpen={isOpen} />)}
          </NavGroup>
        </div>
      </div>

      {/* Sticky Sidebar Footer */}
      <div className="mt-auto shrink-0 border-t p-2">
        {!isOpen ? (
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

      {/* Floating Toggle Button */}
      <Button variant="outline" size="icon" onClick={toggleSidebar} className="absolute top-16 -right-5 h-10 w-10 rounded-full border bg-background hover:bg-muted shadow-md">
        <ChevronLeft className={cn("h-5 w-5 transition-transform duration-300", !isOpen && "rotate-180")} />
      </Button>
    </aside>
  );
}
