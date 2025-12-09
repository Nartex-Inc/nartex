// src/app/dashboard/settings/integrations/page.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { Plug, Check, ExternalLink, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentAccent } from "@/components/accent-color-provider";

const INTEGRATIONS = [
  {
    id: "google-workspace",
    name: "Google Workspace",
    description: "Synchronisation avec Gmail, Drive et Calendar",
    icon: "/integrations/google.svg",
    connected: true,
    category: "Productivité",
  },
  {
    id: "microsoft-365",
    name: "Microsoft 365",
    description: "Intégration avec Outlook, OneDrive et Teams",
    icon: "/integrations/microsoft.svg",
    connected: true,
    category: "Productivité",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Notifications et collaboration en temps réel",
    icon: "/integrations/slack.svg",
    connected: false,
    category: "Communication",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Synchronisation CRM et données clients",
    icon: "/integrations/salesforce.svg",
    connected: false,
    category: "CRM",
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    description: "Intégration comptable et facturation",
    icon: "/integrations/quickbooks.svg",
    connected: true,
    category: "Finance",
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "Synchronisation e-commerce et inventaire",
    icon: "/integrations/shopify.svg",
    connected: false,
    category: "E-commerce",
  },
];

export default function IntegrationsSettingsPage() {
  const { color: accentColor } = useCurrentAccent();
  const [integrations, setIntegrations] = React.useState(INTEGRATIONS);

  const toggleConnection = (id: string) => {
    setIntegrations((prev) =>
      prev.map((int) =>
        int.id === id ? { ...int, connected: !int.connected } : int
      )
    );
  };

  const connectedCount = integrations.filter((i) => i.connected).length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div
        className="flex items-center gap-4 p-4 rounded-xl"
        style={{
          background: `${accentColor}10`,
          border: `1px solid ${accentColor}30`,
        }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: `${accentColor}20`, color: accentColor }}
        >
          <Plug className="h-6 w-6" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-[hsl(var(--text-primary))]">
            {connectedCount} intégrations actives
          </p>
          <p className="text-[13px] text-[hsl(var(--text-muted))]">
            sur {integrations.length} disponibles
          </p>
        </div>
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className={cn(
              "rounded-2xl p-5 transition-all",
              integration.connected ? "ring-2" : ""
            )}
            style={{
              background: "hsl(var(--bg-surface))",
              border: "1px solid hsl(var(--border-subtle))",
              ...(integration.connected && { "--tw-ring-color": accentColor } as React.CSSProperties),
            }}
          >
            <div className="flex items-start gap-4">
              {/* Icon Placeholder */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "hsl(var(--bg-muted))" }}
              >
                <Plug className="h-6 w-6 text-[hsl(var(--text-muted))]" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] font-semibold text-[hsl(var(--text-primary))]">
                    {integration.name}
                  </h3>
                  {integration.connected && (
                    <span
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-white"
                      style={{ background: accentColor }}
                    >
                      <Check className="h-3 w-3" />
                      Connecté
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[hsl(var(--text-muted))] mt-1">
                  {integration.description}
                </p>
                <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-medium bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-muted))]">
                  {integration.category}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[hsl(var(--border-subtle))]">
              {integration.connected ? (
                <>
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-elevated))] transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Configurer
                  </button>
                  <button
                    onClick={() => toggleConnection(integration.id)}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger))]/10 transition-colors"
                  >
                    Déconnecter
                  </button>
                </>
              ) : (
                <button
                  onClick={() => toggleConnection(integration.id)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-colors hover:opacity-90"
                  style={{ background: accentColor }}
                >
                  <Plug className="h-3.5 w-3.5" />
                  Connecter
                </button>
              )}
              <button className="ml-auto p-1.5 rounded-lg text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-muted))] transition-colors">
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
