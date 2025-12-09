// src/app/dashboard/settings/profile/page.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  User,
  Mail,
  Upload,
  Camera,
  Building2,
  Globe,
  Clock,
  Shield,
  ChevronDown,
  Check,
  X,
  Loader2,
  AlertCircle,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentAccent } from "@/components/accent-color-provider";
import { THEME } from "@/lib/theme-tokens";

/* ═══════════════════════════════════════════════════════════════════════════════
   Constants & Types
   ═══════════════════════════════════════════════════════════════════════════════ */
const COUNTRIES = [
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "US", name: "États-Unis", flag: "🇺🇸" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "BE", name: "Belgique", flag: "🇧🇪" },
  { code: "CH", name: "Suisse", flag: "🇨🇭" },
  { code: "DE", name: "Allemagne", flag: "🇩🇪" },
  { code: "GB", name: "Royaume-Uni", flag: "🇬🇧" },
];

const TIMEZONES = [
  { value: "America/Toronto", label: "Heure de l'Est (EST)", offset: "UTC-05:00" },
  { value: "America/Vancouver", label: "Heure du Pacifique (PST)", offset: "UTC-08:00" },
  { value: "America/Denver", label: "Heure des Rocheuses (MST)", offset: "UTC-07:00" },
  { value: "America/Chicago", label: "Heure Centrale (CST)", offset: "UTC-06:00" },
  { value: "America/Halifax", label: "Heure de l'Atlantique (AST)", offset: "UTC-04:00" },
  { value: "Europe/Paris", label: "Heure de Paris (CET)", offset: "UTC+01:00" },
];

// These should match your Prisma Role enum
const AVAILABLE_ROLES = [
  { id: "admin", name: "Administrateur", description: "Accès complet à toutes les fonctionnalités", color: "#EF4444" },
  { id: "Gestionnaire", name: "Gestionnaire", description: "Gestion des équipes et rapports", color: "#F59E0B" },
  { id: "ventes-exec", name: "Ventes Exécutif", description: "Accès aux données de ventes avancées", color: "#3B82F6" },
  { id: "ventes_exec", name: "Ventes Exécutif (alt)", description: "Accès aux données de ventes avancées", color: "#3B82F6" },
  { id: "Expert", name: "Expert", description: "Accès aux outils d'expertise technique", color: "#8B5CF6" },
  { id: "facturation", name: "Facturation", description: "Accès au module de facturation", color: "#10B981" },
  { id: "user", name: "Utilisateur", description: "Accès standard", color: "#6B7280" },
];

type ProfileFormData = {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department: string;
  country: string;
  timezone: string;
};

/* ═══════════════════════════════════════════════════════════════════════════════
   Custom Select Component
   ═══════════════════════════════════════════════════════════════════════════════ */
