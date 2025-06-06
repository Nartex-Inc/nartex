"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from 'next/image';
import { useTheme } from "next-themes";
import {
  LayoutDashboard, Plus, ListChecks, CheckCircle, BarChart2, Users, Settings, CreditCard, HelpCircle, LogOut, ChevronLeft, ChevronRight
} from "lucide-react";
import { type NavItem } from "@/lib/types"; // Make sure you have the NavItem type in types.ts

// The props interface MUST match what is being passed from layout.tsx
interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void; // <-- FIX: Added the missing prop
  openTasksCount: number;
  pendingApprovalsCount: number;
}

// Helper component to keep the main return statement clean
const NavLink = ({ item, isSidebarOpen, isDarkMode }: { item: NavItem, isSidebarOpen: boolean, isDarkMode: boolean }) => (
  <Link
    href={item.href}
    title={item.title}
    className={`group flex items-center px-3.5 py-2.5 rounded-lg transition-colors duration-150
      ${isSidebarOpen ? '' : 'lg:justify-center'}
      ${item.active
        ? `${isDarkMode ? `bg-green-600/10 text-green-400 border-green-500/40` : `bg-green-50 text-green-600 border-green-300`} border`
        : `${isDarkMode ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-700/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`
      }`}
  >
    <span className={`group-hover:text-green-500 ${isSidebarOpen ? 'mr-3' : 'lg:mr-0'}`}>
      <item.icon size={20} />
    </span>
    <span className={`truncate font-medium text-sm ${!isSidebarOpen ? 'lg:hidden' : ''}`}>
      {item.title}
    </span>
    {item.badge != null && ( // Check for not null/undefined
      <span className={`ml-auto px-2 py-0.5 rounded-md text-xs font-semibold ${!isSidebarOpen && 'lg:hidden'}
        ${item.badgeColor === "warning"
          ? (isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600')
          : (isDarkMode ? `bg-green-600/20 text-green-400` : `bg-green-100 text-green-600`)
        }`}>
        {item.badge}
      </span>
    )}
  </Link>
);


export function Sidebar({ isOpen, toggleSidebar, openTasksCount, pendingApprovalsCount }: SidebarProps) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };
  
  const user = session?.user;
  const userDisplayName = user?.name || user?.email?.split('@')[0] || "User";
  const userImage = user?.image;

  // Define navigation structure, using props for badge counts
  const navigationItems: NavItem[] = [
    { href: "/dashboard", title: "Tableau de bord", icon: LayoutDashboard, active: pathname === "/dashboard" },
    { href: "/dashboard/projects", title: "Mes Projets", icon: Users, active: pathname.startsWith("/dashboard/projects") },
    { href: "/dashboard/new-project-request", title: "Nouv. Demande", icon: Plus, active: pathname === "/dashboard/new-project-request" },
    { href: "/dashboard/tasks", title: "Mes Tâches", icon: ListChecks, active: pathname.startsWith("/dashboard/tasks"), badge: openTasksCount > 0 ? openTasksCount : null, badgeColor: "warning" },
    { href: "/dashboard/approvals", title: "Approbations", icon: CheckCircle, active: pathname.startsWith("/dashboard/approvals"), badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null, badgeColor: "primary" },
    { href: "/dashboard/analytics", title: "Analytiques", icon: BarChart2, active: pathname.startsWith("/dashboard/analytics") },
  ];

  const adminNavigationItems: NavItem[] = [
    { href: "/dashboard/settings", title: "Paramètres", icon: Settings, active: pathname === "/dashboard/settings" },
    { href: "/dashboard/billing", title: "Facturation", icon: CreditCard, active: pathname === "/dashboard/billing" },
    { href: "/dashboard/help", title: "Support", icon: HelpCircle, active: pathname === "/dashboard/help" },
  ];

  return (
    <aside
      className={`fixed lg:relative z-30 h-full flex-none transition-all duration-300 ease-in-out
        ${isOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full lg:w-20 lg:translate-x-0'}
        ${isDarkMode ? 'bg-gray-900 border-r border-gray-700/80' : 'bg-white border-r border-gray-200'}`}
    >
      <div className={`h-full overflow-y-auto overflow-x-hidden ${isOpen ? 'w-72' : 'lg:w-20'}`}>
        <div className="flex flex-col h-full">
          {/* Main navigation area */}
          <div className="flex-grow p-4">
            {/* Navigation Section */}
            <div>
              <div className={`flex items-center mb-4 ${!isOpen && 'lg:justify-center'}`}>
                  <div className={`px-2.5 py-1 rounded text-xs font-medium text-green-600 tracking-wider uppercase ${!isOpen && 'lg:hidden'} ${isDarkMode ? 'bg-gray-800/70' : 'bg-green-50'}`}>
                    Navigation
                  </div>
              </div>
              <nav className="space-y-1.5">
                {navigationItems.map((item) => <NavLink key={item.href} item={item} isSidebarOpen={isOpen} isDarkMode={isDarkMode} />)}
              </nav>
            </div>
            
            {/* Administration Section */}
            <div className="mt-8">
              <div className={`flex items-center mb-4 ${!isOpen && 'lg:justify-center'}`}>
                  <div className={`px-2.5 py-1 rounded text-xs font-medium text-green-600 tracking-wider uppercase ${!isOpen && 'lg:hidden'} ${isDarkMode ? 'bg-gray-800/70' : 'bg-green-50'}`}>
                    Administration
                  </div>
              </div>
              <nav className="space-y-1.5">
                {adminNavigationItems.map((item) => <NavLink key={item.href} item={item} isSidebarOpen={isOpen} isDarkMode={isDarkMode} />)}
              </nav>
            </div>
          </div>
          
          {/* User Footer in sidebar */}
          <div className={`mt-auto p-4 border-t ${!isOpen && 'lg:p-2.5'} ${isDarkMode ? 'border-gray-700/80' : 'border-gray-200'}`}>
            <div className={`p-3 rounded-lg border ${!isOpen && 'lg:p-2 lg:flex lg:justify-center'} ${isDarkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <div className={`flex items-center ${!isOpen && 'lg:flex-col lg:space-y-1.5'}`}>
                <div className={`relative flex-shrink-0 w-9 h-9 rounded-full bg-green-600 p-0.5`}>
                  <div className={`absolute inset-0.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    {userImage ? (
                      <Image src={userImage} alt={userDisplayName} width={36} height={36} className="rounded-full" />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-sm font-semibold text-white bg-green-600">
                        {userDisplayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <div className={`flex-1 min-w-0 ${isOpen ? 'ml-3' : 'lg:hidden'}`}>
                  <p className={`text-sm font-semibold truncate ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>{userDisplayName}</p>
                  <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>En ligne</p>
                </div>
                <button
                  onClick={handleLogout}
                  className={`transition p-1.5 rounded-full ${isOpen ? 'ml-2' : 'lg:mt-1.5'} ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
                  title="Déconnexion"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}