"use client";
export const dynamic = "force-dynamic";

import React, { Suspense, FormEvent, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { NextPage } from "next";
import Image from "next/image";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import NartexLogo from "@/components/nartex-logo";

// --- Icon Components ---
const EyeIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg> );
const EyeOffIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg> );
const GoogleIcon: React.FC<{ width?: number; height?: number; className?: string }> = ({ width = 18, height = 18, className = "" }) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width={width} height={height} className={className}><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg> );
const MicrosoftIcon: React.FC<{ width?: number; height?: number; className?: string }> = ({ width = 18, height = 18, className = "" }) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" width={width} height={height} className={className}><path d="M11 0H0v11h11V0z" fill="#f25022" /><path d="M23 0H12v11h11V0z" fill="#7fba00" /><path d="M11 12H0v11h11V12z" fill="#00a4ef" /><path d="M23 12H12v11h11V12z" fill="#ffb900" /></svg> );
const LoadingSpinner: React.FC<{ className?: string }> = ({ className = "h-5 w-5 text-white" }) => ( <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> );

const ParticleField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let animationFrameId: number;
    const resizeCanvas = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resizeCanvas();
    interface Particle { x: number; y: number; vx: number; vy: number; radius: number; opacity: number; }
    const particles: Particle[] = []; const particleCount = 60; const connectionDistance = 180;
    for (let i = 0; i < particleCount; i++) { particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2, radius: Math.random() * 1.5 + 0.5, opacity: Math.random() * 0.5 + 0.2, }); }
    const animate = () => {
      ctx.fillStyle = 'rgba(24, 24, 27, 0.1)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1; if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fillStyle = `rgba(110, 231, 183, ${p.opacity})`; ctx.fill();
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]; const dx = p.x - p2.x; const dy = p.y - p2.y; const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < connectionDistance) {
            ctx.beginPath(); const opacity = 1 - (distance / connectionDistance); ctx.strokeStyle = `rgba(52, 211, 153, ${opacity * 0.2})`; ctx.lineWidth = 0.5; ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
          }
        }
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 -z-10" />;
};

