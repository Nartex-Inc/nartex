// src/components/dashboard/sidebar.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
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
  FolderTree,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** Keep your original types and constants (no refactor) */
type NavItem = { href: string; title: string; icon: React.ElementType };

interface SidebarProps {
  isOpen: boolean;
  isMobileOpen: boolean;
  toggleSidebar: () => void;
  closeMobileSidebar: () => void;
}

/** Your existing nav definition left as-is */
const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "GÉNÉRAL",
    items: [
      { href: "/dashboard", title: "Mon dashboard", icon: LayoutDashboard },
      { href: "/dashboard/tasks", title: "Mes tâches", icon: ListChecks },
      { href: "/dashboard/projects", title: "Mes projets", icon: Briefcase },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
      { href: "/dashboard/sharepoint", title: "Arborescence", icon: FolderTree },
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

/** Premium visual helpers (no behavioral refactor) */
const ACTIVE_CHIP =
  "chip-active chip-aura ring-1 ring-white/10 shadow-soft"; // gradient + glow + soft shadow
const IDLE_LINK =
  "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-white";

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
    "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all hover:no-underline",
    "ring-1 ring-transparent",
    active ? ACTIVE_CHIP : `${IDLE_LINK} hover:translate-x-[1px]`
  );

  const content = (
    <Link
      href={item.href}
      onClick={() => (isMobile ? closeMobile() : undefined)}
      className={linkClasses}
      aria-current={active ? "page" : undefined}
    >
      <item.icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active
            ? "text-white drop-shadow-[0_2px_8px_rgba(59,130,246,.55)]"
            : "text-slate-500 group-hover:text-slate-800 dark:text-zinc-300 dark:group-hover:text-white"
        )}
      />
      {expanded && (
        <span className="truncate flex items-center gap-1">
          {item.title}
          {/* Optional tiny live dot on active item */}
          {active && (
            <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-white/90 pulse-badge" />
          )}
        </span>
      )}
    </Link>
  );

  if (expanded) return content;

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
        <h2 className="px-3 py-2 text-[10.5px] font-semibold tracking-[0.14em] text-slate-500/90 dark:text-zinc-400/90">
          {title}
        </h2>
      )}
      <nav className={cn("flex flex-col gap-1", !expanded && "items-center")}>
        {children}
      </nav>
    </div>
  );
}

export function Sidebar({
  isOpen,
  isMobileOpen,
  toggleSidebar,
  closeMobileSidebar,
}: SidebarProps) {
  const { data } = useSession();
  const user = data?.user;
  const display = user?.name || user?.email?.split("@")[0] || "Utilisateur";
  const initials =
    (display.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() ||
      "U");

  const expanded = isOpen || isMobileOpen;
  const desktopWidth = isOpen ? "lg:w-64" : "lg:w-[84px]";

  React.useEffect(() => {
    const w = isOpen ? "16rem" : "84px";
    document.documentElement.style.setProperty("--sidebar-w", w);
  }, [isOpen]);

  return (
    <TooltipProvider>
      {/* MOBILE drawer */}
      <div
        className={cn(
          "fixed left-0 top-16 z-50 h-[calc(100svh-4rem)] w-64 -translate-x-full transition-transform duration-300 lg:hidden",
          "border-r hairline glass shadow-soft",
          isMobileOpen && "translate-x-0"
        )}
        role="dialog"
        aria-modal="true"
      >
        <aside className="flex h-full flex-col">
          {/* Brand row (mobile) */}
          <div className="flex h-12 flex-none items-center justify-between border-b hairline px-4 bg-transparent">
            <Image
              src="/sinto-logo.svg"
              alt="Sinto"
              width={96}
              height={22}
              priority
              className="select-none"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={closeMobileSidebar}
              aria-label="Fermer"
              className="text-slate-700 hover:bg-slate-200/60 dark:text-zinc-200 dark:hover:bg-white/10"
            >
              <ChevronLeft className="h-5 w-5 rotate-180" />
            </Button>
          </div>

          {/* Scrollable nav */}
          <div className="min-h-0 flex-1 overflow-y-auto p-3 [mask-image:linear-gradient(to_bottom,transparent,black_12px,black_calc(100%-12px),transparent)]">
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

          {/* Pinned user strip */}
          <div className="flex-none border-t p-3 hairline">
            <div className="flex items-center gap-3 rounded-xl bg-white/70 dark:bg-white/5 p-2 ring-1 ring-[--hairline] shadow-soft">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.image ?? ""} alt={display} />
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{display}</p>
                <p className="truncate text-xs text-muted-foreground dark:text-zinc-400">{user?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Déconnexion"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-slate-700 hover:bg-slate-200/60 dark:text-zinc-200 dark:hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {/* DESKTOP rail */}
      <aside
        aria-label="Barre latérale"
        className={cn(
          "fixed left-0 top-16 z-30 hidden h-[calc(100svh-4rem)] transition-[width] duration-300 lg:flex lg:flex-col",
          "border-r hairline glass shadow-soft",
          desktopWidth
        )}
      >
        {/* Brand row (desktop) */}
        <div className="flex h-12 flex-none items-center justify-between border-b hairline px-3 bg-transparent">
          <div className="flex items-center gap-2 overflow-hidden">
            <Image
              src="/sinto-logo.svg"
              alt="Sinto"
              width={92}
              height={20}
              priority
              className={cn(
                "select-none transition-opacity duration-200",
                isOpen ? "opacity-100" : "opacity-0"
              )}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label={isOpen ? "Réduire" : "Agrandir"}
            className="text-slate-700 hover:bg-slate-200/60 dark:text-zinc-200 dark:hover:bg-white/10"
          >
            <ChevronLeft
              className={cn("h-5 w-5 transition-transform", !isOpen && "rotate-180")}
            />
          </Button>
        </div>

        {/* Scrollable nav */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3 [mask-image:linear-gradient(to_bottom,transparent,black_12px,black_calc(100%-12px),transparent)]">
          <div className="flex flex-col gap-4">
            {NAV_GROUPS.map((group) => (
              <NavGroup key={group.title} title={group.title} expanded={expanded}>
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

        {/* Pinned user strip */}
        <div className="flex-none border-t p-2 hairline">
          {expanded ? (
            <div className="flex items-center gap-3 rounded-xl bg-white/70 dark:bg-white/5 p-2 ring-1 ring-[--hairline] shadow-soft">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.image ?? ""} alt={display} />
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{display}</p>
                <p className="truncate text-xs text-muted-foreground dark:text-zinc-400">{user?.email}</p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Déconnexion"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-slate-700 hover:bg-slate-200/60 dark:text-zinc-200 dark:hover:bg-white/10"
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
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 dark:bg-white/5 ring-1 ring-[--hairline] shadow-soft">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user?.image ?? ""} alt={display} />
                    <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="space-y-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{display}</p>
                {user?.email && (
                  <p className="text-xs text-muted-foreground dark:text-zinc-400">{user.email}</p>
                )}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}

export default Sidebar;