function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  renderOption,
  renderValue,
  icon: Icon,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  renderOption?: (option: { value: string; label: string }) => React.ReactNode;
  renderValue?: (option: { value: string; label: string } | undefined) => React.ReactNode;
  icon?: React.ElementType;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const { color: accentColor } = useCurrentAccent();

  const selectedOption = options.find((o) => o.value === value);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200",
          "bg-[hsl(var(--bg-muted))] border border-[hsl(var(--border-subtle))]",
          "hover:border-[hsl(var(--border-default))]",
          "focus:outline-none focus:ring-2 focus:ring-offset-2",
          isOpen && "ring-2 ring-offset-2"
        )}
        style={{
          ...(isOpen && { 
            borderColor: accentColor,
            "--tw-ring-color": accentColor 
          } as React.CSSProperties)
        }}
      >
        {Icon && <Icon className="h-4 w-4 text-[hsl(var(--text-muted))] shrink-0" />}
        <span className={cn(
          "flex-1 text-[14px] truncate",
          selectedOption ? "text-[hsl(var(--text-primary))]" : "text-[hsl(var(--text-muted))]"
        )}>
          {renderValue 
            ? renderValue(selectedOption) 
            : selectedOption?.label || placeholder}
        </span>
        <ChevronDown 
          className={cn(
            "h-4 w-4 text-[hsl(var(--text-muted))] transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
        />
      </button>

      {isOpen && (
        <div 
          className={cn(
            "absolute z-50 w-full mt-2 py-1.5 rounded-xl",
            "bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border-default))]",
            "shadow-xl shadow-black/20 animate-scale-in",
            "max-h-64 overflow-y-auto"
          )}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-left text-[14px] transition-colors",
                "hover:bg-[hsl(var(--bg-elevated))]",
                value === option.value && "bg-[hsl(var(--bg-elevated))]"
              )}
            >
              {renderOption ? renderOption(option) : (
                <>
                  <span className="flex-1 text-[hsl(var(--text-primary))]">{option.label}</span>
                  {value === option.value && (
                    <Check className="h-4 w-4" style={{ color: accentColor }} />
                  )}
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Input Field Component
   ═══════════════════════════════════════════════════════════════════════════════ */
function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon: Icon,
  required = false,
  disabled = false,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ElementType;
  required?: boolean;
  disabled?: boolean;
  helper?: string;
}) {
  const { color: accentColor } = useCurrentAccent();
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1 text-[13px] font-medium text-[hsl(var(--text-secondary))]">
        {label}
        {required && <span style={{ color: accentColor }}>*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon 
            className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors",
              isFocused ? "text-[hsl(var(--text-primary))]" : "text-[hsl(var(--text-muted))]"
            )}
            style={isFocused ? { color: accentColor } : undefined}
          />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full py-3 rounded-xl text-[14px] transition-all duration-200",
            "bg-[hsl(var(--bg-muted))] border border-[hsl(var(--border-subtle))]",
            "text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))]",
            "hover:border-[hsl(var(--border-default))]",
            "focus:outline-none focus:ring-2 focus:ring-offset-2",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            Icon ? "pl-11 pr-4" : "px-4"
          )}
          style={{
            ...(isFocused && { 
              borderColor: accentColor,
              "--tw-ring-color": accentColor 
            } as React.CSSProperties)
          }}
        />
      </div>
      {helper && (
        <p className="text-[12px] text-[hsl(var(--text-muted))]">{helper}</p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Photo Upload Component
   ═══════════════════════════════════════════════════════════════════════════════ */
function PhotoUpload({ 
  currentImage, 
  userName,
  onUpload,
}: { 
  currentImage?: string | null; 
  userName: string;
  onUpload?: (file: File) => void;
}) {
  const { color: accentColor } = useCurrentAccent();
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && onUpload) onUpload(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpload) onUpload(file);
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1 text-[13px] font-medium text-[hsl(var(--text-secondary))]">
        Votre photo
        <span className="text-[hsl(var(--text-muted))] font-normal ml-1">(optionnel)</span>
      </label>
      <p className="text-[12px] text-[hsl(var(--text-muted))]">
        Cette photo sera affichée sur votre profil
      </p>
      
      <div className="flex items-start gap-5 mt-3">
        {/* Current Avatar */}
        <div className="relative group">
          <div 
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-xl font-bold overflow-hidden ring-4 ring-[hsl(var(--bg-muted))]"
            style={{ 
              background: currentImage 
                ? undefined 
                : `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` 
            }}
          >
            {currentImage ? (
              <Image
                src={currentImage}
                alt={userName}
                fill
                className="object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "absolute inset-0 rounded-2xl flex items-center justify-center",
              "bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity",
              "text-white"
            )}
          >
            <Camera className="h-5 w-5" />
          </button>
        </div>

        {/* Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-6 px-4 rounded-xl cursor-pointer transition-all duration-200",
            "border-2 border-dashed",
            isDragging
              ? "border-[var(--accent)] bg-[var(--accent)]/5"
              : "border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-muted))] hover:border-[hsl(var(--border-default))] hover:bg-[hsl(var(--bg-elevated))]"
          )}
          style={{
            "--accent": accentColor,
          } as React.CSSProperties}
        >
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: `${accentColor}15`, color: accentColor }}
          >
            <Upload className="h-5 w-5" />
          </div>
          <p className="text-[13px] font-medium text-[hsl(var(--text-primary))]">
            <span style={{ color: accentColor }}>Cliquez pour téléverser</span>
            {" "}ou glissez-déposez
          </p>
          <p className="text-[12px] text-[hsl(var(--text-muted))] mt-1">
            SVG, PNG, JPG ou GIF (max. 800×400px)
          </p>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Current Role Display (Read-only for non-admins)
   ═══════════════════════════════════════════════════════════════════════════════ */
function CurrentRoleDisplay({ userRole }: { userRole: string }) {
  const roleInfo = AVAILABLE_ROLES.find(r => r.id.toLowerCase() === userRole?.toLowerCase());
  
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[15px] font-semibold text-[hsl(var(--text-primary))]">
          Rôle actuel
        </h3>
        <p className="text-[13px] text-[hsl(var(--text-muted))] mt-1">
          Votre rôle détermine vos permissions dans l&apos;application
        </p>
      </div>

      <div 
        className="flex items-center gap-4 p-4 rounded-xl border-2"
        style={{ borderColor: roleInfo?.color || "#6B7280" }}
      >
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: `${roleInfo?.color || "#6B7280"}20`, color: roleInfo?.color || "#6B7280" }}
        >
          <Shield className="h-6 w-6" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-[hsl(var(--text-primary))]">
            {roleInfo?.name || userRole || "Non défini"}
          </p>
          <p className="text-[12px] text-[hsl(var(--text-muted))] mt-0.5">
            {roleInfo?.description || "Contactez un administrateur pour modifier votre rôle"}
          </p>
        </div>
      </div>

      <p className="text-[12px] text-[hsl(var(--text-muted))] flex items-center gap-2">
        <AlertCircle className="h-3.5 w-3.5" />
        Pour modifier votre rôle, contactez un administrateur ou accédez à la page Rôles & Permissions
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Section Card Component
   ═══════════════════════════════════════════════════════════════════════════════ */
function SectionCard({
  title,
  description,
  children,
  icon: Icon,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: React.ElementType;
}) {
  const { color: accentColor } = useCurrentAccent();

  return (
    <div 
      className="rounded-2xl p-6 transition-all"
      style={{
        background: "hsl(var(--bg-surface))",
        border: "1px solid hsl(var(--border-subtle))",
      }}
    >
      <div className="flex items-start gap-4 mb-6">
        {Icon && (
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${accentColor}15`, color: accentColor }}
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

/* ═══════════════════════════════════════════════════════════════════════════════
   Main Profile Page Component
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function ProfileSettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const { color: accentColor } = useCurrentAccent();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  
  const mode = mounted && resolvedTheme === "light" ? "light" : "dark";

  React.useEffect(() => setMounted(true), []);

  // Form state
  const [formData, setFormData] = React.useState<ProfileFormData>({
    firstName: "",
    lastName: "",
    email: "",
    jobTitle: "",
    department: "",
    country: "CA",
    timezone: "America/Toronto",
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Get user role from session
  const userRole = (session?.user as any)?.role || "user";
  const userId = (session?.user as any)?.id;

  // Initialize form with session data
  React.useEffect(() => {
    if (session?.user) {
      const nameParts = (session.user.name || "").split(" ");
      setFormData((prev) => ({
        ...prev,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        email: session.user?.email || "",
      }));
    }
  }, [session]);

  const updateFormData = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setSaveMessage(null);
  };

  const handleSave = async () => {
    if (!userId) return;
    
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          // Add other fields as needed based on your User model
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update profile");
      }

      // Update the session with new data
      await updateSession({
        user: {
          ...session?.user,
          name: `${formData.firstName} ${formData.lastName}`.trim(),
        },
      });

      setSaveMessage({ type: "success", text: "Profil mis à jour avec succès" });
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      setSaveMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "Erreur lors de la sauvegarde" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (session?.user) {
      const nameParts = (session.user.name || "").split(" ");
      setFormData({
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        email: session.user?.email || "",
        jobTitle: "",
        department: "",
        country: "CA",
        timezone: "America/Toronto",
      });
    }
    setHasChanges(false);
    setSaveMessage(null);
  };

  return (
    <div className="space-y-6">
      {/* Personal Info Section */}
      <SectionCard
        title="Informations personnelles"
        description="Mettez à jour vos informations personnelles et photo de profil"
        icon={User}
      >
        <div className="space-y-6">
          {/* Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Prénom"
              value={formData.firstName}
              onChange={(v) => updateFormData("firstName", v)}
              placeholder="Votre prénom"
              required
            />
            <InputField
              label="Nom"
              value={formData.lastName}
              onChange={(v) => updateFormData("lastName", v)}
              placeholder="Votre nom de famille"
              required
            />
          </div>

          {/* Email */}
          <InputField
            label="Adresse courriel"
            value={formData.email}
            onChange={(v) => updateFormData("email", v)}
            placeholder="votre@email.com"
            type="email"
            icon={Mail}
            required
            disabled
            helper="Le courriel ne peut pas être modifié. Contactez l'administrateur pour le changer."
          />

          {/* Photo Upload */}
          <PhotoUpload
            currentImage={session?.user?.image}
            userName={`${formData.firstName} ${formData.lastName}` || "User"}
          />
        </div>
      </SectionCard>

      {/* Work Info Section */}
      <SectionCard
        title="Informations professionnelles"
        description="Détails sur votre poste et département"
        icon={Building2}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Poste / Titre"
              value={formData.jobTitle}
              onChange={(v) => updateFormData("jobTitle", v)}
              placeholder="Ex: Directeur des ventes"
            />
            <InputField
              label="Département"
              value={formData.department}
              onChange={(v) => updateFormData("department", v)}
              placeholder="Ex: Ventes & Marketing"
            />
          </div>
        </div>
      </SectionCard>

      {/* Current Role Display (Read-only) */}
      <SectionCard
        title="Contrôle d'accès"
        description="Votre rôle et permissions dans le système"
        icon={Shield}
      >
        <CurrentRoleDisplay userRole={userRole} />
      </SectionCard>

      {/* Locale Section */}
      <SectionCard
        title="Localisation"
        description="Définissez votre pays et fuseau horaire"
        icon={Globe}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-[hsl(var(--text-secondary))]">
              Pays
            </label>
            <CustomSelect
              value={formData.country}
              onChange={(v) => updateFormData("country", v)}
              options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
              placeholder="Sélectionnez un pays"
              icon={Globe}
              renderOption={(option) => {
                const country = COUNTRIES.find((c) => c.code === option.value);
                return (
                  <>
                    <span className="text-lg">{country?.flag}</span>
                    <span className="flex-1 text-[hsl(var(--text-primary))]">{option.label}</span>
                    {formData.country === option.value && (
                      <Check className="h-4 w-4" style={{ color: accentColor }} />
                    )}
                  </>
                );
              }}
              renderValue={(option) => {
                if (!option) return null;
                const country = COUNTRIES.find((c) => c.code === option.value);
                return (
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{country?.flag}</span>
                    {option.label}
                  </span>
                );
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-medium text-[hsl(var(--text-secondary))]">
              Fuseau horaire
            </label>
            <CustomSelect
              value={formData.timezone}
              onChange={(v) => updateFormData("timezone", v)}
              options={TIMEZONES.map((tz) => ({ value: tz.value, label: tz.label }))}
              placeholder="Sélectionnez un fuseau horaire"
              icon={Clock}
              renderOption={(option) => {
                const tz = TIMEZONES.find((t) => t.value === option.value);
                return (
                  <>
                    <span className="flex-1">
                      <span className="text-[hsl(var(--text-primary))]">{option.label}</span>
                      <span className="text-[12px] text-[hsl(var(--text-muted))] ml-2">{tz?.offset}</span>
                    </span>
                    {formData.timezone === option.value && (
                      <Check className="h-4 w-4" style={{ color: accentColor }} />
                    )}
                  </>
                );
              }}
            />
          </div>
        </div>
      </SectionCard>

      {/* Save Message */}
      {saveMessage && (
        <div 
          className={cn(
            "flex items-center gap-2 p-3 rounded-lg",
            saveMessage.type === "success" 
              ? "bg-emerald-500/10 border border-emerald-500/20" 
              : "bg-red-500/10 border border-red-500/20"
          )}
        >
          {saveMessage.type === "success" ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <X className="h-4 w-4 text-red-500" />
          )}
          <p className={cn(
            "text-[13px]",
            saveMessage.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          )}>
            {saveMessage.text}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div 
        className="flex items-center justify-end gap-3 pt-4 border-t"
        style={{ borderColor: "hsl(var(--border-subtle))" }}
      >
        <button
          type="button"
          onClick={handleCancel}
          disabled={!hasChanges || isSaving}
          className={cn(
            "px-5 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200",
            "bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-secondary))]",
            "hover:bg-[hsl(var(--bg-elevated))] hover:text-[hsl(var(--text-primary))]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all duration-200",
            "hover:opacity-90 hover:scale-[1.02]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          )}
          style={{ background: accentColor }}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Enregistrer
            </>
          )}
        </button>
      </div>
    </div>
  );
}