function LoginForm() {
  const params = useSearchParams();
  const confirmed = params?.get("confirmed") === "true";
  const newUserEmailSent = params?.get("emailVerificationSent") === "true";
  const [showBanner, setShowBanner] = useState(confirmed);
  const [showNewUserBanner, setShowNewUserBanner] = useState(newUserEmailSent);
  useEffect(() => { if (confirmed) { const t = setTimeout(() => setShowBanner(false), 5000); return () => clearTimeout(t); } }, [confirmed]);
  useEffect(() => { if (newUserEmailSent) { const t = setTimeout(() => setShowNewUserBanner(false), 7000); return () => clearTimeout(t); } }, [newUserEmailSent]);
  const router = useRouter();
  const { status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (status === "authenticated") { router.push("/dashboard"); } }, [status, router]);

  if (status === "loading") { return <div className="h-screen flex items-center justify-center"><LoadingSpinner className="h-8 w-8 text-emerald-500" /></div>; }
  if (status === "authenticated") return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { redirect: false, email, password, callbackUrl: "/dashboard" });
    if (res?.error) { setError(res.error === "CredentialsSignin" ? "Adresse e-mail ou mot de passe incorrect." : "Une erreur est survenue."); setLoading(false); return; }
    router.push("/dashboard");
  };

  const handleSSOLogin = (provider: "google" | "azure-ad") => {
    setLoading(true);
    setError(null);
    signIn(provider, { callbackUrl: "/dashboard" });
  };

  return (
    <div className="h-screen flex flex-col text-gray-100 font-sans antialiased relative">
      <ParticleField />
      
      <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-900/30 rounded-full blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-900/30 rounded-full blur-3xl opacity-20 translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

      {showBanner && ( <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-emerald-950/50 backdrop-blur-xl border border-emerald-500/20 text-emerald-300 px-4 py-2 rounded-full shadow-lg z-50 text-xs animate-fade-in-down">Votre compte a bien été activé ! Vous pouvez maintenant vous connecter.</div> )}
      {showNewUserBanner && ( <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-emerald-950/50 backdrop-blur-xl border border-emerald-500/20 text-emerald-300 px-4 py-2 rounded-full shadow-lg z-50 text-xs animate-fade-in-down">Compte créé ! Veuillez consulter votre boîte de réception pour vérifier votre e-mail.</div> )}

      <header className="relative z-10 py-5 px-8">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-emerald-600 to-green-600 rounded-lg blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
            <Image src="/nartex-logo.svg" alt="Nartex" width={85} height={21} className="relative filter invert opacity-80 group-hover:opacity-100 transition-opacity" onError={e => (e.currentTarget.src = "https://placehold.co/85x21/ffffff/000000?text=Nartex")} />
          </Link>
          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-600">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span>Enterprise Platform</span>
          </div>
        </div>
      </header>
      
      <main className="flex-1 flex items-center justify-center px-6 relative z-10 overflow-y-auto">
        <div className="flex w-full max-w-6xl gap-16 xl:gap-24 items-center py-12">
          
          {/*
            ==================================================================
            ===                        THE FIX                           ===
            ==================================================================
            The redundant `py-12` has been REMOVED from this div.
            This was the line causing the overflow and the double scrollbar.
          */}
          <div className="hidden xl:flex xl:flex-col xl:w-1/2">
            
            <h1 className="text-4xl xl:text-6xl font-light tracking-tighter mb-6 flex flex-col">
              <span className="text-white/80">Bienvenue sur</span>
              <NartexLogo 
                width={180} 
                height={45} 
                className="mt-2 text-green-500"
              />
            </h1>
            
            <p className="text-lg xl:text-xl text-zinc-400 mb-12 leading-relaxed max-w-lg">La plateforme de gestion centralisée qui révolutionne votre productivité et transforme vos flux de travail.</p>
            <div className="space-y-8">
            {[ { title: "Sécurité d'Entreprise", description: "Conformité SOC 2 et chiffrement de bout en bout.", icon: "🛡️" }, { title: "Automatisation Intelligente", description: "Workflows intelligents qui optimisent vos processus.", icon: "⚙️" }, { title: "Performance Globale", description: "Infrastructure edge pour une réactivité instantanée.", icon: "⚡" } ].map((item, i) => ( <div key={i} className="flex items-center gap-5"><div className="text-2xl opacity-70">{item.icon}</div><div><h3 className="text-lg font-medium text-white mb-0.5">{item.title}</h3><p className="text-sm text-zinc-500">{item.description}</p></div></div> ))}
            </div>
            <div className="mt-auto pt-16 flex items-center gap-6 text-xs text-zinc-500 font-mono tracking-widest">
              <span>ISO 27001</span><span>SOC 2</span><span>GDPR</span>
            </div>
          </div>
          <div className="w-full xl:w-1/2">
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-emerald-800/20 via-green-800/20 to-emerald-800/20 rounded-3xl blur-3xl opacity-40 animate-pulse-slow"></div>
              <div className="relative bg-zinc-950/60 backdrop-blur-2xl border border-zinc-800/40 rounded-2xl p-8 md:p-10 lg:p-12 shadow-2xl shadow-black/20">
                <h2 className="text-3xl font-medium mb-2 text-white text-center">Connexion sécurisée</h2>
                <p className="text-base text-zinc-500 mb-10 text-center">Accédez à votre espace de travail.</p>
                {error && ( <div className="bg-red-950/30 border border-red-900/50 text-red-400 px-4 py-3 rounded-lg mb-8 text-sm text-center" role="alert">{error}</div> )}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Adresse e-mail</label>
                    <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="vous@exemple.com" className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:bg-zinc-900/70 transition-all text-sm" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label htmlFor="password" className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">Mot de passe</label>
                      <Link href="/forgot-password" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">Mot de passe oublié ?</Link>
                    </div>
                    <div className="relative">
                      <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••••••" className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:bg-zinc-900/70 transition-all pr-12 text-sm" />
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors">{showPassword ? <EyeOffIcon /> : <EyeIcon />}</button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full group relative overflow-hidden py-3 px-4 bg-gradient-to-r from-emerald-600 to-green-600 rounded-lg text-white font-semibold text-sm transition-all shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50">
                    <span className="relative z-10 flex items-center justify-center">{loading ? <LoadingSpinner /> : "Se connecter"}</span>
                    <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </button>
                </form>
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
                  <div className="relative flex justify-center text-xs"><span className="px-3 bg-zinc-950/60 text-zinc-500 uppercase tracking-wider">ou</span></div>
                </div>
                <div className="space-y-4">
                  {[ { provider: 'google', label: 'Google Workspace', icon: <GoogleIcon /> }, { provider: 'azure-ad', label: 'Microsoft Entra ID', icon: <MicrosoftIcon /> } ].map(({ provider, label, icon }) => ( <button key={provider} onClick={() => handleSSOLogin(provider as "google" | "azure-ad")} className="w-full group relative overflow-hidden inline-flex justify-center items-center py-3 px-4 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-lg text-sm font-medium text-zinc-300 transition-all"><div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div><span className="relative z-10 flex items-center justify-center">{icon} <span className="ml-3">{label}</span></span></button> ))}
                </div>
                <p className="mt-10 text-center text-zinc-500 text-xs">Vous n'avez pas de compte ?{" "} <Link href="/signup" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">Créer un compte</Link></p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="relative z-10 py-5 px-8 text-center text-xs text-zinc-500 font-mono tracking-widest">
        © {new Date().getFullYear()} NARTEX
      </footer>
      <style jsx>{`
        @keyframes fade-in-down { from { opacity: 0; transform: translate(-50%, -1.5rem); } to { opacity: 1; transform: translate(-50%, 0); } }
        .animate-fade-in-down { animation: fade-in-down 0.5s ease-out forwards; }
        @keyframes pulse-slow { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.05); } }
        .animate-pulse-slow { animation: pulse-slow 8s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>
    </div>
  );
}

const PremiumLoginPage: NextPage = () => (
  <Suspense fallback={ <div className="h-screen flex items-center justify-center bg-zinc-900"><LoadingSpinner className="h-8 w-8 text-emerald-500" /></div> }>
    <LoginForm />
  </Suspense>
);

export default PremiumLoginPage;
