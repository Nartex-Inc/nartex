"use client";
export const dynamic = "force-dynamic";

import React, { Suspense, FormEvent, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import type { NextPage } from "next";
import Link from "next/link";
import NartexLogo from "@/components/nartex-logo";

const EyeIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const LoadingSpinner: React.FC<{ className?: string }> = ({ className = "h-5 w-5 text-white" }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <PageShell>
        <div className="flex justify-center mb-5">
          <svg className="w-16 h-16 text-[hsl(var(--danger))]" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-center text-2xl font-semibold text-[hsl(var(--danger))] mb-3">Lien invalide</h2>
        <p className="text-center text-[hsl(var(--text-muted))] text-sm mb-6">
          Ce lien de réinitialisation est invalide ou a déjà été utilisé.
        </p>
        <Link href="/forgot-password" className="block w-full text-center py-3 px-4 bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--accent-hover))] rounded-lg text-white font-semibold text-sm">
          Demander un nouveau lien
        </Link>
      </PageShell>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 12) { setError("Le mot de passe doit comporter au moins 12 caractères."); return; }
    if (!/[A-Z]/.test(password)) { setError("Le mot de passe doit contenir au moins une lettre majuscule."); return; }
    if (!/[a-z]/.test(password)) { setError("Le mot de passe doit contenir au moins une lettre minuscule."); return; }
    if (!/\d/.test(password)) { setError("Le mot de passe doit contenir au moins un chiffre."); return; }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) { setError("Le mot de passe doit contenir au moins un caractère spécial."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, password_confirm: confirmPassword }),
      });
      const body = await res.json();
      if (res.ok && body.success) {
        setSuccess(true);
      } else {
        setError(body.error || "Erreur lors de la réinitialisation.");
      }
    } catch {
      setError("Erreur de communication avec le serveur.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <PageShell>
        <div className="flex justify-center mb-5">
          <svg className="w-16 h-16 text-[hsl(var(--accent))]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-center text-2xl font-semibold text-[hsl(var(--text-primary))] mb-3">Mot de passe réinitialisé</h2>
        <p className="text-center text-[hsl(var(--text-muted))] text-sm mb-6">
          Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.
        </p>
        <Link href="/" className="block w-full text-center py-3 px-4 bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--accent-hover))] rounded-lg text-white font-semibold text-sm">
          Se connecter
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <h2 className="text-center text-2xl font-semibold text-[hsl(var(--text-primary))]">Nouveau mot de passe</h2>
      <p className="text-center text-[hsl(var(--text-tertiary))] text-sm mt-1 mb-6">
        Choisissez un mot de passe fort (12+ caractères, majuscule, minuscule, chiffre, caractère spécial).
      </p>

      {error && (
        <div className="mb-5 bg-[hsl(var(--danger-muted))] border border-[hsl(var(--danger)/0.5)] text-[hsl(var(--danger))] px-4 py-3 rounded-lg text-sm text-center" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="password" className="block text-[11px] font-medium text-[hsl(var(--text-muted))] mb-2 uppercase tracking-wider">
            Nouveau mot de passe
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="12+ caractères"
              autoComplete="new-password"
              className="w-full px-4 py-3 bg-[hsl(var(--bg-surface))]/60 border border-[hsl(var(--border-default))] rounded-lg text-[hsl(var(--text-primary))] placeholder-[hsl(var(--text-muted))] focus:ring-2 focus:ring-[hsl(var(--accent))]/40 focus:border-[hsl(var(--accent))]/40 focus:bg-[hsl(var(--bg-surface))]/70 transition-all pr-12 text-sm"
            />
            <button
              type="button"
              aria-label={showPassword ? "Masquer" : "Afficher"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-secondary))] transition-colors"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-[11px] font-medium text-[hsl(var(--text-muted))] mb-2 uppercase tracking-wider">
            Confirmer le mot de passe
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••••••"
              autoComplete="new-password"
              className="w-full px-4 py-3 bg-[hsl(var(--bg-surface))]/60 border border-[hsl(var(--border-default))] rounded-lg text-[hsl(var(--text-primary))] placeholder-[hsl(var(--text-muted))] focus:ring-2 focus:ring-[hsl(var(--accent))]/40 focus:border-[hsl(var(--accent))]/40 focus:bg-[hsl(var(--bg-surface))]/70 transition-all pr-12 text-sm"
            />
            <button
              type="button"
              aria-label={showConfirmPassword ? "Masquer" : "Afficher"}
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-secondary))] transition-colors"
            >
              {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full group relative overflow-hidden py-3 px-4 bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--accent-hover))] rounded-lg text-white font-semibold text-sm transition-all shadow-lg hover:shadow-[hsl(var(--accent))]/30 disabled:opacity-50"
        >
          <span className="relative z-10 flex items-center justify-center">
            {loading ? <LoadingSpinner /> : "Réinitialiser le mot de passe"}
          </span>
        </button>
      </form>

      <p className="mt-6 text-center text-[hsl(var(--text-tertiary))] text-[12px]">
        <Link href="/" className="text-[hsl(var(--accent))] hover:text-[hsl(var(--accent-hover))] font-medium transition-colors">
          Retour à la connexion
        </Link>
      </p>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 overflow-hidden bg-[hsl(var(--bg-base))] text-[hsl(var(--text-primary))] font-sans antialiased">
      <div className="pointer-events-none absolute inset-0 bg-black/55" />
      <div className="pointer-events-none absolute -top-24 -left-24 w-[36rem] h-[36rem] rounded-full bg-[hsl(var(--accent)/0.12)] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-[36rem] h-[36rem] rounded-full bg-[hsl(var(--accent)/0.12)] blur-3xl" />

      <header className="relative z-10 h-16 px-8">
        <div className="h-full max-w-6xl mx-auto flex items-center">
          <Link href="/" className="relative group">
            <NartexLogo className="relative h-5 w-auto text-foreground/90 group-hover:text-foreground transition-colors" />
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex items-center justify-center" style={{ height: "calc(100dvh - 8rem)" }}>
        <div className="w-full max-w-md px-6">
          <div className="relative">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[hsl(var(--accent)/0.2)] via-[hsl(var(--accent)/0.15)] to-[hsl(var(--accent)/0.2)] blur-xl opacity-70" />
            <div className="relative rounded-2xl border border-[hsl(var(--border-default))]/60 bg-[hsl(var(--bg-base))]/60 backdrop-blur-2xl shadow-2xl shadow-black/30 p-8">
              {children}
            </div>
          </div>
        </div>
      </main>

      <footer className="h-16 px-8 text-center text-xs text-[hsl(var(--text-tertiary))] relative z-10">
        <div className="h-full max-w-6xl mx-auto flex items-center justify-center gap-4 font-mono tracking-widest">
          <span>© {new Date().getFullYear()} NARTEX</span>
        </div>
      </footer>
    </div>
  );
}

const ResetPasswordPage: NextPage = () => (
  <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-[hsl(var(--bg-base))]"><LoadingSpinner className="h-8 w-8 text-[hsl(var(--accent))]" /></div>}>
    <ResetPasswordForm />
  </Suspense>
);

export default ResetPasswordPage;
