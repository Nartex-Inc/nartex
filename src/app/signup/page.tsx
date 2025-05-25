"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from 'next/navigation';

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

const LoadingSpinner: React.FC<{ className?: string }> = ({ className = "h-5 w-5 text-white" }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4 text-white" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
  </svg>
);

const SignUpPage = () => {
  const router = useRouter();
  const [form, setForm] = useState({
    given_name: "",
    family_name: "",
    email: "",
    phone_number: "", // Make sure your API and Prisma schema handle this
    gender: "male",    // Make sure your API and Prisma schema handle this
    password: "",
    password_confirm: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState<boolean>(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.password_confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    // Optional: Add more client-side validation like password length
    if (form.password.length < 8) {
        setError("Le mot de passe doit comporter au moins 8 caractères.");
        return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/signup", { // Your API endpoint for signup
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ // Send only necessary fields for signup API
          given_name: form.given_name,
          family_name: form.family_name,
          email: form.email,
          password: form.password,
          password_confirm: form.password_confirm, // API might re-validate
          // phone_number: form.phone_number, // Only if your /api/signup expects and uses it
          // gender: form.gender,             // Only if your /api/signup expects and uses it
        }),
      });

      const body = await res.json();

      if (!res.ok || !body.success) { // Check res.ok for HTTP status + body.success for application-level success
        setError(body.error || "Impossible de créer le compte. Veuillez réessayer.");
      } else {
        // Success: User created, verification email sent
        router.push("/?emailVerificationSent=true"); // Redirect to login page with a message
      }
    } catch (err) {
      console.error("Signup fetch error:", err); // Log the actual error
      setError("Une erreur s'est produite lors de la communication avec le serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-950 to-black text-gray-100 font-sans">
      {/* Backdrop Circles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500 rounded-full opacity-5 blur-3xl" />
        <div className="absolute top-1/2 right-1/3 w-96 h-96 bg-blue-500 rounded-full opacity-5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-black/80 backdrop-blur-md border-b border-white/5 py-4 px-4">
        <div className="container mx-auto px-4 flex items-center">
          <Image
            src="/nartex-logo.svg"
            alt="Nartex Logo"
            width={85}
            height={21}
            priority
            className="inline-block filter invert"
            onError={(e) => (e.currentTarget.src = 'https://placehold.co/85x21/ffffff/000000?text=Nartex')}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-6 px-4 relative z-10 overflow-hidden">
        <div className="flex w-full max-w-5xl">
          <div className="hidden lg:flex lg:flex-col lg:w-1/2 p-12 pr-8">
            {/* Left Marketing Content */}
            <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">Rejoignez Nartex</h1>
            <p className="text-lg mb-8 text-gray-300">Découvrez la plateforme de gestion centralisée qui révolutionne votre productivité et transforme radicalement vos flux de travail.</p>
            
            <div className="space-y-8">
              <div className="flex items-start">
                <div className="mt-1 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full p-1.5 mr-4">
                  <CheckIcon />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">Sécurité inégalée</h3>
                  <p className="text-gray-400">Protection blindée de vos données avec chiffrement de niveau militaire et conformité aux normes internationales les plus strictes</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="mt-1 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full p-1.5 mr-4">
                  <CheckIcon />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">Intégration parfaite</h3>
                  <p className="text-gray-400">Synchronisation instantanée avec tous vos outils existants, éliminant les silos de données et unifiant votre écosystème numérique</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="mt-1 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full p-1.5 mr-4">
                  <CheckIcon />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">Support 24/7</h3>
                  <p className="text-gray-400">Une équipe d'experts dédiés toujours à vos côtés pour assurer votre réussite, avec un temps de réponse moyen de moins de 15 minutes</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Signup Form */}
          <div className="w-full lg:w-1/2 px-6">
            <div className="bg-gray-900/70 backdrop-blur-lg border border-gray-800 rounded-xl shadow-2xl p-8 md:p-10">
              <div className="lg:hidden flex justify-center mb-6">
                <Image
                  src="/nartex-logo.svg"
                  alt="Nartex Logo"
                  width={120}
                  height={30}
                  priority
                  className="inline-block filter invert"
                  onError={(e) => (e.currentTarget.src = 'https://placehold.co/120x30/ffffff/000000?text=Nartex')}
                />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white text-center lg:text-left">Créer un compte</h2>
              <p className="text-gray-400 mb-8 text-center lg:text-left">Remplissez les champs suivants pour vous enregistrer</p>
              
              {error && (
                <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-6 text-sm" role="alert">
                  <span className="block sm:inline">{error}</span>
                </div>
              )}

              {/* Sign Up Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Prénom */}
                  <div>
                    <label htmlFor="given_name" className="block text-sm font-medium text-gray-300 mb-1.5">Prénom</label>
                    <input
                      type="text"
                      id="given_name"
                      name="given_name"
                      value={form.given_name}
                      onChange={handleChange}
                      required
                      placeholder="Votre prénom"
                      className="appearance-none block w-full px-4 py-3 text-base border border-gray-700 rounded-lg bg-gray-800/80 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition duration-150 ease-in-out"
                    />
                  </div>
                  
                  {/* Nom de famille */}
                  <div>
                    <label htmlFor="family_name" className="block text-sm font-medium text-gray-300 mb-1.5">Nom de famille</label>
                    <input
                      type="text"
                      id="family_name"
                      name="family_name"
                      value={form.family_name}
                      onChange={handleChange}
                      required
                      placeholder="Votre nom"
                      className="appearance-none block w-full px-4 py-3 text-base border border-gray-700 rounded-lg bg-gray-800/80 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition duration-150 ease-in-out"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">Adresse e-mail</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="vous@exemple.com"
                    className="appearance-none block w-full px-4 py-3 text-base border border-gray-700 rounded-lg bg-gray-800/80 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition duration-150 ease-in-out"
                  />
                </div>

                {/* Téléphone (Optional based on your API and DB Schema) */}
                <div>
                  <label htmlFor="phone_number" className="block text-sm font-medium text-gray-300 mb-1.5">Téléphone</label>
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={form.phone_number}
                    onChange={handleChange}
                    // required // Make this optional if not strictly needed for signup
                    placeholder="e.g. +33612345678 (Optionnel)"
                    className="appearance-none block w-full px-4 py-3 text-base border border-gray-700 rounded-lg bg-gray-800/80 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition duration-150 ease-in-out"
                  />
                </div>

                {/* Genre (Optional based on your API and DB Schema) */}
                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-300 mb-1.5">Genre</label>
                  <select
                    id="gender"
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    // required // Make this optional if not strictly needed for signup
                    className="appearance-none block w-full px-4 py-3 text-base border border-gray-700 rounded-lg bg-gray-800/80 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition duration-150 ease-in-out"
                  >
                    <option value="">Préfère ne pas spécifier</option> {/* Add a default/empty option */}
                    <option value="male">Homme</option>
                    <option value="female">Femme</option>
                    <option value="other">Autre</option>
                  </select>
                </div>

                {/* Mot de passe */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      placeholder="Choisissez un mot de passe"
                      className="appearance-none block w-full px-4 py-3 text-base pr-10 border border-gray-700 rounded-lg bg-gray-800/80 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition duration-150 ease-in-out"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-emerald-400 focus:outline-none"
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                {/* Confirmation du mot de passe */}
                <div>
                  <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-300 mb-1.5">Confirmer le mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPasswordConfirm ? "text" : "password"}
                      id="password_confirm"
                      name="password_confirm"
                      value={form.password_confirm}
                      onChange={handleChange}
                      required
                      placeholder="Confirmez votre mot de passe"
                      className="appearance-none block w-full px-4 py-3 text-base pr-10 border border-gray-700 rounded-lg bg-gray-800/80 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition duration-150 ease-in-out"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm((v) => !v)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-emerald-400 focus:outline-none"
                      aria-label={showPasswordConfirm ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPasswordConfirm ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center py-3 px-4 rounded-lg text-base font-medium text-white bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-gray-900 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {loading ? <LoadingSpinner /> : "Créer un compte"}
                  </button>
                </div>
              </form>

              {/* Sign In Link */}
              <p className="mt-6 text-center text-gray-400 text-sm">
                Vous avez déjà un compte ?{" "}
                <Link
                  href="/"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  Se connecter
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 px-4 text-center text-xs text-gray-500 border-t border-gray-800">
        <p className="mb-1">© {new Date().getFullYear()} Nartex. Tous droits réservés.</p>
        <div className="flex justify-center items-center space-x-4">
          <Link href="/terms" className="hover:text-gray-300 transition">Conditions</Link>
          <span className="text-gray-600" aria-hidden="true">•</span>
          <Link href="/privacy" className="hover:text-gray-300 transition">Confidentialité</Link>
          <span className="text-gray-600" aria-hidden="true">•</span>
          <Link href="/contact" className="hover:text-gray-300 transition">Contact</Link>
        </div>
      </footer>
    </div>
  );
};

export default SignUpPage;