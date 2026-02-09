// src/lib/support-constants.ts
// Constants and utility functions for the IT Support Ticketing system

// =============================================================================
// CATEGORIES & SUBCATEGORIES
// =============================================================================

export const SUPPORT_CATEGORIES = {
  materiel: {
    label: "Matériel",
    subcategories: [
      { value: "ordinateur", label: "Ordinateur (PC/Laptop)" },
      { value: "peripherique", label: "Périphérique (souris, clavier, écran)" },
      { value: "imprimante", label: "Imprimante / Scanner" },
      { value: "telephone", label: "Téléphone / Headset" },
      { value: "reseau", label: "Équipement réseau" },
    ]
  },
  logiciel: {
    label: "Logiciel",
    subcategories: [
      { value: "installation", label: "Installation / Mise à jour" },
      { value: "erreur", label: "Erreur / Bug" },
      { value: "acces", label: "Accès / Permissions" },
      { value: "office365", label: "Office 365 / Teams" },
      { value: "erp", label: "ERP / Prextra" },
      { value: "nartex", label: "Nartex" },
    ]
  },
  reseau: {
    label: "Réseau & Connectivité",
    subcategories: [
      { value: "internet", label: "Connexion Internet" },
      { value: "vpn", label: "VPN" },
      { value: "wifi", label: "Wi-Fi" },
      { value: "partage", label: "Partage de fichiers" },
    ]
  },
  compte: {
    label: "Compte & Accès",
    subcategories: [
      { value: "creation", label: "Création de compte" },
      { value: "reinitialisation", label: "Réinitialisation mot de passe" },
      { value: "permissions", label: "Permissions / Droits" },
      { value: "desactivation", label: "Désactivation de compte" },
    ]
  },
  autre: {
    label: "Autre",
    subcategories: [
      { value: "question", label: "Question générale" },
      { value: "formation", label: "Formation / Aide" },
      { value: "suggestion", label: "Suggestion d'amélioration" },
    ]
  }
} as const;

export type CategoryKey = keyof typeof SUPPORT_CATEGORIES;

// =============================================================================
// IMPACT OPTIONS
// =============================================================================

export const IMPACT_OPTIONS = [
  { value: "individuel", label: "Individuel", description: "Affecte uniquement moi" },
  { value: "equipe", label: "Équipe", description: "Affecte mon équipe immédiate" },
  { value: "departement", label: "Département", description: "Affecte tout le département" },
  { value: "organisation", label: "Organisation", description: "Affecte plusieurs départements" },
] as const;

// =============================================================================
// SCOPE/PORTÉE OPTIONS
// =============================================================================

export const PORTEE_OPTIONS = [
  { value: "un", label: "Un utilisateur", description: "Je suis le seul affecté" },
  { value: "plusieurs", label: "Plusieurs utilisateurs", description: "2-10 personnes affectées" },
  { value: "departement", label: "Département entier", description: "10+ personnes" },
  { value: "critique", label: "Système critique", description: "Processus d'affaires bloqué" },
] as const;

// =============================================================================
// URGENCY OPTIONS
// =============================================================================

export const URGENCE_OPTIONS = [
  { value: "basse", label: "Basse", description: "Peut attendre quelques jours" },
  { value: "moyenne", label: "Moyenne", description: "Important mais pas bloquant" },
  { value: "haute", label: "Haute", description: "Bloque mon travail" },
  { value: "critique", label: "Critique", description: "Arrêt de production / Urgence" },
] as const;

// =============================================================================
// PRIORITY CALCULATION
// =============================================================================

export type Priority = "P1" | "P2" | "P3" | "P4";

export interface PriorityInfo {
  priority: Priority;
  label: string;
  color: string;
  bgColor: string;
  slaHours: number;
}

