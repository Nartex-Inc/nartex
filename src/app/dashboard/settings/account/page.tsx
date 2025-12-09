// src/app/dashboard/settings/account/page.tsx
"use client";

import * as React from "react";
import { 
  Settings, 
  Bell, 
  Shield, 
  Globe, 
  Key,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentAccent } from "@/components/accent-color-provider";

function SectionCard({
  title,
  description,
  children,
  icon: Icon,
  danger = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: React.ElementType;
  danger?: boolean;
}) {
  const { color: accentColor } = useCurrentAccent();
  const iconColor = danger ? "#EF4444" : accentColor;

  return (
    <div 
      className="rounded-2xl p-6 transition-all"
      style={{
        background: "hsl(var(--bg-surface))",
        border: danger ? "1px solid hsl(var(--danger) / 0.3)" : "1px solid hsl(var(--border-subtle))",
      }}
    >
      <div className="flex items-start gap-4 mb-6">
        {Icon && (
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${iconColor}15`, color: iconColor }}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h2 className="text-[15px] font-semibold text-[hsl(var(--text-primary))]">
            {title}
          </h2>
          {description && (
            <p className="text-[13px] text-[hsl(var(--text-muted))] mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function ToggleSwitch({
  enabled,
  onChange,
  label,
  description,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
  description?: string;
}) {
  const { color: accentColor } = useCurrentAccent();

  return (
    <label className="flex items-start gap-4 cursor-pointer">
      <button
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5",
          enabled ? "" : "bg-[hsl(var(--bg-muted))] border border-[hsl(var(--border-default))]"
        )}
        style={enabled ? { background: accentColor } : undefined}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
            enabled && "translate-x-5"
          )}
        />
      </button>
      <div>
        <p className="text-[14px] font-medium text-[hsl(var(--text-primary))]">{label}</p>
        {description && (
          <p className="text-[12px] text-[hsl(var(--text-muted))] mt-0.5">{description}</p>
        )}
      </div>
    </label>
  );
}

export default function AccountSettingsPage() {
  const { color: accentColor } = useCurrentAccent();
  const [twoFactorEnabled, setTwoFactorEnabled] = React.useState(false);
  const [sessionAlerts, setSessionAlerts] = React.useState(true);
  const [marketingEmails, setMarketingEmails] = React.useState(false);

  return (
    <div className="space-y-6">
      {/* Security Section */}
      <SectionCard
        title="Sécurité"
        description="Gérez vos paramètres de sécurité et authentification"
        icon={Shield}
      >
        <div className="space-y-6">
          <ToggleSwitch
            enabled={twoFactorEnabled}
            onChange={setTwoFactorEnabled}
            label="Authentification à deux facteurs"
            description="Ajoutez une couche de sécurité supplémentaire à votre compte"
          />
          <ToggleSwitch
            enabled={sessionAlerts}
            onChange={setSessionAlerts}
            label="Alertes de connexion"
            description="Recevez une notification lors d'une nouvelle connexion"
          />
        </div>
      </SectionCard>

      {/* Preferences Section */}
      <SectionCard
        title="Préférences"
        description="Personnalisez votre expérience"
        icon={Settings}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-[hsl(var(--text-secondary))]">
              Langue de l&apos;interface
            </label>
            <select
              className={cn(
                "w-full max-w-xs px-4 py-3 rounded-xl text-[14px]",
                "bg-[hsl(var(--bg-muted))] border border-[hsl(var(--border-subtle))]",
                "text-[hsl(var(--text-primary))]",
                "focus:outline-none focus:ring-2"
              )}
              defaultValue="fr"
            >
              <option value="fr">🇫🇷 Français</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </div>
          <ToggleSwitch
            enabled={marketingEmails}
            onChange={setMarketingEmails}
            label="Communications marketing"
            description="Recevoir des emails sur les nouveautés et offres"
          />
        </div>
      </SectionCard>

      {/* Sessions Section */}
      <SectionCard
        title="Sessions actives"
        description="Gérez vos sessions de connexion"
        icon={Key}
      >
        <div className="space-y-4">
          <div 
            className="flex items-center justify-between p-4 rounded-xl"
            style={{ background: "hsl(var(--bg-muted))" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[hsl(var(--bg-elevated))] flex items-center justify-center">
                <Globe className="h-5 w-5 text-[hsl(var(--text-muted))]" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-[hsl(var(--text-primary))]">
                  Chrome sur Windows
                </p>
                <p className="text-[12px] text-[hsl(var(--text-muted))]">
                  Toronto, Canada • Session actuelle
                </p>
              </div>
            </div>
            <span 
              className="px-2 py-1 rounded-md text-[11px] font-medium text-white"
              style={{ background: accentColor }}
            >
              Active
            </span>
          </div>
          
          <button
            className={cn(
              "text-[13px] font-medium transition-colors",
              "text-[hsl(var(--danger))] hover:underline"
            )}
          >
            Déconnecter toutes les autres sessions
          </button>
        </div>
      </SectionCard>

      {/* Danger Zone */}
      <SectionCard
        title="Zone de danger"
        description="Actions irréversibles sur votre compte"
        icon={AlertTriangle}
        danger
      >
        <div className="space-y-4">
          <p className="text-[13px] text-[hsl(var(--text-muted))]">
            Une fois votre compte supprimé, toutes vos données seront définitivement effacées.
            Cette action est irréversible.
          </p>
          <button
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all",
              "bg-[hsl(var(--danger))]/10 text-[hsl(var(--danger))]",
              "hover:bg-[hsl(var(--danger))]/20"
            )}
          >
            <Trash2 className="h-4 w-4" />
            Supprimer mon compte
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
