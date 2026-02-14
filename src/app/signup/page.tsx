"use client";
export const dynamic = "force-dynamic";

import React, { Suspense, FormEvent, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { NextPage } from "next";
import Link from "next/link";
import { signIn } from "next-auth/react";
import NartexLogo from "@/components/nartex-logo";

/* ---------------- Icons (same as Login) ---------------- */
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
const GoogleIcon: React.FC<{ width?: number; height?: number; className?: string }> = ({ width = 18, height = 18, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width={width} height={height} className={className}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);
const MicrosoftIcon: React.FC<{ width?: number; height?: number; className?: string }> = ({ width = 18, height = 18, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" width={width} height={height} className={className}>
    <path d="M11 0H0v11h11V0z" fill="#f25022" />
    <path d="M23 0H12v11h11V0z" fill="#7fba00" />
    <path d="M11 12H0v11h11V12z" fill="#00a4ef" />
    <path d="M23 12H12v11h11V12z" fill="#ffb900" />
  </svg>
);
const LoadingSpinner: React.FC<{ className?: string }> = ({ className = "h-5 w-5 text-white" }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

/* ---------------- Particle field (same as Login) ---------------- */
const ParticleField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let raf = 0;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();

    type P = { x: number; y: number; vx: number; vy: number; r: number; o: number; };
    const dots: P[] = Array.from({ length: Math.max(80, Math.floor((window.innerWidth * window.innerHeight) / 40000)) }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1.1 + 0.4,
      o: Math.random() * 0.18 + 0.08,
    }));
    const linkDist = 150;

    type S = { x: number; y: number; s: number; phase: number; speed: number; driftX: number; driftY: number };
    const stars: S[] = Array.from({ length: 36 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      s: Math.random() * 1.2 + 0.6,
      phase: Math.random() * Math.PI * 2,
      speed: 0.002 + Math.random() * 0.003,
      driftX: (Math.random() - 0.5) * 0.05,
      driftY: (Math.random() - 0.5) * 0.05,
    }));

    const drawStar = (s: S, t: number) => {
      const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      const size = s.s * 2;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.globalAlpha = a * 0.85;
      ctx.strokeStyle = "rgba(16,185,129,0.85)";
      ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(-size, 0); ctx.lineTo(size, 0); ctx.moveTo(0, -size); ctx.lineTo(0, size); ctx.stroke();
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.7);
      grd.addColorStop(0, "rgba(110,231,183,0.7)");
      grd.addColorStop(1, "rgba(110,231,183,0)");
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(0, 0, size * 1.7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };

    const step: FrameRequestCallback = (ts) => {
      ctx.fillStyle = "rgba(24,24,27,0.12)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < dots.length; i++) {
        const p = dots[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(110,231,183,${p.o})`;
        ctx.fill();

        for (let j = i + 1; j < dots.length; j++) {
          const q = dots[j];
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < linkDist) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(52,211,153,${(1 - d / linkDist) * 0.12})`;
            ctx.lineWidth = 0.35;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }

      for (const s of stars) {
        s.x += s.driftX; s.y += s.driftY;
        if (s.x < -10) s.x = canvas.width + 10;
        if (s.x > canvas.width + 10) s.x = -10;
        if (s.y < -10) s.y = canvas.height + 10;
        if (s.y > canvas.height + 10) s.y = -10;
        drawStar(s, ts);
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 -z-10 pointer-events-none" />;
};

/* ---------------- Signup ---------------- */
function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) return setError("Les mots de passe ne correspondent pas.");
    if (password.length < 8) return setError("Le mot de passe doit comporter au moins 8 caractères.");

    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, password_confirm: confirmPassword }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body.error || "Impossible de créer le compte. Veuillez réessayer.");
      } else {
        router.push("/?emailVerificationSent=true");
      }
    } catch (err) {
      setError("Une erreur s'est produite lors de la communication avec le serveur.");
    } finally {
      setLoading(false);
    }
  };

  const handleSSOSignUp = (provider: "google" | "azure-ad") => {
    setLoading(true);
    setError(null);
    signIn(provider, { callbackUrl: "/dashboard" });
  };

  return (
    /* Non-scrollable viewport */
    <div className="fixed inset-0 overflow-hidden bg-[hsl(var(--bg-base))] text-[hsl(var(--text-primary))] font-sans antialiased">
      <ParticleField />

      {/* Soft overlay & spotlights identical to Login */}
      <div className="pointer-events-none absolute inset-0 -z-[5] bg-black/55" />
      <div className="pointer-events-none absolute -top-24 -left-24 w-[36rem] h-[36rem] rounded-full bg-[hsl(var(--accent)/0.12)] blur-3xl -z-[4]" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-[36rem] h-[36rem] rounded-full bg-[hsl(var(--accent)/0.12)] blur-3xl -z-[4]" />

      {/* Header */}
      <header className="relative z-10 h-16 px-8">
        <div className="h-full max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--accent-hover))] rounded-lg blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
            <NartexLogo className="relative h-5 w-auto text-foreground/90 group-hover:text-foreground transition-colors" />
          </Link>
          <div className="hidden md:flex items-center gap-3 text-xs text-[hsl(var(--text-tertiary))]">
            <span className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--accent))] animate-pulse" />
              <span>Plateforme de gestion d'entreprise unifiée</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main grid: swapped (form LEFT, messaging RIGHT) */}
      <main className="relative z-10 h-[calc(100dvh-4rem)]">
        <div className="h-full max-w-6xl mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* LEFT: Signup Card (visible on all breakpoints) */}
          <section className="w-full">
            <div className="relative">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[hsl(var(--accent)/0.2)] via-[hsl(var(--accent)/0.15)] to-[hsl(var(--accent)/0.2)] blur-xl opacity-70" />
              <div className="relative rounded-2xl border border-[hsl(var(--border-default))]/60 bg-[hsl(var(--bg-base))]/60 backdrop-blur-2xl shadow-2xl shadow-black/30 p-8">
                <h2 className="text-center text-2xl font-semibold text-[hsl(var(--text-primary))]">Créer un compte</h2>
                <p className="text-center text-[hsl(var(--text-tertiary))] text-sm mt-1">Utilisez votre e-mail ou un fournisseur SSO.</p>

                {error && (
                  <div className="mt-6 bg-[hsl(var(--danger-muted))] border border-[hsl(var(--danger)/0.5)] text-[hsl(var(--danger))] px-4 py-3 rounded-lg text-sm text-center" role="alert">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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
                      className="w-full px-4 py-3 bg-[hsl(var(--bg-surface))]/60 border border-[hsl(var(--border-default))] rounded-lg text-[hsl(var(--text-primary))] placeholder-[hsl(var(--text-muted))] focus:ring-2 focus:ring-[hsl(var(--accent))]/40 focus:border-[hsl(var(--accent))]/40 focus:bg-[hsl(var(--bg-surface))]/70 transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-[11px] font-medium text-[hsl(var(--text-muted))] mb-2 uppercase tracking-wider">
                      Mot de passe
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="8+ caractères"
                        autoComplete="new-password"
                        className="w-full px-4 py-3 bg-[hsl(var(--bg-surface))]/60 border border-[hsl(var(--border-default))] rounded-lg text-[hsl(var(--text-primary))] placeholder-[hsl(var(--text-muted))] focus:ring-2 focus:ring-[hsl(var(--accent))]/40 focus:border-[hsl(var(--accent))]/40 focus:bg-[hsl(var(--bg-surface))]/70 transition-all pr-12 text-sm"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
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
                        aria-label={showConfirmPassword ? "Masquer le mot de passe confirmé" : "Afficher le mot de passe confirmé"}
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
                      {loading ? <LoadingSpinner /> : "Créer le compte"}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-t from-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[hsl(var(--border-default))]" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 bg-[hsl(var(--bg-base))]/60 text-[hsl(var(--text-tertiary))] uppercase tracking-wider text-[10px]">ou</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { provider: "google" as const, label: "S'inscrire avec Google Workspace", icon: <GoogleIcon /> },
                    { provider: "azure-ad" as const, label: "S'inscrire avec Microsoft Entra ID", icon: <MicrosoftIcon /> },
                  ].map(({ provider, label, icon }) => (
                    <button
                      key={provider}
                      onClick={() => handleSSOSignUp(provider)}
                      className="w-full group relative overflow-hidden inline-flex justify-center items-center py-3 px-4 bg-[hsl(var(--bg-surface))]/60 border border-[hsl(var(--border-default))] hover:border-[hsl(var(--border-default))]/80 rounded-lg text-sm font-medium text-[hsl(var(--text-secondary))] transition-all"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--accent))]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <span className="relative z-10 flex items-center justify-center">
                        {icon} <span className="ml-3">{label}</span>
                      </span>
                    </button>
                  ))}
                </div>

                <p className="mt-6 text-center text-[hsl(var(--text-tertiary))] text-[12px]">
                  Vous avez déjà un compte ?{" "}
                  <Link href="/" className="text-[hsl(var(--accent))] hover:text-[hsl(var(--accent-hover))] font-medium transition-colors">
                    Se connecter
                  </Link>
                </p>
              </div>
            </div>
          </section>

          {/* RIGHT: Value prop (hidden on mobile to keep no-scroll) */}
          <section className="hidden lg:block">
            <h1 className="tracking-tight leading-tight font-semibold text-white/90">
              <span className="block" style={{ fontSize: "clamp(28px, 4.5vw, 48px)" }}>
                Rejoignez
              </span>
              <span className="mt-1 block">
                <span className="inline-flex items-baseline gap-2">
                  <NartexLogo className="inline h-[42px] w-auto text-[hsl(var(--accent))] align-baseline" />
                  <span className="text-white/90" style={{ fontSize: "clamp(28px, 4.5vw, 48px)" }}>— le CRM unifié</span>
                </span>
              </span>
            </h1>

            <p className="mt-4 text-[hsl(var(--text-muted))] text-sm leading-relaxed max-w-[46ch]">
              Centralisez contacts, opportunités et opérations. Nartex transforme vos données en visuels convaincants,
              orchestre vos processus, et accélère vos équipes—du premier lead jusqu’au revenu récurrent.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-4 text-xs text-[hsl(var(--text-muted))]">
              {[
                { k: "Fiabilité", v: "SOC 2 • ISO 27001" },
                { k: "Performance", v: "Edge-first, <50 ms" },
                { k: "Intégrations", v: "Suite 365 • Google" },
              ].map((i, idx) => (
                <div key={idx} className="rounded-xl border border-[hsl(var(--border-default))]/60 bg-[hsl(var(--bg-base))]/40 backdrop-blur-sm p-3">
                  <div className="text-[hsl(var(--text-secondary))]">{i.k}</div>
                  <div className="mt-1 font-mono text-[10px] tracking-wider">{i.v}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-16 px-8 text-center text-xs text-[hsl(var(--text-tertiary))] relative z-10">
        <div className="h-full max-w-6xl mx-auto flex items-center justify-center gap-4 font-mono tracking-widest">
          <span>© {new Date().getFullYear()} NARTEX</span>
          <span className="text-[hsl(var(--text-muted))]">|</span>
          <Link href="/privacy" className="hover:text-[hsl(var(--text-secondary))] transition-colors">Confidentialité</Link>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fade-in-down { from { opacity: 0; transform: translate(-50%, -1rem); } to { opacity: 1; transform: translate(-50%, 0); } }
        .animate-fade-in-down { animation: fade-in-down 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
}

/* ---------------- Page Export ---------------- */
const PremiumSignupPage: NextPage = () => (
  <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-[hsl(var(--bg-base))]"><LoadingSpinner className="h-8 w-8 text-[hsl(var(--accent))]" /></div>}>
    <SignupForm />
  </Suspense>
);

export default PremiumSignupPage;
