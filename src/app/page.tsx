// src/app/page.tsx

"use client";
export const dynamic = "force-dynamic";

import React, { Suspense, FormEvent, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { NextPage } from "next";
import Image from "next/image";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";

// --- Icon Components ---
const EyeIcon: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5" }) => ( // Default smaller
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5" }) => ( // Default smaller
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const GoogleIcon: React.FC<{ width?: number; height?: number; className?: string }> = ({ width = 18, height = 18, className = "" }) => ( // Default smaller
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width={width} height={height} className={className}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);
const MicrosoftIcon: React.FC<{ width?: number; height?: number; className?: string }> = ({ width = 18, height = 18, className = "" }) => ( // Default smaller
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" width={width} height={height} className={className}>
    <path d="M11 0H0v11h11V0z" fill="#f25022" />
    <path d="M23 0H12v11h11V0z" fill="#7fba00" />
    <path d="M11 12H0v11h11V12z" fill="#00a4ef" />
    <path d="M23 12H12v11h11V12z" fill="#ffb900" />
  </svg>
);
const LoadingSpinner: React.FC<{ className?: string }> = ({ className = "h-4 w-4 text-white" }) => ( // Default smaller for buttons
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);
const CheckIcon: React.FC<{ className?: string }> = ({ className = "w-3 h-3 text-white" }) => ( // Default smaller
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
);

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
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <LoadingSpinner className="h-10 w-10 text-emerald-500" /> {/* Page loader can remain larger */}
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-950 to-black text-gray-100 font-sans text-sm"> {/* Added text-sm base for form area */}
      {showBanner && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-100 border border-green-400 text-green-700 px-3 py-1.5 rounded shadow-lg z-50 text-xs"> {/* Smaller banner */}
          Votre compte a bien été activé ! Vous pouvez maintenant vous connecter.
        </div>
      )}
      {showNewUserBanner && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-100 border border-blue-400 text-blue-700 px-3 py-1.5 rounded shadow-lg z-50 text-xs"> {/* Smaller banner */}
          Compte créé ! Veuillez consulter votre boîte de réception pour vérifier votre adresse e-mail.
        </div>
      )}

      <header className="relative z-10 bg-black/80 backdrop-blur-md border-b border-white/5 py-3 px-4"> {/* Reduced py */}
        <div className="container mx-auto flex items-center">
          <Image
            src="/nartex-logo.svg"
            alt="Nartex Logo"
            width={75} // Reduced logo size
            height={18} // Reduced logo size
            className="inline-block filter invert"
            onError={e => (e.currentTarget.src = "https://placehold.co/75x18/ffffff/000000?text=Nartex")}
          />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-4 px-4 md:py-6">
        <div className="flex w-full max-w-3xl xl:max-w-4xl"> {/* Adjusted max-width */}

          <div className="hidden lg:flex lg:flex-col lg:w-1/2 p-6 md:p-8 pr-4 md:pr-6">
            <h1 className="text-2xl xl:text-3xl font-bold mb-3 bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
              Bienvenue sur Nartex
            </h1>
            <p className="text-sm xl:text-base mb-5 text-gray-300">
              La plateforme de gestion centralisée qui révolutionne votre productivité et transforme radicalement vos flux de travail.
            </p>
            <div className="space-y-5">
              {[
                [
                  "Sécurité inégalée",
                  "Protection blindée de vos données avec chiffrement de niveau militaire et conformité aux normes internationales les plus strictes",
                ],
                [
                  "Intégration parfaite",
                  "Synchronisation instantanée avec tous vos outils existants, éliminant les silos de données et unifiant votre écosystème numérique",
                ],
                [
                  "Support 24/7",
                  "Une équipe d'experts dédiés toujours à vos côtés pour assurer votre réussite, avec un temps de réponse moyen de moins de 15 minutes",
                ],
              ].map(([title, description], i) => (
                <div key={i} className="flex items-start">
                  <div className="mt-0.5 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full p-1 mr-2.5">
                    <CheckIcon className="w-2.5 h-2.5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm xl:text-base font-medium text-white">{title}</h3>
                    <p className="text-xs xl:text-sm text-gray-400">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full lg:w-1/2 px-4 md:px-6">
            <div className="bg-gray-900/70 backdrop-blur-lg border border-gray-700 rounded-xl shadow-2xl p-6 md:p-8">
              <div className="lg:hidden flex justify-center mb-5">
                <Image
                  src="/nartex-logo.svg"
                  alt="Nartex Logo"
                  width={100}
                  height={25}
                  className="inline-block filter invert"
                  onError={e => (e.currentTarget.src = "https://placehold.co/100x25/ffffff/000000?text=Nartex")}
                />
              </div>

              <h2 className="text-lg xl:text-xl font-bold mb-1 text-white text-center lg:text-left">Connexion</h2>
              <p className="text-xs xl:text-sm text-gray-400 mb-5 text-center lg:text-left">
                Accédez à votre plateforme de gestion centralisée
              </p>

              {error && (
                <div className="bg-red-900/30 border border-red-700 text-red-300 px-3 py-2 rounded-lg mb-4 text-xs" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-gray-300 mb-1">
                    Adresse e-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="vous@exemple.com"
                    className="w-full px-3 py-2 bg-gray-800/80 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:ring-1 focus:ring-emerald-500 text-sm" // py-2, rounded-md, smaller placeholder
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="password" className="block text-xs font-medium text-gray-300">
                      Mot de passe
                    </label>
                    <Link href="/forgot-password" className="text-xs text-emerald-400 hover:text-emerald-300">
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
                      placeholder="Entrez votre mot de passe"
                      className="w-full px-3 py-2 bg-gray-800/80 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:ring-1 focus:ring-emerald-500 pr-9 text-sm" // py-2, rounded-md, smaller placeholder
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-emerald-400"
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 rounded-md text-white bg-gradient-to-r from-emerald-600 to-blue-600 disabled:opacity-50 text-sm font-medium"
                >
                  {loading ? <LoadingSpinner /> : "Se connecter"}
                </button>
              </form>

              {params?.get("newUser") === "true" && !newUserEmailSent && !confirmed && (
                 <div className="mt-3 text-center text-green-400 text-xs">
                   Votre lien d’activation a été envoyé par courriel. Veuillez activer votre compte pour vous connecter.
                 </div>
               )}

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-gray-900 text-gray-400">ou</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => handleSSOLogin("google")}
                  className="w-full inline-flex justify-center items-center py-2 px-3 border border-gray-700 rounded-md bg-gray-800 text-xs font-medium text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-gray-500 focus:ring-offset-gray-900 transition duration-150 ease-in-out" // py-2, px-3, rounded-md
                >
                  <GoogleIcon /> <span className="ml-1.5">Continuer avec Google Workspace</span> {/* ml-1.5 */}
                </button>
                <button
                  onClick={() => handleSSOLogin("azure-ad-b2c")}
                  className="w-full inline-flex justify-center items-center py-2 px-3 border border-gray-700 rounded-md bg-gray-800 text-xs font-medium text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-gray-500 focus:ring-offset-gray-900 transition duration-150 ease-in-out" // py-2, px-3, rounded-md
                >
                  <MicrosoftIcon /> <span className="ml-1.5">Continuer avec Microsoft Entra ID</span> {/* ml-1.5 */}
                </button>
              </div>

              <p className="mt-5 text-center text-gray-400 text-xs">
                Vous n’avez pas de compte ?{" "}
                <Link href="/signup" className="text-emerald-400 hover:text-emerald-300">
                  Créer un compte
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-3 px-4 text-center text-xs text-gray-500 border-t border-gray-800"> {/* Reduced py */}
        © {new Date().getFullYear()} Nartex. Tous droits réservés.
      </footer>
    </div>
  );
}

const PremiumLoginPage: NextPage = () => (
  <Suspense
    fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <LoadingSpinner className="h-10 w-10 text-emerald-500" />
      </div>
    }
  >
    <LoginForm />
  </Suspense>
);

export default PremiumLoginPage;