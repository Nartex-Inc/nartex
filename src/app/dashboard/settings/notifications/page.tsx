// src/app/dashboard/settings/notifications/page.tsx
"use client";

import * as React from "react";
import { Bell, Mail, MessageSquare, AlertTriangle, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentAccent } from "@/components/accent-color-provider";

const NOTIFICATION_CATEGORIES = [
  {
    id: "sales",
    title: "Ventes",
    description: "Notifications liées aux activités de vente",
    icon: TrendingUp,
    notifications: [
      { id: "new_sale", label: "Nouvelle vente", email: true, push: true, app: true },
      { id: "sale_target", label: "Objectif de vente atteint", email: true, push: true, app: true },
      { id: "client_activity", label: "Activité client", email: false, push: true, app: true },
    ],
  },
  {
    id: "team",
    title: "Équipe",
    description: "Mises à jour de l'équipe et collaborations",
    icon: Users,
    notifications: [
      { id: "team_mention", label: "Mention dans une conversation", email: true, push: true, app: true },
      { id: "team_join", label: "Nouveau membre d'équipe", email: true, push: false, app: true },
      { id: "task_assigned", label: "Tâche assignée", email: true, push: true, app: true },
    ],
  },
  {
    id: "system",
    title: "Système",
    description: "Alertes et mises à jour système",
    icon: AlertTriangle,
    notifications: [
      { id: "security_alert", label: "Alertes de sécurité", email: true, push: true, app: true },
      { id: "maintenance", label: "Maintenance planifiée", email: true, push: false, app: true },
      { id: "updates", label: "Mises à jour produit", email: false, push: false, app: true },
    ],
  },
];

function NotificationToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const { color: accentColor } = useCurrentAccent();

  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative w-9 h-5 rounded-full transition-colors shrink-0",
        enabled ? "" : "bg-[hsl(var(--bg-muted))] border border-[hsl(var(--border-default))]"
      )}
      style={enabled ? { background: accentColor } : undefined}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
          enabled && "translate-x-4"
        )}
      />
    </button>
  );
}

export default function NotificationsSettingsPage() {
  const { color: accentColor } = useCurrentAccent();
  const [settings, setSettings] = React.useState(() => {
    const initial: Record<string, { email: boolean; push: boolean; app: boolean }> = {};
    NOTIFICATION_CATEGORIES.forEach((cat) => {
      cat.notifications.forEach((n) => {
        initial[n.id] = { email: n.email, push: n.push, app: n.app };
      });
    });
    return initial;
  });

  const toggleSetting = (id: string, type: "email" | "push" | "app") => {
    setSettings((prev) => ({
      ...prev,
      [id]: { ...prev[id], [type]: !prev[id][type] },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header Legend */}
      <div
        className="flex items-center gap-6 p-4 rounded-xl"
        style={{ background: "hsl(var(--bg-muted))" }}
      >
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-[hsl(var(--text-muted))]" />
          <span className="text-[13px] text-[hsl(var(--text-secondary))]">Email</span>
        </div>
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[hsl(var(--text-muted))]" />
          <span className="text-[13px] text-[hsl(var(--text-secondary))]">Push</span>
        </div>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[hsl(var(--text-muted))]" />
          <span className="text-[13px] text-[hsl(var(--text-secondary))]">In-App</span>
        </div>
      </div>

      {/* Categories */}
      {NOTIFICATION_CATEGORIES.map((category) => {
        const Icon = category.icon;
        return (
          <div
            key={category.id}
            className="rounded-2xl overflow-hidden"
            style={{
              background: "hsl(var(--bg-surface))",
              border: "1px solid hsl(var(--border-subtle))",
            }}
          >
            {/* Category Header */}
            <div
              className="flex items-center gap-4 p-4"
              style={{ borderBottom: "1px solid hsl(var(--border-subtle))" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${accentColor}15`, color: accentColor }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-[hsl(var(--text-primary))]">
                  {category.title}
                </h3>
                <p className="text-[12px] text-[hsl(var(--text-muted))]">
                  {category.description}
                </p>
              </div>
            </div>

            {/* Notifications */}
            <div className="divide-y divide-[hsl(var(--border-subtle))]">
              {category.notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-center justify-between p-4 hover:bg-[hsl(var(--bg-muted))] transition-colors"
                >
                  <span className="text-[14px] text-[hsl(var(--text-primary))]">
                    {notification.label}
                  </span>
                  <div className="flex items-center gap-6">
                    <NotificationToggle
                      enabled={settings[notification.id]?.email ?? false}
                      onChange={() => toggleSetting(notification.id, "email")}
                    />
                    <NotificationToggle
                      enabled={settings[notification.id]?.push ?? false}
                      onChange={() => toggleSetting(notification.id, "push")}
                    />
                    <NotificationToggle
                      enabled={settings[notification.id]?.app ?? false}
                      onChange={() => toggleSetting(notification.id, "app")}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
