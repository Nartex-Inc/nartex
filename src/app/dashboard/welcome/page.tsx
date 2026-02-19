"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { useCurrentAccent } from "@/components/accent-color-provider";

const ROLE_LABELS: Record<string, string> = {
  Gestionnaire: "Gestionnaire",
  Analyste: "Analyste",
  Verificateur: "Vérificateur",
  Facturation: "Facturation",
  Expert: "Expert",
  user: "Utilisateur",
};

export default function WelcomePage() {
  const { data: session } = useSession();
  const { color: accentColor } = useCurrentAccent();
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get("invitation");

  const [tenantName, setTenantName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!invitationToken);

  useEffect(() => {
    if (!invitationToken) return;

    fetch(`/api/invitations/${invitationToken}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setTenantName(data.tenantName);
          setRole(data.role);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [invitationToken]);

  const sessionRole = (session?.user as any)?.role as string | undefined;
  const displayRole = role ? ROLE_LABELS[role] || role : sessionRole ? ROLE_LABELS[sessionRole] || sessionRole : null;
  const displayName = session?.user?.name || session?.user?.email || "";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--text-muted))]" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Success checkmark */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
          style={{ backgroundColor: `${accentColor}20` }}
        >
          <CheckCircle className="w-10 h-10" style={{ color: accentColor }} />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[hsl(var(--text-primary))]">
            Bienvenue sur Nartex !
          </h1>
          {displayName && (
            <p className="text-lg text-[hsl(var(--text-secondary))]">
              Bonjour, {displayName}
            </p>
          )}
        </div>

        {/* Tenant & role info */}
        <div className="space-y-3">
          {tenantName && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(var(--bg-elevated))] border border-[hsl(var(--border-subtle))]">
              <span className="text-sm text-[hsl(var(--text-muted))]">Organisation :</span>
              <span className="text-sm font-medium text-[hsl(var(--text-primary))]">{tenantName}</span>
            </div>
          )}
          {displayRole && (
            <div className="block">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(var(--bg-elevated))] border border-[hsl(var(--border-subtle))]">
                <span className="text-sm text-[hsl(var(--text-muted))]">Rôle :</span>
                <span className="text-sm font-medium text-[hsl(var(--text-primary))]">{displayRole}</span>
              </span>
            </div>
          )}
        </div>

        {/* CTA */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90"
          style={{ backgroundColor: accentColor }}
        >
          Aller au tableau de bord
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
