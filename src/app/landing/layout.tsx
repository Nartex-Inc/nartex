import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nartex | Plateforme de gestion d'affaires intelligente",
  description:
    "Automatisez vos retours, visualisez vos ventes et accélérez votre croissance. Nartex unifie votre CRM, ERP et BI dans une seule plateforme.",
  openGraph: {
    title: "Nartex | Plateforme de gestion d'affaires intelligente",
    description:
      "Automatisez vos retours, visualisez vos ventes et accélérez votre croissance.",
    url: "https://nartex.ca",
    siteName: "Nartex",
    locale: "fr_CA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nartex | Plateforme de gestion d'affaires intelligente",
    description:
      "Automatisez vos retours, visualisez vos ventes et accélérez votre croissance.",
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
