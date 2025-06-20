"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

// --- Icon Components ---
// Note: Adjusted to match the smaller sizing from your login page for consistency
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

const LoadingSpinner: React.FC<{ className?: string }> = ({ className = "h-4 w-4 text-white" }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className = "w-2.5 h-2.5 text-white" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
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


const SignUpPage = () => {
  const router = useRouter();
  // --- STATE SIMPLIFIED ---
  const [form, setForm] = useState({
    email: "",
    password: "",
    password_confirm: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.password_confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (form.password.length < 8) {
      setError("Le mot de passe doit comporter au moins 8 caractères.");
      return;
    }

    setLoading(true);

    try {
      // --- FETCH BODY SIMPLIFIED ---
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          password_confirm: form.password_confirm,
        }),
      });

      const body = await res.json();

      if (!res.ok || !body.success) {
        setError(body.error || "Impossible de créer le compte. Veuillez réessayer.");
      } else {
        router.push("/?emailVerificationSent=true");
      }
    } catch (err) {
      console.error("Signup fetch error:", err);
      setError("Une erreur s'est produite lors de la communication avec le serveur.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleSSOSignUp = (provider: "google" | "azure-ad") => {
    // For signup, it's the same as login. next-auth handles user creation automatically.
    signIn(provider, { callbackUrl: "/dashboard" });
  };

  // --- STYLING UPDATED TO MATCH LOGIN PAGE ---
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-950 to-black text-gray-100 font-sans text-sm">
      {/* Header with reduced size */}
      <header className="relative z-10 bg-black/80 backdrop-blur-md border-b border-white/5 py-3 px-4">
        <div className="container mx-auto flex items-center">
          <Image
            src="/nartex-logo.svg"
            alt="Nartex Logo"
            width={75}
            height={18}
            className="inline-block filter invert"
            onError={(e) => (e.currentTarget.src = 'https://placehold.co/75x18/ffffff/000000?text=Nartex')}
          />
        </div>
      </header>

      {/* Main Content with adjusted sizing */}
      <main className="flex-1 flex items-center justify-center py-4 px-4 md:py-6">
        <div className="flex w-full max-w-3xl xl:max-w-4xl">
          {/* Left Marketing Content with adjusted sizing */}
          <div className="hidden lg:flex lg:flex-col lg:w-1/2 p-6 md:p-8 pr-4 md:pr-6">
            <h1 className="text-2xl xl:text-3xl font-bold mb-3 bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
              Rejoignez Nartex
            </h1>
            <p className="text-sm xl:text-base mb-5 text-gray-300">
              La plateforme de gestion centralisée qui révolutionne votre productivité et transforme radicalement vos flux de travail.
            </p>
            <div className="space-y-5">
              {[
                  ["Sécurité inégalée", "Protection blindée de vos données avec chiffrement de niveau militaire et conformité aux normes les plus strictes."],
                  ["Intégration parfaite", "Synchronisation instantanée avec tous vos outils existants, unifiant votre écosystème numérique."],
                  ["Support 24/7", "Une équipe d'experts dédiés à vos côtés pour assurer votre réussite, avec un temps de réponse moyen de moins de 15 minutes."],
              ].map(([title, description], i) => (
                <div key={i} className="flex items-start">
                  <div className="mt-0.5 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full p-1 mr-2.5">
                    <CheckIcon />
                  </div>
                  <div>
                    <h3 className="text-sm xl:text-base font-medium text-white">{title}</h3>
                    <p className="text-xs xl:text-sm text-gray-400">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Signup Form with adjusted sizing */}
          <div className="w-full lg:w-1/2 px-4 md:px-6">
            <div className="bg-gray-900/70 backdrop-blur-lg border border-gray-700 rounded-xl shadow-2xl p-6 md:p-8">
              <div className="lg:hidden flex justify-center mb-5">
                <Image
                  src="/nartex-logo.svg"
                  alt="Nartex Logo"
                  width={100}
                  height={25}
                  className="inline-block filter invert"
                  onError={(e) => (e.currentTarget.src = "https://placehold.co/100x25/ffffff/000000?text=Nartex")}
                />
              </div>

              <h2 className="text-lg xl:text-xl font-bold mb-1 text-white text-center lg:text-left">Créer un compte</h2>
              <p className="text-xs xl:text-sm text-gray-400 mb-5 text-center lg:text-left">
                Utilisez votre e-mail ou un fournisseur SSO.
              </p>
              
              {error && (
                <div className="bg-red-900/30 border border-red-700 text-red-300 px-3 py-2 rounded-lg mb-4 text-xs" role="alert">
                  {error}
                </div>
              )}

              {/* --- SIMPLIFIED FORM --- */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-gray-300 mb-1">Adresse e-mail</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="vous@exemple.com"
                    className="w-full px-3 py-2 bg-gray-800/80 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:ring-1 focus:ring-emerald-500 text-sm"
                  />
                </div>

                {/* Mot de passe */}
                <div>
                  <label htmlFor="password" className="block text-xs font-medium text-gray-300 mb-1">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      placeholder="8+ caractères"
                      className="w-full px-3 py-2 bg-gray-800/80 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:ring-1 focus:ring-emerald-500 pr-9 text-sm"
                    />
                     <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-emerald-400">
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                {/* Confirmation du mot de passe */}
                <div>
                  <label htmlFor="password_confirm" className="block text-xs font-medium text-gray-300 mb-1">Confirmer le mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPasswordConfirm ? "text" : "password"}
                      id="password_confirm"
                      name="password_confirm"
                      value={form.password_confirm}
                      onChange={handleChange}
                      required
                      placeholder="Confirmez votre mot de passe"
                      className="w-full px-3 py-2 bg-gray-800/80 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:ring-1 focus:ring-emerald-500 pr-9 text-sm"
                    />
                    <button type="button" onClick={() => setShowPasswordConfirm(v => !v)} className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-emerald-400">
                      {showPasswordConfirm ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button type="submit" disabled={loading} className="w-full flex justify-center py-2.5 px-4 rounded-md text-white bg-gradient-to-r from-emerald-600 to-blue-600 disabled:opacity-50 text-sm font-medium">
                  {loading ? <LoadingSpinner /> : "Créer le compte"}
                </button>
              </form>

              {/* --- ADDED SSO SECTION --- */}
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
                  onClick={() => handleSSOSignUp("google")}
                  className="w-full inline-flex justify-center items-center py-2 px-3 border border-gray-700 rounded-md bg-gray-800 text-xs font-medium text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-gray-500 focus:ring-offset-gray-900 transition duration-150 ease-in-out"
                >
                  <GoogleIcon /> <span className="ml-1.5">S'inscrire avec Google Workspace</span>
                </button>
                <button
                  onClick={() => handleSSOSignUp("azure-ad")}
                  className="w-full inline-flex justify-center items-center py-2 px-3 border border-gray-700 rounded-md bg-gray-800 text-xs font-medium text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-gray-500 focus:ring-offset-gray-900 transition duration-150 ease-in-out"
                >
                  <MicrosoftIcon /> <span className="ml-1.5">S'inscrire avec Microsoft Entra ID</span>
                </button>
              </div>

              {/* Sign In Link */}
              <p className="mt-5 text-center text-gray-400 text-xs">
                Vous avez déjà un compte ?{" "}
                <Link href="/" className="text-emerald-400 hover:text-emerald-300">
                  Se connecter
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer with reduced size */}
      <footer className="py-3 px-4 text-center text-xs text-gray-500 border-t border-gray-800">
        © {new Date().getFullYear()} Nartex. Tous droits réservés.
      </footer>
    </div>
  );
};

export default SignUpPage;
