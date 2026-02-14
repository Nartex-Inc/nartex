// src/app/auth/error/page.tsx
"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function AuthErrorContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");

    let errorMessage = "Une erreur d'authentification s'est produite.";
    if (error) {
        switch (error) {
            case "OAuthSignin":
            case "OAuthCallback":
            case "OAuthCreateAccount":
            case "EmailCreateAccount":
            case "Callback":
                errorMessage = "Erreur lors de la connexion avec un fournisseur externe. Veuillez réessayer.";
                break;
            case "OAuthAccountNotLinked":
                errorMessage = "Cet e-mail est déjà utilisé avec un autre mode de connexion. Essayez de vous connecter avec ce mode.";
                break;
            case "EmailSignin":
                errorMessage = "Impossible d'envoyer l'e-mail de connexion.";
                break;
            case "CredentialsSignin":
                errorMessage = "Échec de la connexion. Vérifiez vos identifiants.";
                break;
            case "SessionRequired":
                 errorMessage = "Vous devez être connecté pour accéder à cette page.";
                 break;
            default:
                errorMessage = `Erreur: ${error}`;
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(var(--bg-base))] text-[hsl(var(--text-primary))] p-6">
            <div className="bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border-default))] p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
                <h1 className="text-2xl font-bold mb-4 text-[hsl(var(--danger))]">Erreur d&apos;Authentification</h1>
                <p className="mb-6 text-[hsl(var(--text-secondary))]">{errorMessage}</p>
                <Link href="/" className="mt-4 inline-block bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-hover))] text-white font-bold py-2.5 px-5 rounded-xl transition-colors">
                    Retour à la page de connexion
                </Link>
            </div>
        </div>
    );
}

export default function AuthErrorPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[hsl(var(--bg-base))] text-[hsl(var(--text-primary))]">Chargement des informations d&apos;erreur...</div>}>
            <AuthErrorContent />
        </Suspense>
    );
}
