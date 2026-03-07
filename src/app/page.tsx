"use client";
export const dynamic = "force-dynamic";

import React, { Suspense, FormEvent, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { NextPage } from "next";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import NartexLogo from "@/components/nartex-logo";

/* ══════════════════════════════════════════════════════════════════════
   Icons
   ══════════════════════════════════════════════════════════════════════ */
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
const ShieldIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

/* ══════════════════════════════════════════════════════════════════════
   Cinematic particle field with aurora + nebula pulses
   ══════════════════════════════════════════════════════════════════════ */
const ParticleField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let raf = 0;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();

    type P = { x: number; y: number; vx: number; vy: number; r: number; o: number; };
    const dots: P[] = Array.from({ length: Math.max(100, Math.floor((window.innerWidth * window.innerHeight) / 30000)) }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      r: Math.random() * 1.2 + 0.3,
      o: Math.random() * 0.2 + 0.06,
    }));
    const linkDist = 140;

    // Twinkling emerald stars
    type S = { x: number; y: number; s: number; phase: number; speed: number; driftX: number; driftY: number };
    const stars: S[] = Array.from({ length: 42 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      s: Math.random() * 1.4 + 0.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.0015 + Math.random() * 0.003,
      driftX: (Math.random() - 0.5) * 0.04,
      driftY: (Math.random() - 0.5) * 0.04,
    }));

    // Floating aurora orbs
    type Orb = { x: number; y: number; r: number; phase: number; speed: number; dx: number; dy: number };
    const orbs: Orb[] = Array.from({ length: 4 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 120 + Math.random() * 180,
      phase: Math.random() * Math.PI * 2,
      speed: 0.0003 + Math.random() * 0.0005,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.2,
    }));

    const drawStar = (s: S, t: number) => {
      const a = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      const size = s.s * 2.2;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.globalAlpha = a * 0.9;
      ctx.strokeStyle = "rgba(16,185,129,0.8)";
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(-size, 0); ctx.lineTo(size, 0); ctx.moveTo(0, -size); ctx.lineTo(0, size); ctx.stroke();
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2);
      grd.addColorStop(0, `rgba(110,231,183,${0.6 * a})`);
      grd.addColorStop(1, "rgba(110,231,183,0)");
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(0, 0, size * 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };

    const drawOrb = (orb: Orb, t: number) => {
      const pulse = 0.5 + 0.5 * Math.sin(t * orb.speed + orb.phase);
      const grd = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
      grd.addColorStop(0, `rgba(16,185,129,${0.04 * pulse})`);
      grd.addColorStop(0.5, `rgba(16,185,129,${0.015 * pulse})`);
      grd.addColorStop(1, "rgba(16,185,129,0)");
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2); ctx.fill();
    };

    const step: FrameRequestCallback = (ts) => {
      ctx.fillStyle = "rgba(10,10,10,0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Aurora orbs (background glow)
      for (const orb of orbs) {
        orb.x += orb.dx;
        orb.y += orb.dy;
        if (orb.x < -orb.r) orb.x = canvas.width + orb.r;
        if (orb.x > canvas.width + orb.r) orb.x = -orb.r;
        if (orb.y < -orb.r) orb.y = canvas.height + orb.r;
        if (orb.y > canvas.height + orb.r) orb.y = -orb.r;
        drawOrb(orb, ts);
      }

      // Particle dots + links
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
            ctx.strokeStyle = `rgba(52,211,153,${(1 - d / linkDist) * 0.1})`;
            ctx.lineWidth = 0.3;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }

      // Twinkling stars
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

/* ══════════════════════════════════════════════════════════════════════
   Animated gradient border component
   ══════════════════════════════════════════════════════════════════════ */
const AnimatedBorder: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative group">
    {/* Rotating conic gradient border */}
    <div className="absolute -inset-[1px] rounded-2xl bg-[conic-gradient(from_var(--border-angle),transparent_40%,hsl(var(--accent)/0.5)_50%,transparent_60%)] opacity-0 animate-[borderReveal_1.5s_ease-out_0.8s_forwards] [--border-angle:0deg] animate-[borderSpin_4s_linear_infinite,borderReveal_1.5s_ease-out_0.8s_forwards]" />
    {/* Glow underneath */}
    <div className="absolute -inset-4 rounded-3xl bg-[hsl(var(--accent)/0.08)] blur-2xl opacity-0 animate-[glowIn_2s_ease-out_0.6s_forwards]" />
    {children}
  </div>
);

/* ══════════════════════════════════════════════════════════════════════
   Staggered reveal wrapper
   ══════════════════════════════════════════════════════════════════════ */
