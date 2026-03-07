"use client";
export const dynamic = "force-dynamic";

import React, { Suspense, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { NextPage } from "next";
import Link from "next/link";
import NartexLogo from "@/components/nartex-logo";

const LoadingSpinner: React.FC<{ className?: string }> = ({ className = "h-5 w-5 text-white" }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json();
      if (res.ok && body.success) {
        setSent(true);
      } else {
        setError(body.error || "Une erreur est survenue.");
      }
    } catch {
      setError("Erreur de communication avec le serveur.");
    } finally {
      setLoading(false);
    }
  };

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
              {sent ? (
                <>
                  <div className="flex justify-center mb-5">
                    <svg className="w-16 h-16 text-[hsl(var(--accent))]" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <h2 className="text-center text-2xl font-semibold text-[hsl(var(--text-primary))] mb-3">Vérifiez votre boîte de réception</h2>
                  <p className="text-center text-[hsl(var(--text-muted))] text-sm mb-6">
                    Si un compte est associé à <strong className="text-[hsl(var(--text-secondary))]">{email}</strong>, vous recevrez un e-mail avec un lien de réinitialisation. Le lien expirera dans 1 heure.
                  </p>
                  <Link
                    href="/"
                    className="block w-full text-center py-3 px-4 bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--accent-hover))] rounded-lg text-white font-semibold text-sm transition-all shadow-lg"
                  >
                    Retour à la connexion
                  </Link>
                </>
              ) : (
                <>
                  <h2 className="text-center text-2xl font-semibold text-[hsl(var(--text-primary))]">Mot de passe oublié</h2>
                  <p className="text-center text-[hsl(var(--text-tertiary))] text-sm mt-1 mb-6">
                    Entrez votre adresse e-mail pour recevoir un lien de réinitialisation.
                  </p>

                  {error && (
                    <div className="mb-5 bg-[hsl(var(--danger-muted))] border border-[hsl(var(--danger)/0.5)] text-[hsl(var(--danger))] px-4 py-3 rounded-lg text-sm text-center" role="alert">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label htmlFor="email" className="block text-[11px] font-medium text-[hsl(var(--text-muted))] mb-2 uppercase tracking-wider">
                        Adresse e-mail
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="vous@entreprise.com"
                        autoComplete="email"
                        autoFocus
                        className="w-full px-4 py-3 bg-[hsl(var(--bg-surface))]/60 border border-[hsl(var(--border-default))] rounded-lg text-[hsl(var(--text-primary))] placeholder-[hsl(var(--text-muted))] focus:ring-2 focus:ring-[hsl(var(--accent))]/40 focus:border-[hsl(var(--accent))]/40 focus:bg-[hsl(var(--bg-surface))]/70 transition-all text-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full group relative overflow-hidden py-3 px-4 bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--accent-hover))] rounded-lg text-white font-semibold text-sm transition-all shadow-lg hover:shadow-[hsl(var(--accent))]/30 disabled:opacity-50"
                    >
                      <span className="relative z-10 flex items-center justify-center">
                        {loading ? <LoadingSpinner /> : "Envoyer le lien de réinitialisation"}
                      </span>
                    </button>
                  </form>

                  <p className="mt-6 text-center text-[hsl(var(--text-tertiary))] text-[12px]">
                    <Link href="/" className="text-[hsl(var(--accent))] hover:text-[hsl(var(--accent-hover))] font-medium transition-colors">
                      Retour à la connexion
                    </Link>
                  </p>
                </>
              )}
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

const ForgotPasswordPage: NextPage = () => (
  <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-[hsl(var(--bg-base))]"><LoadingSpinner className="h-8 w-8 text-[hsl(var(--accent))]" /></div>}>
    <ForgotPasswordForm />
  </Suspense>
);

export default ForgotPasswordPage;
