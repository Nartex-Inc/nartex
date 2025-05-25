// src/app/page.tsx

"use client";
export const dynamic = "force-dynamic";

import React, { Suspense, FormEvent, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { NextPage } from "next";
import Image from "next/image";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
// REMOVE: import type { SignInResponse } from "next-auth/react"; (NextAuth's signIn returns a different shape now)

// --- Icon Components ---
const EyeIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const GoogleIcon: React.FC<{ width?: number; height?: number; className?: string }> = ({ width = 20, height = 20, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width={width} height={height} className={className}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);
const MicrosoftIcon: React.FC<{ width?: number; height?: number; className?: string }> = ({ width = 20, height = 20, className = "" }) => (
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
const CheckIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4 text-white" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
);

// ─── Inner client component ─────────────────────────────────────────────
function LoginForm() {
  const params = useSearchParams();
  const confirmed = params?.get("confirmed") === "true"; // For email verified message
  const newUserEmailSent = params?.get("emailVerificationSent") === "true"; // For "check your email" after signup
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
      const t = setTimeout(() => setShowNewUserBanner(false), 7000); // Longer for this message
      return () => clearTimeout(t);
    }
  }, [newUserEmailSent]);

  const router = useRouter();
  const { status } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // REMOVED Cognito specific state:
  // const [newPassword, setNewPassword] = useState("");
  // const [showNewPass, setShowNewPass] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // redirect if already signed in
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <LoadingSpinner className="h-10 w-10 text-emerald-500" />
      </div>
    );
  }
  if (status === "authenticated") return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false, // Important: handle redirection manually to show errors
      email,
      password,
      callbackUrl: "/dashboard", // NextAuth will use this if login is successful
    });

    if (res?.error) {
      // Errors from NextAuth (e.g., from authorize function in your NextAuth config)
      // The `res.error` will be the string you threw in the `authorize` function
      // Or a generic NextAuth error like "CredentialsSignin"
      setError(res.error === "CredentialsSignin" ? "Adresse e-mail ou mot de passe incorrect." : res.error);
      setLoading(false);
      return;
    }

    // If res is defined, and there's no error, login was successful.
    // NextAuth with redirect:false will provide a res.url to redirect to.
    // Or, if res.ok is true, it's also an indicator of success.
    if (res && res.ok && !res.error) {
      // No need to clear fields here, as router.push will navigate away
      // router.push(res.url || "/dashboard"); // res.url should be populated by NextAuth
      // Let the useEffect for authenticated status handle the redirect
      // Or if you want immediate redirect:
       router.push(res.url ?? "/dashboard");
    } else if (!res?.ok && !res?.error) {
      // This case should ideally not happen if signIn is working as expected
      setError("Une erreur inattendue s'est produite lors de la connexion. Veuillez réessayer.");
      setLoading(false);
    }
    // setLoading(false) is handled in error cases or by navigation
  };

  const handleSSOLogin = (provider: "google" /* | "microsoft" | "azure-ad-b2c" */) => {
    // Ensure the 'provider' string matches the ID used in your NextAuth providers array
    setLoading(true);
    setError(null);
    signIn(provider, { callbackUrl: "/dashboard" }); // Use the NextAuth provider ID
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-950 to-black text-gray-100 font-sans">
      {/* confirmed-user banner */}
      {showBanner && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-100 border border-green-400 text-green-800 px-4 py-2 rounded shadow-lg z-50">
          Votre compte a bien été activé ! Vous pouvez maintenant vous connecter.
        </div>
      )}
      {/* Banner for new user after signup */}
      {showNewUserBanner && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-100 border border-blue-400 text-blue-800 px-4 py-2 rounded shadow-lg z-50">
          Compte créé ! Veuillez consulter votre boîte de réception pour vérifier votre adresse e-mail.
        </div>
      )}

      {/* Header */}
      <header className="relative z-10 bg-black/80 backdrop-blur-md border-b border-white/5 py-4 px-4">
        <div className="container mx-auto flex items-center">
          <Image
            src="/nartex-logo.svg"
            alt="Nartex Logo"
            width={85}
            height={21}
            className="inline-block filter invert"
            onError={e => (e.currentTarget.src = "https://placehold.co/85x21/ffffff/000000?text=Nartex")}
          />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center py-6 px-4 relative z-10 overflow-hidden">
        <div className="flex w-full max-w-5xl">
          {/* Marketing column */}
          <div className="hidden lg:flex lg:flex-col lg:w-1/2 p-12 pr-8">
            <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
              Bienvenue sur SINTO
            </h1>
            <p className="text-lg mb-8 text-gray-300">
              La plateforme de gestion centralisée qui révolutionne votre productivité et transforme radicalement vos flux de travail.
            </p>
            <div className="space-y-8">
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
                  <div className="mt-1 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full p-1.5 mr-4">
                    <CheckIcon />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">{title}</h3>
                    <p className="text-gray-400">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Login form */}
          <div className="w-full lg:w-1/2 px-6">
            <div className="bg-gray-900/70 backdrop-blur-lg border border-gray-800 rounded-xl shadow-2xl p-8 md:p-10">
              {/* mobile logo */}
              <div className="lg:hidden flex justify-center mb-6">
                <Image
                  src="/nartex-logo.svg"
                  alt="Nartex Logo"
                  width={120}
                  height={30}
                  className="inline-block filter invert"
                  onError={e => (e.currentTarget.src = "https://placehold.co/120x30/ffffff/000000?text=Nartex")}
                />
              </div>

              <h2 className="text-2xl font-bold mb-2 text-white text-center lg:text-left">Connexion</h2>
              <p className="text-gray-400 mb-8 text-center lg:text-left">
                Accédez à votre plateforme de gestion centralisée
              </p>

              {error && (
                <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-6 text-sm" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Adresse e-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="vous@exemple.com"
                    className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-300">
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
                      className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-emerald-400"
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                {/* REMOVED Cognito's NEW_PASSWORD_REQUIRED section */}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 rounded-lg text-white bg-gradient-to-r from-emerald-600 to-blue-600 disabled:opacity-50"
                >
                  {loading ? <LoadingSpinner /> : "Se connecter"}
                </button>
              </form>

              {/* new-user banner (original, maybe keep or adapt for the new query param) */}
              {/* This `newUser` param from Cognito flow might be redundant if `emailVerificationSent` covers the intended message */}
              {params?.get("newUser") === "true" && !newUserEmailSent && !confirmed && (
                 <div className="mt-4 text-center text-green-400 text-sm">
                   {/* Consider removing or rephrasing this if it's confusing with the emailVerificationSent banner */}
                   Votre lien d’activation a été envoyé par courriel. Veuillez activer votre compte pour vous connecter.
                 </div>
               )}

              {/* separator */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-900 text-gray-400">ou</span>
                </div>
              </div>

              {/* SSO buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => handleSSOLogin("google")} // Provider ID must match your NextAuth config
                  className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-gray-700 rounded-lg bg-gray-800 text-sm font-medium text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-gray-900 transition duration-150 ease-in-out"
                >
                  <GoogleIcon /> <span className="ml-2">Continuer avec Google Workspace</span>
                </button>
                {/* <button
                  onClick={() => handleSSOLogin("azure-ad-b2c")} // Example if you add Microsoft Entra ID (Azure AD B2C)
                  className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-gray-700 rounded-lg bg-gray-800 text-sm font-medium text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-gray-900 transition duration-150 ease-in-out"
                >
                  <MicrosoftIcon /> <span className="ml-2">Continuer avec Microsoft Entra ID</span>
                </button> */}
              </div>

              {/* sign-up link */}
              <p className="mt-6 text-center text-gray-400 text-sm">
                Vous n’avez pas de compte ?{" "}
                <Link href="/signup" className="text-emerald-400 hover:text-emerald-300">
                  Créer un compte
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 text-center text-xs text-gray-500 border-t border-gray-800">
        © {new Date().getFullYear()} Nartex. Tous droits réservés.
      </footer>
    </div>
  );
}

// ─── Wrap in Suspense at the top level ───────────────────────────────────
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