const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = "" }) => (
  <div
    className={`opacity-0 translate-y-3 ${className}`}
    style={{
      animation: `revealUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s forwards`,
    }}
  >
    {children}
  </div>
);

/* ══════════════════════════════════════════════════════════════════════
   Login page
   ══════════════════════════════════════════════════════════════════════ */
function LoginForm() {
  const params = useSearchParams();
  const confirmed = params?.get("confirmed") === "true";
  const newUserEmailSent = params?.get("emailVerificationSent") === "true";
  const oauthError = params?.get("error");

  const [showBanner, setShowBanner] = useState(confirmed);
  const [showNewUserBanner, setShowNewUserBanner] = useState(newUserEmailSent);

  const router = useRouter();
  const { status } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (confirmed) { const t = setTimeout(() => setShowBanner(false), 5000); return () => clearTimeout(t); } }, [confirmed]);
  useEffect(() => { if (newUserEmailSent) { const t = setTimeout(() => setShowNewUserBanner(false), 7000); return () => clearTimeout(t); } }, [newUserEmailSent]);

  useEffect(() => {
    if (oauthError === "account-exists") {
      setError("Un compte avec cet e-mail existe deja. Connectez-vous ci-dessous.");
    }
  }, [oauthError]);

  useEffect(() => { if (status === "authenticated") router.push("/dashboard"); }, [status, router]);

  // Magnetic card tilt
  const cardRef = useRef<HTMLDivElement>(null);
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    cardRef.current.style.transform = `perspective(800px) rotateY(${x * 3}deg) rotateX(${-y * 3}deg)`;
  }, []);
  const handleMouseLeave = useCallback(() => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg)";
  }, []);

  if (status === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[hsl(var(--bg-base))]">
        <LoadingSpinner className="h-8 w-8 text-[hsl(var(--accent))]" />
      </div>
    );
  }
  if (status === "authenticated") return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { redirect: false, email, password, callbackUrl: "/dashboard" });
    if (res?.error) {
      const msg = res.error === "CredentialsSignin"
        ? "Adresse e-mail ou mot de passe incorrect."
        : res.error;
      setError(msg);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  };

  const handleSSOLogin = (provider: "google" | "azure-ad") => {
    setLoading(true);
    setError(null);
    document.cookie = "auth_intent=signin; path=/; max-age=300; SameSite=Lax";
    signIn(provider, { callbackUrl: "/dashboard" });
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#050505] text-[hsl(var(--text-primary))] font-sans antialiased">
      <ParticleField />

      {/* Layered ambient gradients */}
      <div className="pointer-events-none absolute inset-0 -z-[5] bg-black/50" />
      <div className="pointer-events-none absolute -top-40 -left-40 w-[50rem] h-[50rem] rounded-full bg-[hsl(var(--accent)/0.07)] blur-[120px] -z-[4]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[40rem] h-[40rem] rounded-full bg-[hsl(var(--accent)/0.06)] blur-[100px] -z-[4]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60rem] h-[60rem] rounded-full bg-[radial-gradient(circle,hsl(var(--accent)/0.03)_0%,transparent_70%)] -z-[4]" />

      {/* Noise texture overlay */}
      <div className="pointer-events-none absolute inset-0 -z-[3] opacity-[0.015]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat" }}
      />

      {/* Header */}
      <header className="relative z-10 h-16 px-8">
        <Reveal delay={0.1}>
          <div className="h-16 max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="relative group">
              <div className="absolute -inset-3 bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--accent-hover))] rounded-xl blur-2xl opacity-0 group-hover:opacity-15 transition-opacity duration-700" />
              <NartexLogo className="relative h-5 w-auto text-white/80 group-hover:text-white transition-colors duration-500" />
            </Link>
            <div className="hidden md:flex items-center gap-3 text-xs text-white/30">
              <span className="inline-flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--accent))] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(var(--accent))]" />
                </span>
                <span className="tracking-[0.2em] uppercase text-[10px]">Plateforme de gestion d&apos;entreprise unifiee</span>
              </span>
            </div>
          </div>
        </Reveal>
      </header>

      {/* Main content */}
      <main className="relative z-10 h-[calc(100dvh-4rem)]">
        <div className="h-full max-w-6xl mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left: Value prop */}
          <section className="hidden lg:block">
            <Reveal delay={0.2}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[hsl(var(--accent)/0.2)] bg-[hsl(var(--accent)/0.05)] mb-6">
                <ShieldIcon className="w-3.5 h-3.5 text-[hsl(var(--accent))]" />
                <span className="text-[10px] tracking-[0.15em] uppercase text-[hsl(var(--accent))] font-medium">Chiffrement de bout en bout</span>
              </div>
            </Reveal>

            <Reveal delay={0.35}>
              <h1 className="tracking-tight leading-[1.05] font-bold text-white">
                <span className="block" style={{ fontSize: "clamp(30px, 4.5vw, 52px)" }}>
                  Propulsez votre
                </span>
                <span className="block" style={{ fontSize: "clamp(30px, 4.5vw, 52px)" }}>
                  croissance avec
                </span>
                <span className="mt-2 block">
                  <span className="inline-flex items-baseline gap-3">
                    <NartexLogo className="inline h-[44px] w-auto text-[hsl(var(--accent))] align-baseline drop-shadow-[0_0_20px_hsl(var(--accent)/0.4)]" />
                  </span>
                </span>
              </h1>
            </Reveal>

            <Reveal delay={0.5}>
              <p className="mt-5 text-white/40 text-[15px] leading-relaxed max-w-[44ch] font-light">
                Centralisez contacts, opportunites et operations. Nartex transforme vos donnees en visuels convaincants,
                orchestre vos processus, et accelere vos equipes.
              </p>
            </Reveal>

            <Reveal delay={0.65}>
              <div className="mt-8 grid grid-cols-3 gap-3">
                {[
                  { k: "Fiabilite", v: "SOC 2 \u00b7 ISO 27001", icon: "shield" },
                  { k: "Performance", v: "Edge-first, <50 ms", icon: "zap" },
                  { k: "Integrations", v: "Suite 365 \u00b7 Google", icon: "link" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 transition-all duration-500 hover:border-[hsl(var(--accent)/0.2)] hover:bg-white/[0.04]"
                  >
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[hsl(var(--accent)/0.05)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative">
                      <div className="text-white/60 text-xs font-medium tracking-wide">{item.k}</div>
                      <div className="mt-1.5 font-mono text-[10px] tracking-wider text-white/30">{item.v}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.8}>
              <div className="mt-8 flex items-center gap-5">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-7 h-7 rounded-full border-2 border-[#050505] bg-gradient-to-br from-white/10 to-white/5" />
                  ))}
                </div>
                <div>
                  <div className="text-white/50 text-xs font-medium">+200 entreprises</div>
                  <div className="text-white/25 text-[10px]">font confiance a Nartex</div>
                </div>
              </div>
            </Reveal>
          </section>

          {/* Right: Auth card */}
          <section className="w-full max-w-[420px] mx-auto lg:mx-0 lg:ml-auto">
            <Reveal delay={0.4}>
              <AnimatedBorder>
                <div
                  ref={cardRef}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  className="relative rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/80 backdrop-blur-2xl shadow-[0_0_80px_-20px_hsl(var(--accent)/0.15)] p-8 transition-transform duration-300 ease-out"
                >
                  {/* Subtle inner gradient */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

                  <div className="relative">
                    {/* Card header */}
                    <div className="text-center mb-7">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[hsl(var(--accent)/0.1)] border border-[hsl(var(--accent)/0.15)] mb-4">
                        <ShieldIcon className="w-5 h-5 text-[hsl(var(--accent))]" />
                      </div>
                      <h2 className="text-xl font-semibold text-white tracking-tight">Connexion securisee</h2>
                      <p className="text-white/30 text-[13px] mt-1.5 font-light">
                        Accedez a votre espace de travail en toute securite
                      </p>
                    </div>

                    {/* Confirmation banners */}
                    {showBanner && (
                      <div className="mb-5 bg-[hsl(var(--accent)/0.08)] border border-[hsl(var(--accent)/0.2)] text-[hsl(var(--accent))] px-4 py-3 rounded-xl text-sm text-center">
                        Votre e-mail a ete verifie avec succes. Connectez-vous.
                      </div>
                    )}
                    {showNewUserBanner && (
                      <div className="mb-5 bg-[hsl(var(--info)/0.08)] border border-[hsl(var(--info)/0.2)] text-[hsl(var(--info))] px-4 py-3 rounded-xl text-sm text-center">
                        Un e-mail de verification a ete envoye. Verifiez votre boite de reception.
                      </div>
                    )}

                    {/* Error */}
                    {error && (
                      <div className="mb-5 bg-[hsl(var(--danger)/0.08)] border border-[hsl(var(--danger)/0.2)] text-[hsl(var(--danger))] px-4 py-3 rounded-xl text-sm text-center animate-[shakeX_0.5s_ease-out]" role="alert">
                        {error}
                      </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Email */}
                      <div className="group">
                        <label htmlFor="email" className="block text-[10px] font-medium text-white/30 mb-2 uppercase tracking-[0.15em]">
                          Adresse e-mail
                        </label>
                        <div className="relative">
                          <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="vous@entreprise.com"
                            autoComplete="email"
                            className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-white/20 focus:ring-1 focus:ring-[hsl(var(--accent)/0.4)] focus:border-[hsl(var(--accent)/0.3)] focus:bg-white/[0.05] transition-all duration-300 text-sm outline-none"
                          />
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[hsl(var(--accent)/0.1)] to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
                        </div>
                      </div>

                      {/* Password */}
                      <div className="group">
                        <div className="flex justify-between items-center mb-2">
                          <label htmlFor="password" className="block text-[10px] font-medium text-white/30 uppercase tracking-[0.15em]">
                            Mot de passe
                          </label>
                          <Link href="/forgot-password" className="text-[10px] text-[hsl(var(--accent)/0.7)] hover:text-[hsl(var(--accent))] transition-colors duration-300">
                            Oublie ?
                          </Link>
                        </div>
                        <div className="relative">
                          <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                            className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-white/20 focus:ring-1 focus:ring-[hsl(var(--accent)/0.4)] focus:border-[hsl(var(--accent)/0.3)] focus:bg-white/[0.05] transition-all duration-300 pr-12 text-sm outline-none"
                          />
                          <button
                            type="button"
                            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/20 hover:text-white/50 transition-colors duration-300"
                          >
                            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                          </button>
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[hsl(var(--accent)/0.1)] to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
                        </div>
                      </div>

                      {/* Submit button */}
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full relative overflow-hidden py-3 px-4 bg-[hsl(var(--accent))] rounded-xl text-black font-semibold text-sm transition-all duration-300 hover:shadow-[0_0_30px_hsl(var(--accent)/0.4)] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:hover:shadow-none mt-2"
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          {loading ? <LoadingSpinner className="h-5 w-5 text-black" /> : "Se connecter"}
                        </span>
                        {/* Shimmer sweep */}
                        <div className="absolute inset-0 -translate-x-full animate-[shimmerSweep_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/[0.06]" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="px-4 bg-[#0a0a0a]/80 text-white/20 uppercase tracking-[0.2em] text-[9px]">ou</span>
                      </div>
                    </div>

                    {/* SSO buttons */}
                    <div className="space-y-2.5">
                      {[
                        { provider: "google" as const, label: "Continuer avec Google Workspace", icon: <GoogleIcon /> },
                        { provider: "azure-ad" as const, label: "Continuer avec Microsoft Entra ID", icon: <MicrosoftIcon /> },
                      ].map(({ provider, label, icon }) => (
                        <button
                          key={provider}
                          onClick={() => handleSSOLogin(provider)}
                          className="w-full group/sso relative overflow-hidden inline-flex justify-center items-center py-3 px-4 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] rounded-xl text-[13px] font-medium text-white/50 hover:text-white/70 transition-all duration-300"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/[0.03] to-transparent opacity-0 group-hover/sso:opacity-100 transition-opacity duration-500" />
                          <span className="relative z-10 flex items-center justify-center">
                            {icon} <span className="ml-3">{label}</span>
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Sign up link */}
                    <p className="mt-6 text-center text-white/25 text-[12px]">
                      Pas encore de compte ?{" "}
                      <Link href="/signup" className="text-[hsl(var(--accent)/0.7)] hover:text-[hsl(var(--accent))] font-medium transition-colors duration-300">
                        Creer un compte
                      </Link>
                    </p>
                  </div>
                </div>
              </AnimatedBorder>
            </Reveal>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 inset-x-0 h-12 px-8 text-center relative z-10">
        <Reveal delay={1}>
          <div className="h-12 max-w-6xl mx-auto flex items-center justify-center gap-4 font-mono tracking-[0.25em] text-white/15 text-[10px]">
            <span>&copy; {new Date().getFullYear()} NARTEX</span>
            <span className="text-white/10">|</span>
            <Link href="/privacy" className="hover:text-white/30 transition-colors duration-300">Confidentialite</Link>
          </div>
        </Reveal>
      </footer>

      {/* Global animations */}
      <style jsx>{`
        @keyframes revealUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes borderSpin {
          to { --border-angle: 360deg; }
        }
        @keyframes borderReveal {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes glowIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shimmerSweep {
          0% { transform: translateX(-100%); }
          50%, 100% { transform: translateX(100%); }
        }
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @property --border-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Page Export
   ══════════════════════════════════════════════════════════════════════ */
const PremiumLoginPage: NextPage = () => (
  <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-[#050505]"><LoadingSpinner className="h-8 w-8 text-[hsl(var(--accent))]" /></div>}>
    <LoginForm />
  </Suspense>
);

export default PremiumLoginPage;
