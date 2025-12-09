"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useCurrentAccent } from "@/components/accent-color-provider";
import {
  User,
  Mail,
  Camera,
  Shield,
  ChevronDown,
  Check,
  Loader2,
  AlertCircle,
  Save,
  Crown,
  BarChart3,
  CheckCircle,
  Receipt,
  Sparkles,
} from "lucide-react";

// ============================================================================
// CONFIGURATION
// ============================================================================

const AVAILABLE_ROLES = [
  { value: "Gestionnaire", label: "Gestionnaire", description: "Accès complet", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: Crown },
  { value: "Analyste", label: "Analyste", description: "Rapports et analyses", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: BarChart3 },
  { value: "Verificateur", label: "Vérificateur", description: "Validation", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle },
  { value: "Facturation", label: "Facturation", description: "Facturation et crédits", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Receipt },
  { value: "Expert", label: "Expert", description: "Retours terrain", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30", icon: Sparkles },
  { value: "user", label: "Utilisateur", description: "Accès standard", color: "bg-slate-500/20 text-slate-400 border-slate-500/30", icon: User },
] as const;

function getRoleConfig(roleValue: string) {
  return AVAILABLE_ROLES.find((r) => r.value === roleValue) || AVAILABLE_ROLES[5];
}

// ============================================================================
// COMPONENTS
// ============================================================================

function SectionCard({ title, description, icon: Icon, children, accentColor }: {
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
  accentColor: string;
}) {
  return (
    <div className="bg-[#1a1a2e]/80 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accentColor}20` }}>
            <Icon className="w-5 h-5" style={{ color: accentColor }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {description && <p className="text-sm text-white/50">{description}</p>}
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function InputField({ label, icon: Icon, value, onChange, placeholder, disabled, type = "text" }: {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/70 mb-2">{label}</label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        />
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const config = getRoleConfig(role);
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${config.color}`}>
      <Icon className="w-4 h-4" />
      {config.label}
    </span>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const { color: accentColor } = useCurrentAccent();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState("");
  const [role, setRole] = useState("Expert");

  // Load profile data
  useEffect(() => {
    async function loadProfile() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/user/profile");
        if (!response.ok) throw new Error("Erreur lors du chargement");
        const data = await response.json();
        
        setName(data.name || "");
        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
        setEmail(data.email || "");
        setImage(data.image || "");
        setRole(data.role || "Expert");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, []);

  // Save profile
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, firstName, lastName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la sauvegarde");
      }

      // Update session
      await update({ name });
      
      setSuccessMessage("Profil mis à jour avec succès");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-white/50 mb-4" />
        <p className="text-white/50">Chargement du profil...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Mon profil</h1>
        <p className="text-white/50 mt-1">Gérez vos informations personnelles</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30` }}>
          <Check className="w-5 h-5 flex-shrink-0" style={{ color: accentColor }} />
          <p className="text-sm" style={{ color: accentColor }}>{successMessage}</p>
        </div>
      )}

      {/* Photo Section */}
      <SectionCard title="Photo de profil" icon={Camera} accentColor={accentColor}>
        <div className="flex items-center gap-6">
          <div className="relative">
            {image ? (
              <img src={image} alt={name} className="w-24 h-24 rounded-2xl object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-2xl font-medium" style={{ backgroundColor: `${accentColor}40` }}>
                {name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
          </div>
          <div>
            <p className="text-white font-medium">{name || "Utilisateur"}</p>
            <p className="text-white/50 text-sm">{email}</p>
            <div className="mt-2">
              <RoleBadge role={role} />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Personal Info */}
      <SectionCard title="Informations personnelles" icon={User} accentColor={accentColor}>
        <div className="grid md:grid-cols-2 gap-6">
          <InputField
            label="Nom complet"
            icon={User}
            value={name}
            onChange={setName}
            placeholder="Votre nom"
          />
          <InputField
            label="Email"
            icon={Mail}
            value={email}
            onChange={() => {}}
            disabled
          />
          <InputField
            label="Prénom"
            icon={User}
            value={firstName}
            onChange={setFirstName}
            placeholder="Votre prénom"
          />
          <InputField
            label="Nom de famille"
            icon={User}
            value={lastName}
            onChange={setLastName}
            placeholder="Votre nom de famille"
          />
        </div>

        <div className="mt-6 pt-6 border-t border-white/10 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all disabled:opacity-50"
            style={{ backgroundColor: accentColor }}
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </SectionCard>

      {/* Role Info (Read-only) */}
      <SectionCard title="Rôle et permissions" icon={Shield} accentColor={accentColor}>
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
          <div>
            <p className="text-white font-medium">Votre rôle actuel</p>
            <p className="text-white/50 text-sm mt-1">
              {getRoleConfig(role).description}
            </p>
          </div>
          <RoleBadge role={role} />
        </div>
        <p className="text-white/40 text-sm mt-4">
          Contactez un administrateur pour modifier votre rôle.
        </p>
      </SectionCard>
    </div>
  );
}
