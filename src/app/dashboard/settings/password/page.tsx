// src/app/dashboard/settings/password/page.tsx
"use client";

import * as React from "react";
import { Key, Eye, EyeOff, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentAccent } from "@/components/accent-color-provider";

function PasswordInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [showPassword, setShowPassword] = React.useState(false);
  const { color: accentColor } = useCurrentAccent();

  return (
    <div className="space-y-2">
      <label className="text-[13px] font-medium text-[hsl(var(--text-secondary))]">
        {label}
      </label>
      <div className="relative">
        <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--text-muted))]" />
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full pl-11 pr-11 py-3 rounded-xl text-[14px]",
            "bg-[hsl(var(--bg-muted))] border border-[hsl(var(--border-subtle))]",
            "text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))]",
            "focus:outline-none focus:ring-2 focus:border-transparent"
          )}
          style={{ "--tw-ring-color": accentColor } as React.CSSProperties}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] transition-colors"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "Au moins 8 caractères", valid: password.length >= 8 },
    { label: "Une lettre majuscule", valid: /[A-Z]/.test(password) },
    { label: "Une lettre minuscule", valid: /[a-z]/.test(password) },
    { label: "Un chiffre", valid: /\d/.test(password) },
    { label: "Un caractère spécial", valid: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const strength = checks.filter((c) => c.valid).length;
  const { color: accentColor } = useCurrentAccent();

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{
              background: i <= strength ? accentColor : "hsl(var(--bg-muted))",
            }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2">
            {check.valid ? (
              <Check className="h-3.5 w-3.5" style={{ color: accentColor }} />
            ) : (
              <X className="h-3.5 w-3.5 text-[hsl(var(--text-muted))]" />
            )}
            <span
              className={cn(
                "text-[12px]",
                check.valid ? "text-[hsl(var(--text-primary))]" : "text-[hsl(var(--text-muted))]"
              )}
            >
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PasswordSettingsPage() {
  const { color: accentColor } = useCurrentAccent();
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const canSubmit =
    currentPassword &&
    newPassword &&
    confirmPassword &&
    newPassword === confirmPassword &&
    newPassword.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="max-w-xl">
      <div
        className="rounded-2xl p-6"
        style={{
          background: "hsl(var(--bg-surface))",
          border: "1px solid hsl(var(--border-subtle))",
        }}
      >
        <div className="flex items-start gap-4 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${accentColor}15`, color: accentColor }}
          >
            <Key className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-[hsl(var(--text-primary))]">
              Changer le mot de passe
            </h2>
            <p className="text-[13px] text-[hsl(var(--text-muted))] mt-0.5">
              Assurez-vous d&apos;utiliser un mot de passe fort et unique
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <PasswordInput
            label="Mot de passe actuel"
            value={currentPassword}
            onChange={setCurrentPassword}
            placeholder="Entrez votre mot de passe actuel"
          />

          <PasswordInput
            label="Nouveau mot de passe"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Entrez un nouveau mot de passe"
          />

          {newPassword && <PasswordStrength password={newPassword} />}

          <PasswordInput
            label="Confirmer le mot de passe"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Confirmez le nouveau mot de passe"
          />

          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-[12px] text-[hsl(var(--danger))]">
              Les mots de passe ne correspondent pas
            </p>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={!canSubmit || isLoading}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all",
                "hover:opacity-90",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              style={{ background: accentColor }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                "Mettre à jour"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
