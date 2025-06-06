"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils"; // Make sure you have this utility from Shadcn

const NavItem = ({
  href,
  icon: Icon,
  label,
  isCollapsed,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isCollapsed: boolean;
}) => {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={href}
            className={cn(
              "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              isActive ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : "text-muted-foreground",
              isCollapsed ? "justify-center" : ""
            )}
          >
            <Icon className={cn("h-5 w-5", isCollapsed ? "" : "mr-3")} />
            {!isCollapsed && <span>{label}</span>}
          </Link>
        </TooltipTrigger>
        {isCollapsed && (
          <TooltipContent side="right">
            <p>{label}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      className={cn(
        "h-screen bg-card border-r flex flex-col transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Sticky top part for logo and toggle - not part of scrollable nav */}
      <div className={cn("p-4 border-b", isCollapsed ? "flex justify-center" : "flex items-center justify-between")}>
        {!isCollapsed && <span className="text-lg font-semibold">My App</span>}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="ml-auto">
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>

      {/* Scrollable navigation area */}
      <nav className="flex-grow px-2 py-4 space-y-1 overflow-y-auto">
        <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" isCollapsed={isCollapsed} />
        <NavItem href="/dashboard/product-requests" icon={ShoppingBag} label="Product Requests" isCollapsed={isCollapsed} />
        {/* Add more NavItems here as needed */}
      </nav>

      {/* Optional: Sticky bottom part (e.g., settings, user profile shortcut) */}
      <div className="p-2 mt-auto border-t">
         <NavItem href="/dashboard/settings" icon={Settings} label="Settings" isCollapsed={isCollapsed} />
      </div>
    </div>
  );
}