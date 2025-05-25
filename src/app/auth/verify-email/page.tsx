// src/app/auth/verify-email/page.tsx
"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

// Professional Loading Spinner Component
const ProfessionalSpinner: React.FC<{ className?: string }> = ({ className = "w-12 h-12" }) => (
  <svg
    className={`animate-spin ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    // Using a green color similar to AWS success green
    // Tailwind equivalent would be text-green-600 or text-emerald-600
    // For direct color: style={{ color: '#23A455' }} or use a CSS variable
    style={{ color: '#1D8102' }} // A darker, rich green
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

// Checkmark Icon for Success
const SuccessCheckmark: React.FC<{ className?: string }> = ({ className = "w-16 h-16 text-green-500" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);


function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("Vérification de votre e-mail en cours...");

  useEffect(() => {
    if (!token) {
      setMessage("Jeton de vérification manquant ou invalide.");
      setStatus("error");
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setMessage(data.message || "E-mail vérifié avec succès ! Redirection en cours...");
          setStatus("success");
          setTimeout(() => router.push("/?confirmed=true"), 2500); // Redirect to login
        } else {
          setMessage(data.error || "Échec de la vérification de l'e-mail. Le lien est peut-être invalide ou a expiré.");
          setStatus("error");
        }
      } catch (err) {
        console.error("Verification API error:", err);
        setMessage("Une erreur de communication est survenue. Veuillez réessayer plus tard.");
        setStatus("error");
      }
    };

    // Add a small delay before starting verification for better UX with spinner
    const verificationTimer = setTimeout(() => {
      verifyToken();
    }, 500);

    return () => clearTimeout(verificationTimer);

  }, [token, router]); // router added as dependency for setTimeout

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-gray-100 p-6 font-sans">
      <div className="bg-gray-800 p-8 md:p-12 rounded-xl shadow-2xl text-center max-w-lg w-full border border-gray-700">
        {status === "verifying" && (
          <>
            <ProfessionalSpinner className="w-16 h-16 mx-auto mb-6" />
            <h1 className="text-2xl font-semibold mb-3 text-white">Vérification en Cours</h1>
            <p className="text-gray-400">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <SuccessCheckmark className="w-20 h-20 mx-auto mb-5 text-green-500" />
            <h1 className="text-2xl font-semibold mb-3 text-green-400">Vérification Réussie !</h1>
            <p className="text-gray-300 mb-6">{message}</p>
            <Link
              href="/"
              className="mt-2 inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-6 rounded-lg text-sm transition-colors duration-150"
            >
              Aller à la Connexion
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            {/* Optional: Add an error icon */}
            <svg className="w-20 h-20 mx-auto mb-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <h1 className="text-2xl font-semibold mb-3 text-red-400">Erreur de Vérification</h1>
            <p className="text-gray-300 mb-6">{message}</p>
            <Link
              href="/"
              className="mt-2 inline-block bg-gray-600 hover:bg-gray-500 text-white font-medium py-3 px-6 rounded-lg text-sm transition-colors duration-150"
            >
              Retour à la Connexion
            </Link>
          </>
        )}
      </div>
      <p className="mt-8 text-xs text-gray-500">
        © {new Date().getFullYear()} Nartex. Tous droits réservés.
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    // Suspense fallback is still good for the initial load of the VerifyEmailContent component
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-gray-100 p-6">
        <ProfessionalSpinner className="w-16 h-16 mx-auto mb-6" />
        <p className="text-gray-400">Chargement de la page de vérification...</p>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}