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

/* Width helpers (optional) */
export const SIDEBAR_EXPANDED_W = "16rem";
export const SIDEBAR_COLLAPSED_W = "84px";

type NavItem = { href: string; title: string; icon: React.ElementType };

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

interface SidebarProps {
  isOpen: boolean;
  isMobileOpen: boolean;
  toggleSidebar: () => void;
  closeMobileSidebar: () => void;
  /** Pass the exact same image URL your UserNav uses */
  userImage?: string;
}

/* ── Small atoms ────────────────────────────────────────────────────────── */
function Brand({ condensed }: { condensed: boolean }) {
  return (
    <div className="relative flex items-center">
      <div
        className="pointer-events-none absolute -inset-2 -z-10 opacity-50 blur-2xl"
        style={{
          background:
            "radial-gradient(120px 60px at 10% 50%, rgba(59,130,246,0.12), transparent), radial-gradient(120px 60px at 90% 50%, rgba(168,85,247,0.12), transparent)",
        }}
      />
      <Image
        src="/sinto-logo.svg"
        alt="Sinto"
        width={condensed ? 28 : 96}
        height={20}
        className={cn("select-none transition-all", condensed && "opacity-90")}
        priority
      />
      {!condensed && (
        <span className="ml-2 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] tracking-wide text-muted-foreground">
          workspace
        </span>
      )}
    </div>
  );
}

function SectionLabel({ children, hidden }: { children: React.ReactNode; hidden?: boolean }) {
  if (hidden) return null;
  return (
    <div className="px-3">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground/80">
          {children}
        </span>
      </div>
    </div>
  );
}

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

  const base =
    "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 transition";
  const rest = active
    ? "text-foreground"
    : "text-muted-foreground hover:text-foreground";

  const bg = active
    ? "bg-gradient-to-r from-blue-500/10 via-blue-400/5 to-transparent border border-white/10"
    : "hover:bg-white/[0.04]";

  const leftRail = active ? (
    <span
      aria-hidden
      className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-blue-400 to-violet-400 shadow-[0_0_12px_rgba(99,102,241,0.6)]"
    />
  ) : null;

  const Icon = item.icon;

  const linkContent = (
    <Link
      href={item.href}
      onClick={() => (isMobile ? closeMobile() : undefined)}
      className={cn(base, rest, bg)}
      aria-current={active ? "page" : undefined}
    >
      {leftRail}
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]",
          active && "bg-gradient-to-br from-blue-500/15 to-violet-500/15"
        )}
      >
        <Icon className={cn("h-4 w-4", active ? "text-blue-300" : "text-muted-foreground")} />
      </span>
      {expanded && <span className="truncate">{item.title}</span>}
      {expanded && active && (
        <span className="ml-auto h-2 w-2 rounded-full bg-blue-400/70 shadow-[0_0_10px_rgba(96,165,250,0.7)]" />
      )}
    </Link>
  );

  if (expanded) return linkContent;

  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
      <TooltipContent side="right" className="ml-2 text-xs">
        {item.title}
      </TooltipContent>
    </Tooltip>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
export function Sidebar({
  isOpen,
  isMobileOpen,
  toggleSidebar,
  closeMobileSidebar,
  userImage,
}: SidebarProps) {
  const { data } = useSession();
  const user = data?.user;
  const display = user?.name || user?.email?.split("@")[0] || "Utilisateur";

  // ✨ Single source of truth for avatar:
  const avatarUrl = userImage ?? user?.image ?? null;
  const initial = (display || "?").trim().charAt(0).toUpperCase();

  const expanded = isOpen || isMobileOpen;
  const desktopWidth = isOpen ? "lg:w-64" : "lg:w-[84px]";

  return (
    <TooltipProvider>
      {/* Mobile overlay */}
      <div
        onClick={closeMobileSidebar}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity lg:hidden",
          isMobileOpen && "opacity-100 pointer-events-auto"
        )}
      />

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 -translate-x-full border-r border-white/10 bg-[rgba(7,11,17,0.92)] shadow-2xl backdrop-blur-xl transition-transform duration-300 lg:hidden",
          isMobileOpen && "translate-x-0"
        )}
        role="dialog"
        aria-modal="true"
      >
        <aside className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
            <Brand condensed={false} />
            <Button
              variant="ghost"
              size="icon"
              onClick={closeMobileSidebar}
              aria-label="Fermer"
              className="rounded-full"
            >
              <ChevronLeft className="h-5 w-5 rotate-180" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="flex flex-col gap-5">
              {NAV_GROUPS.map((group) => (
                <div key={group.title} className="space-y-1">
                  <SectionLabel>{group.title}</SectionLabel>
                  <nav className="flex flex-col gap-1 px-2">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.href}
                        item={item}
                        expanded
                        isMobile
                        closeMobile={closeMobileSidebar}
                      />
                    ))}
                  </nav>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 p-3">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={display}
                  width={36}
                  height={36}
                  className="rounded-full ring-1 ring-white/15 object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                  {initial}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{display}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Déconnexion"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-full"
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
          "relative z-30 hidden shrink-0 transition-[width] duration-300 lg:block",
          desktopWidth
        )}
      >
        <div className="absolute inset-0 -z-10 border-r border-white/10 bg-[rgba(7,11,17,0.92)] backdrop-blur-xl" />
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-3">
          <Brand condensed={!expanded} />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label={isOpen ? "Réduire" : "Agrandir"}
            className="rounded-full"
          >
            <ChevronLeft className={cn("h-5 w-5 transition-transform", !isOpen && "rotate-180")} />
          </Button>
        </div>

        <div className="flex h-[calc(100%-4rem)] flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3">
            <div className="flex flex-col gap-5">
              {NAV_GROUPS.map((group) => (
                <div key={group.title} className="space-y-1">
                  <SectionLabel hidden={!expanded}>{group.title}</SectionLabel>
                  <nav className={cn("flex flex-col gap-1 px-2", !expanded && "items-center px-1")}>
                    {group.items.map((item) => (
                      <NavLink
                        key={item.href}
                        item={item}
                        expanded={expanded}
                        isMobile={false}
                        closeMobile={() => {}}
                      />
                    ))}
                  </nav>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 p-2">
            {expanded ? (
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={display}
                    width={36}
                    height={36}
                    className="rounded-full ring-1 ring-white/15 object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                    {initial}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{display}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Déconnexion"
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="rounded-full"
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
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={display}
                        width={28}
                        height={28}
                        className="rounded-full ring-1 ring-white/15 object-cover"
                      />
                    ) : (
                      <span className="text-xs font-semibold">{initial}</span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="space-y-1">
                  <p className="text-sm font-medium">{display}</p>
                  {user?.email && (
                    <p className="text-xs text-muted-foreground">{user.email}</p>
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
