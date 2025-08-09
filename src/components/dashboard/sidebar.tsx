"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type NavItem = { href: string; title: string; icon: React.ElementType };

interface SidebarProps {
  isOpen: boolean; // desktop expanded/collapsed
  isMobileOpen: boolean; // mobile drawer open
  toggleSidebar: () => void;
  closeMobileSidebar: () => void;
}

/* ------------------------- Nav structure (yours) ------------------------- */
const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
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

/* ------------------------------- Helpers -------------------------------- */
function NavLink({
  item,
  expanded,
  isMobile,
  closeMobile,
}: {
  item: NavItem;
  expanded: boolean;
  isMobile: boolean;
  closeMobile: () => void;
}) {
  const pathname = usePathname();
  const active =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(item.href));

  const linkClasses = cn(
    "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
    active
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
  );

  const content = (
    <Link
      href={item.href}
      onClick={() => (isMobile ? closeMobile() : undefined)}
      className={linkClasses}
      aria-current={active ? "page" : undefined}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {expanded && <span className="truncate">{item.title}</span>}
    </Link>
  );

  if (expanded) return content;

  // Collapsed: icon-only with tooltip
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right" className="ml-2">
        {item.title}
      </TooltipContent>
    </Tooltip>
  );
}

function NavGroup({
  title,
  expanded,
  children,
}: {
  title: string;
  expanded: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      {expanded && (
        <h2 className="px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground/80">
          {title}
        </h2>
      )}
      <nav className={cn("flex flex-col gap-1", !expanded && "items-center")}>
        {children}
      </nav>
    </div>
  );
}

/* -------------------------------- Sidebar -------------------------------- */
export function Sidebar({
  isOpen,
  isMobileOpen,
  toggleSidebar,
  closeMobileSidebar,
}: SidebarProps) {
  const { data } = useSession();
  const user = data?.user;
  const display = user?.name || user?.email?.split("@")[0] || "User";

  const expanded = isOpen || isMobileOpen;
  const desktopWidth = isOpen ? "lg:w-64" : "lg:w-[84px]";

  return (
    <TooltipProvider>
      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 -translate-x-full border-r bg-background shadow-lg transition-transform duration-300 lg:hidden",
          isMobileOpen && "translate-x-0"
        )}
        role="dialog"
        aria-modal="true"
      >
        <aside className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b px-4">
            <Image
              src="/sinto-logo.svg"
              alt="Sinto"
              width={92}
              height={20}
              className="select-none filter-none invert-0 dark:invert-0"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={closeMobileSidebar}
              aria-label="Fermer"
            >
              <ChevronLeft className="h-5 w-5 rotate-180" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="flex flex-col gap-4">
              {NAV_GROUPS.map((group) => (
                <NavGroup key={group.title} title={group.title} expanded>
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      expanded
                      isMobile
                      closeMobile={closeMobileSidebar}
                    />
                  ))}
                </NavGroup>
              ))}
            </div>
          </div>

          <div className="border-t p-3">
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-2">
              <Image
                src={
                  user?.image || `https://avatar.vercel.sh/${user?.email}.svg`
                }
                alt={display}
                width={32}
                height={32}
                className="rounded-full"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{display}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Déconnexion"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {/* Desktop rail */}
      <aside
        aria-label="Barre latérale"
        className={cn(
          "relative z-30 hidden shrink-0 border-r bg-background transition-[width] duration-300 lg:block",
          desktopWidth
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-3">
          <div className="flex items-center gap-2">
            <Image
              src="/sinto-logo.svg"
              alt="Sinto"
              width={92}
              height={20}
              className={cn("select-none filter-none invert-0 dark:invert-0", !expanded && "opacity-0")}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label={isOpen ? "Réduire" : "Agrandir"}
          >
            <ChevronLeft
              className={cn(
                "h-5 w-5 transition-transform",
                !isOpen && "rotate-180"
              )}
            />
          </Button>
        </div>

        <div className="flex h-[calc(100%-4rem)] flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3">
            <div className="flex flex-col gap-4">
              {NAV_GROUPS.map((group) => (
                <NavGroup
                  key={group.title}
                  title={group.title}
                  expanded={expanded}
                >
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      expanded={expanded}
                      isMobile={false}
                      closeMobile={() => {}}
                    />
                  ))}
                </NavGroup>
              ))}
            </div>
          </div>

          {/* User strip */}
          <div className="border-t p-2">
            {expanded ? (
              <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-2">
                <Image
                  src={
                    user?.image || `https://avatar.vercel.sh/${user?.email}.svg`
                  }
                  alt={display}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{display}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Déconnexion"
                      onClick={() => signOut({ callbackUrl: "/" })}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Déconnexion</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50">
                    <Image
                      src={
                        user?.image ||
                        `https://avatar.vercel.sh/${user?.email}.svg`
                      }
                      alt={display}
                      width={28}
                      height={28}
                      className="rounded-full"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="space-y-1">
                  <p className="text-sm font-medium">{display}</p>
                  {user?.email && (
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

export default Sidebar;
