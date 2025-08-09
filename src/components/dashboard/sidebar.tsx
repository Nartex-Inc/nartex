// src/components/dashboard/sidebar.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from 'next/image';
import { ListChecks, Briefcase, UserPlus, RefreshCcw, Receipt, FlaskConical, Network, PlusCircle, Ticket, LogOut, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface NavItem { href: string; title: string; icon: React.ElementType; }
interface SidebarProps {
  isOpen: boolean; // For desktop
  isMobileOpen: boolean; // For mobile
  toggleSidebar: () => void; // For desktop
  closeMobileSidebar: () => void; // For mobile
}

const NavLink = ({ item, isSidebarOpen, closeMobileSidebar, isMobile }: { item: NavItem; isSidebarOpen: boolean; closeMobileSidebar: () => void; isMobile: boolean }) => {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
  const handleLinkClick = () => { if (isMobile) { closeMobileSidebar(); } };

  if (!isSidebarOpen && !isMobile) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={item.href} className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-primary md:h-8 md:w-8", isActive && "bg-muted text-primary")}>
            <item.icon className="h-5 w-5" />
            <span className="sr-only">{item.title}</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{item.title}</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Link href={item.href} onClick={handleLinkClick} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary", isActive && "bg-muted text-primary")}>
      <item.icon className="h-4 w-4" />
      <span className="truncate">{item.title}</span>
    </Link>
  );
};

const NavGroup = ({ title, children, isSidebarOpen }: { title: string; children: React.ReactNode; isSidebarOpen: boolean }) => (
  <div className="space-y-1">
    {isSidebarOpen && <h2 className="px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground/80">{title}</h2>}
    <nav className={cn("flex flex-col", !isSidebarOpen && "items-center")}>{children}</nav>
  </div>
);

export function Sidebar({ isOpen, isMobileOpen, toggleSidebar, closeMobileSidebar }: SidebarProps) {
  const { data: session } = useSession();
  const handleLogout = () => signOut({ callbackUrl: "/" });
  const user = session?.user;
  const userDisplayName = user?.name || user?.email?.split('@')[0] || "User";
  const userImage = user?.image;

  const navItems = [
    { title: "GÉNÉRAL", items: [{ href: "/dashboard/tasks", title: "Mes tâches", icon: ListChecks },{ href: "/dashboard/projects", title: "Mes projets", icon: Briefcase }] },
    { title: "ADMINISTRATION", items: [{ href: "/dashboard/admin/onboarding", title: "Onboarding", icon: UserPlus },{ href: "/dashboard/admin/returns", title: "Gestion des retours", icon: RefreshCcw },{ href: "/dashboard/admin/collections", title: "Recouvrement", icon: Receipt }] },
    { title: "R&D", items: [{ href: "/dashboard/rd/requests", title: "Demandes de produits", icon: FlaskConical },{ href: "/dashboard/rd/pipeline", title: "Pipeline de produits", icon: Network }] },
    { title: "SUPPORT", items: [{ href: "/dashboard/support/new", title: "Nouveau billet", icon: PlusCircle },{ href: "/dashboard/support/tickets", title: "Gestion des billets", icon: Ticket }] },
  ];

  const isExpanded = isOpen || isMobileOpen;

  return (
    <TooltipProvider>
      <aside className={cn(
        "flex-col transition-all duration-300 ease-in-out bg-muted/40
