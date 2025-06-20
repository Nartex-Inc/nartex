// src/app/page.tsx

"use client";
export const dynamic = "force-dynamic";

import React, { Suspense, FormEvent, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { NextPage } from "next";
import Image from "next/image";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";

// --- Icon Components ---
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
const LoadingSpinner: React.FC<{ className?: string }> = ({ className = "h-4 w-4 text-white" }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// Premium Particle System
const ParticleField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      opacity: number;
      connections: number[];
    }

    const particles: Particle[] = [];
    const particleCount = 80;
    const connectionDistance = 150;

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.3 + 0.1,
        connections: []
      });
    }

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, i) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off walls
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // Draw particle
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.radius);
        gradient.addColorStop(0, `rgba(59, 130, 246, ${particle.opacity})`);
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = gradient;
        ctx.arc(particle.x, particle.y, particle.radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw connections
        particles.slice(i + 1).forEach(otherParticle => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(59, 130, 246, ${(1 - distance / connectionDistance) * 0.1})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none opacity-30" />;
};

// ─── Inner client component ─────────────────────────────────────────────
function LoginForm() {
  const params = useSearchParams();
  const confirmed = params?.get("confirmed") === "true";
  const newUserEmailSent = params?.get("emailVerificationSent") === "true";
  const [showBanner, setShowBanner] = useState(confirmed);
  const [showNewUserBanner, setShowNewUserBanner] = useState(newUserEmailSent);

  useEffect(() => {
    if (confirmed) {
      const t = setTimeout(() => setShowBanner(false), 5000);
      return () => clearTimeout(t);
    }
  }, [confirmed]);

  useEffect(() => {
    if (newUserEmailSent) {
      const t = setTimeout(() => setShowNewUserBanner(false), 7000);
      return () => clearTimeout(t);
    }
  }, [newUserEmailSent]);

  const router = useRouter();
  const { status } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <LoadingSpinner className="h-8 w-8 text-blue-500" />
      </div>
    );
  }
  if (status === "authenticated") return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl: "/dashboard",
    });

    if (res?.error) {
      setError(res.error === "CredentialsSignin" ? "Adresse e-mail ou mot de passe incorrect." : res.error);
      setLoading(false);
      return;
    }

    if (res && res.ok && !res.error) {
       router.push(res.url ?? "/dashboard");
    } else if (!res?.ok && !res?.error) {
      setError("Une erreur inattendue s'est produite lors de la connexion. Veuillez réessayer.");
      setLoading(false);
    }
  };

  const handleSSOLogin = (provider: "google" | "azure-ad-b2c") => {
    setLoading(true);
    setError(null);
    signIn(provider, { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-gray-100 font-sans overflow-hidden relative">
      <ParticleField />
      
      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-tr from-blue-950/20 via-transparent to-indigo-950/20 pointer-events-none" />

      {showBanner && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-emerald-950/50 backdrop-blur-xl border border-emerald-500/20 text-emerald-300 px-4 py-2 rounded-full shadow-lg z-50 text-xs animate-fade-in">
          Votre compte a bien été activé ! Vous pouvez maintenant vous connecter.
        </div>
      )}
      {showNewUserBanner && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-950/50 backdrop-blur-xl border border-blue-500/20 text-blue-300 px-4 py-2 rounded-full shadow-lg z-50 text-xs animate-fade-in">
          Compte créé ! Veuillez consulter votre boîte de réception pour vérifier votre adresse e-mail.
        </div>
      )}

      <header className="relative z-10 py-4 px-6">
        <div className="container mx-auto flex items-center justify-between">
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-lg blur-lg opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
            <Image
              src="/nartex-logo.svg"
              alt="Nartex"
              width={80}
              height={20}
              className="relative filter invert opacity-90"
              onError={e => (e.currentTarget.src = "https://placehold.co/80x20/ffffff/000000?text=Nartex")}
            />
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-500">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
            <span>Enterprise Platform</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-8 px-6 relative z-10">
        <div className="flex w-full max-w-5xl gap-16">

          <div className="hidden lg:flex lg:flex-col lg:w-1/2 py-12">
            <h1 className="text-5xl font-light mb-6">
              <span className="text-white/90">Bienvenue sur</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent font-normal">
                Nartex Enterprise
              </span>
            </h1>
            <p className="text-lg text-zinc-400 mb-12 leading-relaxed">
              La plateforme de gestion centralisée qui révolutionne votre productivité 
              et transforme vos flux de travail.
            </p>
            
            <div className="space-y-8">
              {[
                {
                  title: "Sécurité Quantique",
                  description: "Protection next-gen avec chiffrement post-quantique",
                  icon: "🛡️"
                },
                {
                  title: "IA Prédictive",
                  description: "Intelligence artificielle qui anticipe vos besoins",
                  icon: "🧠"
                },
                {
                  title: "Performance Extrême",
                  description: "Infrastructure edge computing avec latence < 10ms",
                  icon: "⚡"
                }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="text-xl opacity-70">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-zinc-500">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-12 flex items-center gap-6 text-xs text-zinc-600">
              <span>ISO 27001</span>
              <span>•</span>
              <span>SOC 2 Type II</span>
              <span>•</span>
              <span>GDPR</span>
            </div>
          </div>

          <div className="w-full lg:w-1/2">
            <div className="relative">
              {/* Subtle glow */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-2xl blur-2xl"></div>
              
              {/* Glass card */}
              <div className="relative bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-10">
                <div className="lg:hidden flex justify-center mb-8">
                  <Image
                    src="/nartex-logo.svg"
                    alt="Nartex"
                    width={100}
                    height={25}
                    className="filter invert opacity-90"
                    onError={e => (e.currentTarget.src = "https://placehold.co/100x25/ffffff/000000?text=Nartex")}
                  />
                </div>

                <h2 className="text-2xl font-light mb-2 text-white text-center lg:text-left">
                  Connexion sécurisée
                </h2>
                <p className="text-sm text-zinc-500 mb-8 text-center lg:text-left">
                  Accédez à votre espace de travail intelligent
                </p>

                {error && (
                  <div className="bg-red-950/20 border border-red-900/50 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm" role="alert">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">
                      Adresse e-mail
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="vous@exemple.com"
                      className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-zinc-900/70 transition-all text-sm"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label htmlFor="password" className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Mot de passe
                      </label>
                      <Link href="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                        Mot de passe oublié ?
                      </Link>
                    </div>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        placeholder="••••••••••••"
                        className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-zinc-900/70 transition-all pr-12 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="relative w-full group"
                  >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-60 group-hover:opacity-100 transition duration-200"></div>
                    <div className="relative flex justify-center py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg text-white font-medium text-sm transition-all">
                      {loading ? (
                        <LoadingSpinner />
                      ) : (
                        "Se connecter"
                      )}
                    </div>
                  </button>
                </form>

                {params?.get("newUser") === "true" && !newUserEmailSent && !confirmed && (
                  <div className="mt-4 text-center text-emerald-400 text-xs">
                    Votre lien d'activation a été envoyé par courriel.
                  </div>
                )}

                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-800"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-zinc-900/40 text-zinc-500 uppercase tracking-wider">ou</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => handleSSOLogin("google")}
                    className="w-full inline-flex justify-center items-center py-3 px-4 bg-zinc-900/50 hover:bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 rounded-lg text-sm font-medium text-zinc-300 transition-all"
                  >
                    <GoogleIcon />
                    <span className="ml-2">Google Workspace</span>
                  </button>
                  <button
                    onClick={() => handleSSOLogin("azure-ad-b2c")}
                    className="w-full inline-flex justify-center items-center py-3 px-4 bg-zinc-900/50 hover:bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 rounded-lg text-sm font-medium text-zinc-300 transition-all"
                  >
                    <MicrosoftIcon />
                    <span className="ml-2">Microsoft Entra ID</span>
                  </button>
                </div>

                <p className="mt-8 text-center text-zinc-500 text-xs">
                  Vous n'avez pas de compte ?{" "}
                  <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                    Créer un compte
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-4 px-6 text-center text-xs text-zinc-600">
        © {new Date().getFullYear()} Nartex Enterprise • Tous droits réservés
      </footer>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-0.5rem); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
      `}</style>
    </div>
  );
}

const PremiumLoginPage: NextPage = () => (
  <Suspense
    fallback={
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <LoadingSpinner className="h-8 w-8 text-blue-500" />
      </div>
    }
  >
    <LoginForm />
  </Suspense>
);

export default PremiumLoginPage;
