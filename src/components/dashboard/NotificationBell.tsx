"use client";

import * as React from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { Bell, Check, X, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  ok: boolean;
  data: Notification[];
  unreadCount: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function NotificationBell() {
  const router = useRouter();
  const { data, mutate } = useSWR<NotificationsResponse>(
    "/api/notifications?limit=10",
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  );

  const notifications = data?.data ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const markAsRead = async (ids: string[]) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    mutate();
  };

  const markAllAsRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    mutate();
  };

  const dismissNotification = async (id: string) => {
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    mutate();
  };

  const dismissAll = async () => {
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    mutate();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead([notification.id]);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString("fr-CA");
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "relative flex items-center justify-center h-9 w-9 rounded-lg",
            "outline-none transition-all duration-200",
            "text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))]",
            "hover:bg-[hsl(var(--bg-elevated))]",
            "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          )}
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={cn(
          "w-80 max-h-[400px] overflow-y-auto rounded-xl p-0",
          "bg-[hsl(var(--bg-surface))] border-[hsl(var(--border-default))]",
          "shadow-xl shadow-black/20"
        )}
      >
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border-subtle))]">
          <span className="text-sm font-semibold text-[hsl(var(--text-primary))]">
            Notifications
          </span>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  markAllAsRead();
                }}
                className="text-xs text-accent hover:underline"
              >
                Tout marquer comme lu
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  dismissAll();
                }}
                className="text-xs text-[hsl(var(--text-muted))] hover:text-red-400 hover:underline"
              >
                Tout effacer
              </button>
            )}
          </div>
        </DropdownMenuLabel>

        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[hsl(var(--text-muted))]">
            Aucune notification
          </div>
        ) : (
          <div className="py-1">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  "flex flex-col items-start gap-1 px-4 py-3 cursor-pointer group",
                  "border-b border-[hsl(var(--border-subtle))] last:border-0",
                  !notification.isRead && "bg-accent/5"
                )}
              >
                <div className="flex items-start gap-2 w-full">
                  {!notification.isRead && (
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-accent shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm font-medium truncate",
                        notification.isRead
                          ? "text-[hsl(var(--text-secondary))]"
                          : "text-[hsl(var(--text-primary))]"
                      )}>
                        {notification.title}
                      </span>
                      {notification.link && (
                        <ExternalLink className="h-3 w-3 text-[hsl(var(--text-muted))] shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-[hsl(var(--text-muted))] line-clamp-2 mt-0.5">
                      {notification.message}
                    </p>
                    <span className="text-[10px] text-[hsl(var(--text-muted))] mt-1">
                      {formatTime(notification.createdAt)}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      dismissNotification(notification.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-[hsl(var(--bg-elevated))] text-[hsl(var(--text-muted))] hover:text-red-400 shrink-0"
                    title="Supprimer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationBell;
