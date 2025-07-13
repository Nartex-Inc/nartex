"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from 'next/image';
import {
  LayoutDashboard, ListChecks, Briefcase, UserPlus, RefreshCcw, Receipt,
  FlaskConical, Network, PlusCircle, Ticket, LogOut, ChevronLeft, Megaphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// --- Interfaces (No changes needed) ---
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

// --- NavLink Component ---
// FIX: Removed the individual <TooltipProvider> which was causing the build error.
// The provider is now at the top level of the Sidebar component.
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
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={item.href}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted",
              isActive && "bg-primary/10 text-primary font-semibold"
            )}>
            <item.icon className="h-5 w-5" />
            <span className="sr-only">{item.title}</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{item.title}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={handleLinkClick}
      className={cn(
        "flex items-center gap-4 rounded-md px-4 py-2.5 text-muted-foreground transition-all hover:text-foreground hover:bg-muted",
        isActive && "bg-primary/10 text-primary font-semibold"
      )}>
      <item.icon className="h-5 w-5" />
      <span className="truncate text-sm font-medium">{item.title}</span>
    </Link>
  );
};

const NavGroup = ({ title, isSidebarOpen, children }: { title: string; children: React.ReactNode; isSidebarOpen: boolean; }) => (
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
  const router = useRouter();

  // FIX: Refactored navigation items into a single array of groups.
  // This makes the code cleaner and easier to manage.
  const navItemGroups = [
    { title: "Général", items: [ { href: "/dashboard", title: "Tableau de Bord", icon: LayoutDashboard }, { href: "/dashboard/tasks", title: "Mes tâches", icon: ListChecks }, { href: "/dashboard/projects", title: "Mes projets", icon: Briefcase } ]},
    { title: "Administration", items: [ { href: "/dashboard/admin/onboarding", title: "Onboarding", icon: UserPlus }, { href: "/dashboard/admin/returns", title: "Gestion des retours", icon: RefreshCcw }, { href: "/dashboard/admin/collections", title: "Recouvrement", icon: Receipt } ]},
    { title: "Marketing", items: [ { href: "/dashboard/marketing/sponsorships", title: "Gestion des commandites", icon: Megaphone } ]},
    { title: "R&D", items: [ { href: "/dashboard/rd/requests", title: "Demandes de produits", icon: FlaskConical }, { href: "/dashboard/rd/pipeline", title: "Pipeline de produits", icon: Network } ]},
    { title: "Support", items: [ { href: "/dashboard/support/new", title: "Nouveau billet", icon: PlusCircle }, { href: "/dashboard/support/tickets", title: "Gestion des billets", icon: Ticket } ]}
  ];

  const user = session?.user;
  const userDisplayName = user?.name || user?.email?.split('@')[0] || "User";
  const userImage = user?.image;
  const isExpanded = isOpen || isMobileOpen;

  // FIX: State management for tenants to prevent React hydration errors.
  // Reading localStorage directly in useState is unsafe in Next.js.
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);

  useEffect(() => {
    // This code now runs only on the client, which is safe.
    fetch('/api/user/tenants')
      .then((res) => res.json())
      .then((data) => {
        setTenants(data);
        const storedTenantId = localStorage.getItem('currentTenantId');
        if (storedTenantId && data.some((t: {id: string}) => t.id === storedTenantId)) {
          setCurrentTenantId(storedTenantId);
        } else if (data.length > 0) {
          const firstId = data[0].id;
          setCurrentTenantId(firstId);
          localStorage.setItem('currentTenantId', firstId);
        }
      })
      .catch((error) => console.error('Failed to fetch tenants:', error));
  }, []);

  // FIX: Use router.refresh() for a better UX than a full page reload.
  const handleTenantChange = (value: string) => {
    setCurrentTenantId(value);
    localStorage.setItem('currentTenantId', value);
    router.refresh(); 
  };
  
  const handleLogout = () => signOut({ callbackUrl: "/" });

  return (
    <aside
      className={cn(
        "flex-col transition-all duration-300 ease-in-out bg-card border-r",
        "fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full lg:relative lg:translate-x-0",
        isMobileOpen && "translate-x-0",
        isOpen ? "lg:w-72" : "lg:w-20"
      )}>
      {/* FIX: This is the single, top-level TooltipProvider that resolves the build error. */}
      <TooltipProvider delayDuration={0}>
        <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-br from-background to-muted/20 -z-10" />

        <div className="flex h-16 shrink-0 items-center border-b px-4">
          <Link href="/dashboard" className={cn("flex items-center gap-2 font-semibold w-full", !isExpanded && "justify-center")}>
            <Image src="/sinto-logo.svg" alt="Sinto Logo" width={32} height={32} className="shrink-0"/>
            <span className={cn("text-primary dark:text-foreground", isExpanded ? "block" : "hidden")}>Sinto</span>
          </Link>
        </div>

        {isExpanded && tenants.length > 0 && (
          <div className="px-4 py-2 border-b">
            <Select value={currentTenantId ?? ''} onValueChange={handleTenantChange} disabled={!currentTenantId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionnez une entreprise" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-4">
          <div className="flex flex-col gap-6 px-2">
            {navItemGroups.map((group) => (
              <NavGroup key={group.title} title={group.title} isSidebarOpen={isExpanded}>
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} isSidebarOpen={isExpanded} closeMobileSidebar={closeMobileSidebar} isMobile={isMobileOpen} />
                ))}
              </NavGroup>
            ))}
          </div>
        </div>

        <div className="mt-auto shrink-0 border-t p-2">
          {!isExpanded ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-12 w-full cursor-pointer items-center justify-center rounded-lg p-2 text-sm font-medium">
                  <Image src={userImage || `https://avatar.vercel.sh/${user?.email}.svg`} alt={userDisplayName} width={36} height={36} className="rounded-full" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" align="start">
                <p className="font-semibold">{userDisplayName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" />Déconnexion</Button>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex h-12 w-full items-center justify-start gap-3 rounded-lg p-2 text-sm font-medium">
              <Image src={userImage || `https://avatar.vercel.sh/${user?.email}.svg`} alt={userDisplayName} width={36} height={36} className="rounded-full"/>
              <div className="flex-1 truncate">
                <p className="font-semibold truncate">{userDisplayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="shrink-0" onClick={handleLogout}><LogOut className="h-4 w-4"/></Button></TooltipTrigger>
                <TooltipContent side="top">Déconnexion</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </TooltipProvider>

      <Button variant="outline" size="icon" onClick={toggleSidebar} className="hidden lg:flex absolute top-16 -right-5 h-10 w-10 rounded-full border bg-background hover:bg-muted shadow-md">
        <ChevronLeft className={cn("h-5 w-5 transition-transform duration-300", !isOpen && "rotate-180")} />
      </Button>
    </aside>
  );
}
