// src/app/privacy/page.tsx

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de Confidentialité | Nartex",
  description: "Politique de confidentialité pour la plateforme Nartex.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-[hsl(var(--bg-base))] min-h-screen">
      <header className="bg-[hsl(var(--bg-surface))] border-b border-[hsl(var(--border-default))] py-4 px-6">
        <Link href="/" className="font-bold text-xl text-[hsl(var(--text-primary))]">
          Nartex
        </Link>
      </header>
      <main className="container mx-auto max-w-4xl py-12 px-6">
        <div className="prose prose-lg dark:prose-invert">
          <h1>Politique de Confidentialité</h1>
          <p className="lead">Dernière mise à jour : 23 juin 2025</p>

          <p>
            Bienvenue sur Nartex. Nous nous engageons à protéger votre vie privée. Cette politique de confidentialité explique comment nous collectons, utilisons, divulguons et protégeons vos informations lorsque vous utilisez notre plateforme.
          </p>

          <h2>1. Informations que nous collectons</h2>
          <p>
            Nous pouvons collecter des informations personnelles que vous nous fournissez directement lorsque vous vous inscrivez ou utilisez nos services, telles que :
          </p>
          <ul>
            <li>Nom et Prénom</li>
            <li>Adresse e-mail</li>
            <li>Informations de base du profil fournies par les fournisseurs d&apos;authentification (Google, Microsoft), telles que votre photo de profil.</li>
          </ul>

          <h2>2. Comment nous utilisons vos informations</h2>
          <p>
            Nous utilisons les informations que nous collectons pour :
          </p>
          <ul>
            <li>Fournir, exploiter et maintenir notre service.</li>
            <li>Améliorer, personnaliser et développer notre service.</li>
            <li>Communiquer avec vous, y compris pour le service client et le support.</li>
            <li>Traiter vos transactions et gérer vos commandes.</li>
            <li>Assurer la sécurité de notre plateforme.</li>
          </ul>

          <h2>3. Partage de vos informations</h2>
          <p>
            Nous ne partageons pas vos informations personnelles avec des tiers, sauf pour nous conformer à la loi ou pour protéger nos droits.
          </p>

          <h2>4. Sécurité des données</h2>
          <p>
            Nous utilisons des mesures de sécurité administratives, techniques et physiques pour protéger vos informations personnelles.
          </p>

          <h2>5. Vos droits</h2>
          <p>
            Vous avez le droit d&apos;accéder, de corriger ou de supprimer vos données personnelles. Vous pouvez gérer votre compte et vos données depuis votre tableau de bord.
          </p>

          <h2>6. Contact</h2>
          <p>
            Si vous avez des questions concernant cette politique de confidentialité, veuillez nous contacter à :
            <a href="mailto:support@nartex.ca"> support@nartex.ca</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
