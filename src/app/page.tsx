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
const EyeIcon: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
const CheckIcon: React.FC<{ className?: string }> = ({ className = "w-3 h-3 text-white" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
);

// Animated Background Component
const AnimatedBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
    }> = [];

    // Create particles
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.2
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        if (particle.x < 0 || particle.x > canvas.width) particle.speedX *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.speedY *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(52, 211, 153, ${particle.opacity})`;
        ctx.fill();
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

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" />;
};

// ─── Inner client component ─────────────────────────────────────────────
function LoginForm() {
  const params = useSearchParams();
  const confirmed = params?.get("confirmed") === "true";
  const newUserEmailSent = params?.get("emailVerificationSent") === "true";
  const [showBanner, setShowBanner] = useState(confirmed);
  const [showNewUserBanner, setShowNewUserBanner] = useState(newUserEmailSent);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="relative">
          <div className="absolute inset-0 animate-ping">
            <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full opacity-20"></div>
          </div>
          <LoadingSpinner className="h-10 w-10 text-emerald-500 relative z-10" />
        </div>
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
    <div className="min-h-screen flex flex-col bg-black text-gray-100 font-sans text-sm overflow-hidden relative">
      <AnimatedBackground />
      
      {/* Dynamic gradient overlay */}
      <div 
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(52, 211, 153, 0.15) 0%, transparent 50%)`
        }}
      />

      {/* Animated gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-950 to-black">
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900/10 via-transparent to-blue-900/10 animate-gradient-shift"></div>
      </div>

      {showBanner && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-full shadow-2xl z-50 text-xs animate-slide-down">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            Votre compte a bien été activé ! Vous pouvez maintenant vous connecter.
          </div>
        </div>
      )}
      {showNewUserBanner && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-500/10 backdrop-blur-md border border-blue-500/30 text-blue-300 px-4 py-2 rounded-full shadow-2xl z-50 text-xs animate-slide-down">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            Compte créé ! Veuillez consulter votre boîte de réception pour vérifier votre adresse e-mail.
          </div>
        </div>
      )}

      <header className="relative z-10 bg-black/40 backdrop-blur-xl border-b border-white/5 py-3 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <Image
                src="/nartex-logo.svg"
                alt="Nartex Logo"
                width={75}
                height={18}
                className="relative filter invert"
                onError={e => (e.currentTarget.src = "https://placehold.co/75x18/ffffff/000000?text=Nartex")}
              />
            </div>
            <div className="hidden md:flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-400">Enterprise Platform</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs text-gray-400">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
              <span>Status: Operational</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-4 px-4 md:py-6 relative z-10">
        <div className="flex w-full max-w-5xl">

          <div className="hidden lg:flex lg:flex-col lg:w-1/2 p-6 md:p-8 pr-8">
            <div className="animate-fade-in">
              <h1 className="text-4xl xl:text-5xl font-bold mb-4 leading-tight">
                <span className="bg-gradient-to-br from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                  Bienvenue sur
                </span>
                <br />
                <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent animate-gradient-x">
                  Nartex Enterprise
                </span>
              </h1>
              <p className="text-base xl:text-lg mb-8 text-gray-400 leading-relaxed">
                La plateforme de gestion centralisée qui révolutionne votre productivité 
                et transforme radicalement vos flux de travail.
              </p>
            </div>
            
            <div className="space-y-6 animate-fade-in-delay">
              {[
                {
                  title: "Sécurité Quantique",
                  description: "Protection next-gen avec chiffrement post-quantique et authentification biométrique avancée",
                  icon: "🛡️",
                  gradient: "from-purple-500 to-pink-500"
                },
                {
                  title: "IA Prédictive",
                  description: "Intelligence artificielle qui anticipe vos besoins et optimise automatiquement vos workflows",
                  icon: "🧠",
                  gradient: "from-blue-500 to-cyan-500"
                },
                {
                  title: "Performance Extrême",
                  description: "Infrastructure edge computing avec latence < 10ms et disponibilité garantie 99.99%",
                  icon: "⚡",
                  gradient: "from-emerald-500 to-green-500"
                }
              ].map((item, i) => (
                <div key={i} className="group flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition-all duration-300 cursor-pointer">
                  <div className={`relative mt-0.5`}>
                    <div className={`absolute -inset-1 bg-gradient-to-r ${item.gradient} rounded-lg blur opacity-50 group-hover:opacity-75 transition duration-300`}></div>
                    <div className="relative bg-black rounded-lg p-2 text-lg">
                      {item.icon}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base xl:text-lg font-semibold text-white mb-1 group-hover:text-emerald-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm xl:text-base text-gray-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-8 animate-fade-in-delay-2">
              <div className="flex items-center gap-6 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  <span>ISO 27001</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>SOC 2 Type II</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span>GDPR</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-1/2 px-4 md:px-6">
            <div className="relative group">
              {/* Glow effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
              
              {/* Main card */}
              <div className="relative bg-gray-900/50 backdrop-blur-2xl border border-gray-800/50 rounded-2xl shadow-2xl p-8 md:p-10 overflow-hidden">
                {/* Animated border gradient */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden">
                  <div className="absolute inset-[-2px] bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 opacity-0 group-hover:opacity-20 blur-sm transition-opacity duration-500 animate-gradient-xy"></div>
                </div>

                <div className="relative z-10">
                  <div className="lg:hidden flex justify-center mb-6">
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                      <Image
                        src="/nartex-logo.svg"
                        alt="Nartex Logo"
                        width={100}
                        height={25}
                        className="relative filter invert"
                        onError={e => (e.currentTarget.src = "https://placehold.co/100x25/ffffff/000000?text=Nartex")}
                      />
                    </div>
                  </div>

                  <h2 className="text-2xl xl:text-3xl font-bold mb-2 text-white text-center lg:text-left">
                    Connexion sécurisée
                  </h2>
                  <p className="text-sm xl:text-base text-gray-400 mb-8 text-center lg:text-left">
                    Accédez à votre espace de travail intelligent
                  </p>

                  {error && (
                    <div className="bg-red-500/10 backdrop-blur-md border border-red-500/30 text-red-300 px-4 py-3 rounded-xl mb-6 text-sm flex items-start gap-2 animate-shake" role="alert">
                      <span className="text-red-400">⚠️</span>
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label htmlFor="email" className="block text-xs font-medium text-gray-300 mb-2 uppercase tracking-wider">
                        Adresse e-mail
                      </label>
                      <div className="relative group">
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          onFocus={() => setFocusedInput('email')}
                          onBlur={() => setFocusedInput(null)}
                          required
                          placeholder="vous@exemple.com"
                          className="w-full px-4 py-3 bg-black/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent text-sm transition-all duration-300 hover:border-gray-600"
                        />
                        <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 opacity-0 blur-xl transition-opacity duration-300 pointer-events-none ${focusedInput === 'email' ? 'opacity-20' : ''}`}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label htmlFor="password" className="block text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Mot de passe
                        </label>
                        <Link href="/forgot-password" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors hover:underline">
                          Mot de passe oublié ?
                        </Link>
                      </div>
                      <div className="relative group">
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          onFocus={() => setFocusedInput('password')}
                          onBlur={() => setFocusedInput(null)}
                          required
                          placeholder="••••••••••••"
                          className="w-full px-4 py-3 bg-black/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent pr-12 text-sm transition-all duration-300 hover:border-gray-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-emerald-400 transition-colors duration-200"
                        >
                          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                        <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 opacity-0 blur-xl transition-opacity duration-300 pointer-events-none ${focusedInput === 'password' ? 'opacity-20' : ''}`}></div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="relative w-full group overflow-hidden rounded-xl text-white bg-gradient-to-r from-emerald-600 to-blue-600 disabled:opacity-50 text-sm font-medium transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25 hover:-translate-y-0.5"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative flex justify-center py-3.5 px-4">
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <LoadingSpinner />
                            <span className="animate-pulse">Connexion en cours...</span>
                          </div>
                        ) : (
                          "Se connecter"
                        )}
                      </div>
                    </button>
                  </form>

                  {params?.get("newUser") === "true" && !newUserEmailSent && !confirmed && (
                    <div className="mt-4 text-center text-emerald-400 text-xs animate-fade-in">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                        Votre lien d'activation a été envoyé par courriel.
                      </div>
                    </div>
                  )}

                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-gray-800"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-3 bg-gray-900 text-gray-500 uppercase tracking-wider">ou continuer avec</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => handleSSOLogin("google")}
                      className="relative w-full group overflow-hidden rounded-xl bg-white/5 hover:bg-white/10 border border-gray-800 hover:border-gray-700 transition-all duration-300"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-yellow-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="relative inline-flex justify-center items-center py-3 px-4 text-xs font-medium text-gray-200">
                        <GoogleIcon />
                        <span className="ml-2">Google Workspace</span>
                      </div>
                    </button>
                    <button
                      onClick={() => handleSSOLogin("azure-ad-b2c")}
                      className="relative w-full group overflow-hidden rounded-xl bg-white/5 hover:bg-white/10 border border-gray-800 hover:border-gray-700 transition-all duration-300"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-green-500/10 to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="relative inline-flex justify-center items-center py-3 px-4 text-xs font-medium text-gray-200">
                        <MicrosoftIcon />
                        <span className="ml-2">Microsoft Entra ID</span>
                      </div>
                    </button>
                  </div>

                  <p className="mt-8 text-center text-gray-400 text-xs">
                    Vous n'avez pas de compte ?{" "}
                    <Link href="/signup" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors hover:underline">
                      Créer un compte
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-4 px-4 text-center text-xs text-gray-600 border-t border-gray-900">
        <div className="flex items-center justify-center gap-4">
          <span>© {new Date().getFullYear()} Nartex Enterprise</span>
          <span className="text-gray-700">•</span>
          <span className="text-emerald-400">Tous droits réservés</span>
        </div>
      </footer>

      <style jsx>{`
        @keyframes gradient-shift {
          0% { transform: translateX(-100%) translateY(-100%); }
          100% { transform: translateX(100%) translateY(100%); }
        }
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes gradient-xy {
          0%, 100% { transform: translateX(0) translateY(0); }
          33% { transform: translateX(100%) translateY(100%); }
          66% { transform: translateX(-100%) translateY(100%); }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translate(-50%, -1rem); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(1rem); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-delay {
          0% { opacity: 0; transform: translateY(1rem); }
          50% { opacity: 0; transform: translateY(1rem); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-delay-2 {
          0% { opacity: 0; transform: translateY(1rem); }
          66% { opacity: 0; transform: translateY(1rem); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        .animate-gradient-shift { animation: gradient-shift 20s ease infinite; }
        .animate-gradient-x { 
          background-size: 200% 200%;
          animation: gradient-x 4s ease infinite;
        }
        .animate-gradient-xy { animation: gradient-xy 10s ease infinite; }
        .animate-slide-down { animation: slide-down 0.5s ease-out; }
        .animate-fade-in { animation: fade-in 0.8s ease-out; }
        .animate-fade-in-delay { animation: fade-in-delay 1.2s ease-out; }
        .animate-fade-in-delay-2 { animation: fade-in-delay-2 1.6s ease-out; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}

const PremiumLoginPage: NextPage = () => (
  <Suspense
    fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="relative">
          <div className="absolute inset-0 animate-ping">
            <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full opacity-20"></div>
          </div>
          <LoadingSpinner className="h-10 w-10 text-emerald-500 relative z-10" />
        </div>
      </div>
    }
  >
    <LoginForm />
  </Suspense>
);

export default PremiumLoginPage;
