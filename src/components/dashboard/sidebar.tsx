// src/components/dashboard/sidebar.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import NartexLogo from "@/components/nartex-logo"; // ✅ use your actual component

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
  isOpen: boolean;            // For desktop
  isMobileOpen: boolean;      // For mobile
  toggleSidebar: () => void;  // For desktop
  closeMobileSidebar: () => void; // For mobile
}

const NavLink = ({
  item,
  isSidebarOpen,
  closeMobileSidebar,
  isMobile,
}: {
  item: NavItem;
  isSidebarOpen: boolean;
  closeMobileSidebar: () => void;
  isMobile: boolean;
}) => {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
  const handleLinkClick = () => {
    if (isMobile) closeMobileSidebar();
  };

  if (!isSidebarOpen && !isMobile) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={item.href}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-primary md:h-8 md:w-8",
              isActive && "bg-muted text-primary"
            )}
          >
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
        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
        isActive && "bg-muted text-primary"
      )}
    >
      <item.icon className="h-4 w-4" />
      <span className="truncate">{item.title}</span>
    </Link>
  );
};

const NavGroup = ({
  title,
  children,
  isSidebarOpen,
}: {
  title: string;
  children: React.ReactNode;
  isSidebarOpen: boolean;
}) => (
  <div className="space-y-1">
    {isSidebarOpen && (
      <h2 className="px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground/80">{title}</h2>
    )}
    <nav className={cn("flex flex-col", !isSidebarOpen && "items-center")}>{children}</nav>
  </div>
);

export function Sidebar({ isOpen, isMobileOpen, toggleSidebar, closeMobileSidebar }: SidebarProps) {
  const { data: session } = useSession();
  const handleLogout = () => signOut({ callbackUrl: "/" });
  const user = session?.user;
  const userDisplayName = user?.name || user?.email?.split("@")[0] || "User";
  const userImage = user?.image;

  const navItems = [
    {
      title: "GÉNÉRAL",
      items: [
        { href: "/dashboard/tasks", title: "Mes tâches", icon: ListChecks },
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
        { href: "/dashboard/rd/requests", title: "Demandes de produits", icon: FlaskConical },
        { href: "/dashboard/rd/pipeline", title: "Pipeline de produits", icon: Network },
      ],
    },
    {
      title: "SUPPORT",
      items: [
        { href: "/dashboard/support/new", title: "Nouveau billet", icon: PlusCircle },
        { href: "/dashboard/support/tickets", title: "Gestion des billets", icon: Ticket },
      ],
    },
  ];

  const isExpanded = isOpen || isMobileOpen;

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "flex-col transition-all duration-300 ease-in-out bg-muted/40 dark:bg-muted/10 border-r",
          "fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full lg:relative lg:translate-x-0",
          isMobileOpen && "translate-x-0",
          isOpen ? "lg:w-64" : "lg:w-20"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b px-4 lg:px-6">
          <Link href="/dashboard" className={cn(!isExpanded && "sr-only")}>
            {/* ✅ brand logo with fixed fills; never invert in dark mode */}
            <NartexLogo className="sinto-logo !filter-none h-5 w-auto" width={80} height={20} />
          </Link>
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="hidden lg:flex">
            <ChevronLeft className={cn("h-5 w-5 transition-transform duration-300", !isOpen && "rotate-180")} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="flex flex-col gap-4 px-2">
            {navItems.map((group) => (
              <NavGroup key={group.title} title={group.title} isSidebarOpen={isExpanded}>
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    isSidebarOpen={isExpanded}
                    closeMobileSidebar={closeMobileSidebar}
                    isMobile={isMobileOpen}
                  />
                ))}
              </NavGroup>
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t p-2">
          {!isExpanded ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-12 w-full cursor-pointer items-center justify-center rounded-lg bg-background p-2 text-sm font-medium">
                  <Image
                    src={userImage || `https://avatar.vercel.sh/${user?.email}.svg`}
                    alt={userDisplayName}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" align="start">
                <p className="font-semibold">{userDisplayName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </Button>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex h-12 w-full items-center justify-start gap-3 rounded-lg bg-background p-2 text-sm font-medium">
              <Image
                src={userImage || `https://avatar.vercel.sh/${user?.email}.svg`}
                alt={userDisplayName}
                width={32}
                height={32}
                className="rounded-full"
              />
              <div className="flex-1 truncate">
                <p className="font-semibold truncate">{userDisplayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Déconnexion</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