export function calculatePriority(impact: string, portee: string, urgence: string): Priority {
  const impactScore: Record<string, number> = { individuel: 1, equipe: 2, departement: 3, organisation: 4 };
  const porteeScore: Record<string, number> = { un: 1, plusieurs: 2, departement: 3, critique: 4 };
  const urgenceScore: Record<string, number> = { basse: 1, moyenne: 2, haute: 3, critique: 4 };

  const total = (impactScore[impact] || 1) + (porteeScore[portee] || 1) + (urgenceScore[urgence] || 1);

  if (total >= 10) return "P1";  // Critical
  if (total >= 7) return "P2";   // High
  if (total >= 4) return "P3";   // Medium
  return "P4";                    // Low
}

export function getPriorityInfo(priority: Priority): PriorityInfo {
  const priorities: Record<Priority, PriorityInfo> = {
    P1: {
      priority: "P1",
      label: "Critique",
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      slaHours: 2,
    },
    P2: {
      priority: "P2",
      label: "Haute",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
      slaHours: 4,
    },
    P3: {
      priority: "P3",
      label: "Moyenne",
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
      slaHours: 24,
    },
    P4: {
      priority: "P4",
      label: "Basse",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      slaHours: 72,
    },
  };
  return priorities[priority];
}

// =============================================================================
// SITES BY TENANT
// =============================================================================

export const SITES_BY_TENANT: Record<string, { value: string; label: string }[]> = {
  sinto: [
    { value: "granby-siege", label: "Granby - Siège social" },
    { value: "boucherville", label: "Boucherville" },
    { value: "toronto", label: "Toronto" },
    { value: "tele-travail", label: "Télétravail" },
  ],
  prolab: [
    { value: "drummondville", label: "Drummondville" },
    { value: "tele-travail", label: "Télétravail" },
  ],
  otoprotec: [
    { value: "granby-oto", label: "Granby - Otoprotec" },
    { value: "tele-travail", label: "Télétravail" },
  ],
  lubrilab: [
    { value: "granby-lubri", label: "Granby - Lubrilab" },
    { value: "tele-travail", label: "Télétravail" },
  ],
  // Fallback for unknown tenants
  default: [
    { value: "bureau-principal", label: "Bureau principal" },
    { value: "tele-travail", label: "Télétravail" },
  ],
};

export function getSitesForTenant(tenantSlug: string | null | undefined): { value: string; label: string }[] {
  if (!tenantSlug) return SITES_BY_TENANT.default;
  return SITES_BY_TENANT[tenantSlug.toLowerCase()] || SITES_BY_TENANT.default;
}

// =============================================================================
// DEPARTMENTS
// =============================================================================

export const DEPARTEMENTS = [
  { value: "administration", label: "Administration" },
  { value: "comptabilite", label: "Comptabilité / Finances" },
  { value: "ventes", label: "Ventes" },
  { value: "marketing", label: "Marketing" },
  { value: "production", label: "Production" },
  { value: "logistique", label: "Logistique / Expédition" },
  { value: "rd", label: "R&D" },
  { value: "qualite", label: "Qualité" },
  { value: "rh", label: "Ressources humaines" },
  { value: "ti", label: "TI" },
  { value: "direction", label: "Direction" },
  { value: "autre", label: "Autre" },
] as const;

// =============================================================================
// TENANT TO ENTITÉ MAPPING (for Monday.com integration)
// =============================================================================

export const TENANT_ENTITE_MAP: Record<string, string> = {
  sinto: "SINTO",
  prolab: "PROLAB",
  otoprotec: "Otoprotec",
  lubrilab: "Lubrilab",
};

export function getEntiteForTenant(tenantSlug: string | null | undefined): string | null {
  if (!tenantSlug) return null;
  return TENANT_ENTITE_MAP[tenantSlug.toLowerCase()] || null;
}

// =============================================================================
// TICKET STATUS
// =============================================================================

export const TICKET_STATUSES = [
  { value: "nouveau", label: "Nouveau", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  { value: "en_cours", label: "En cours", color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  { value: "en_attente", label: "En attente", color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-100 dark:bg-yellow-900/30" },
  { value: "resolu", label: "Résolu", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30" },
  { value: "ferme", label: "Fermé", color: "text-neutral-600 dark:text-neutral-400", bgColor: "bg-neutral-100 dark:bg-neutral-900/30" },
] as const;

export type TicketStatus = typeof TICKET_STATUSES[number]["value"];
