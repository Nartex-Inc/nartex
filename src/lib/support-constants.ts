// src/lib/support-constants.ts
// Constants and utility functions for the IT Support Ticketing system

// =============================================================================
// CATEGORIES & SUBCATEGORIES
// =============================================================================

export const SUPPORT_CATEGORIES = {
  materiel: {
    label: "Problème matériel (souris, clavier, écran, ordinateur qui ne démarre pas)",
  },
  logiciel: {
    label: "Problème de logiciel / application (bug, lenteur, installation)",
  },
  connexion: {
    label: "Problème de connexion (Internet, Wi-Fi, VPN)",
  },
  authentification: {
    label: "Problème d'authentification (mot de passe, connexion à une app)",
  },
  permission: {
    label: "Problème de permission",
  },
  configuration: {
    label: "Changement de configuration",
  },
  licence: {
    label: "Assignation de licence",
  },
  securite: {
    label: "Enjeu de sécurité",
  },
  commande_materiel: {
    label: "Commande de matériel TI",
  },
  projet: {
    label: "Projet",
  },
  autre: {
    label: "Autre",
  },
} as const;

export type CategoryKey = keyof typeof SUPPORT_CATEGORIES;

// =============================================================================
// APPAREILS (DEVICES) - for regular support tickets
// =============================================================================

export const APPAREILS = [
  { value: "desktop", label: "Desktop (PC)" },
  { value: "laptop", label: "Laptop (PC)" },
  { value: "ipad", label: "iPad" },
  { value: "iphone", label: "iPhone" },
  { value: "imprimante", label: "Imprimante" },
  { value: "scanneur", label: "Scanneur" },
  { value: "telephone_ip", label: "Téléphone IP" },
  { value: "na", label: "N/A" },
] as const;

// =============================================================================
// ÉQUIPEMENTS TI - for equipment order requests
// =============================================================================

export const EQUIPEMENTS_TI = [
  { value: "telephone_voip", label: "Téléphone VoIP fixe" },
  { value: "cellulaire", label: "Cellulaire" },
  { value: "imprimante", label: "Imprimante" },
  { value: "docking_station", label: "Docking station" },
  { value: "laptop", label: "Laptop" },
  { value: "ordinateur", label: "Ordinateur" },
  { value: "moniteur", label: "Moniteur d'affichage" },
  { value: "micro", label: "Micro" },
  { value: "souris", label: "Souris" },
  { value: "clavier", label: "Clavier" },
  { value: "webcam", label: "Webcam" },
  { value: "haut_parleurs", label: "Haut-parleurs" },
] as const;

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
      color: "text-[hsl(var(--danger))]",
      bgColor: "bg-[hsl(var(--danger-muted))]",
      slaHours: 2,
    },
    P2: {
      priority: "P2",
      label: "Haute",
      color: "text-[hsl(var(--warning))]",
      bgColor: "bg-[hsl(var(--warning-muted))]",
      slaHours: 4,
    },
    P3: {
      priority: "P3",
      label: "Moyenne",
      color: "text-[hsl(var(--warning))]",
      bgColor: "bg-[hsl(var(--warning-muted))]",
      slaHours: 24,
    },
    P4: {
      priority: "P4",
      label: "Basse",
      color: "text-[hsl(var(--success))]",
      bgColor: "bg-[hsl(var(--success-muted))]",
      slaHours: 72,
    },
  };
  return priorities[priority];
}

// =============================================================================
// SITES (simplified - same for all tenants)
// =============================================================================

export const SITES = [
  { value: "bureau", label: "Bureau" },
  { value: "tele-travail", label: "Télétravail" },
] as const;

export function getSitesForTenant(_tenantSlug: string | null | undefined): { value: string; label: string }[] {
  return [...SITES];
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
  { value: "nouveau", label: "Nouveau", color: "text-[hsl(var(--info))]", bgColor: "bg-[hsl(var(--info-muted))]" },
  { value: "en_cours", label: "En cours", color: "text-[hsl(var(--accent))]", bgColor: "bg-[hsl(var(--accent-muted))]" },
  { value: "en_attente", label: "En attente", color: "text-[hsl(var(--warning))]", bgColor: "bg-[hsl(var(--warning-muted))]" },
  { value: "resolu", label: "Résolu", color: "text-[hsl(var(--success))]", bgColor: "bg-[hsl(var(--success-muted))]" },
  { value: "ferme", label: "Fermé", color: "text-[hsl(var(--text-muted))]", bgColor: "bg-[hsl(var(--bg-muted))]" },
] as const;

export type TicketStatus = typeof TICKET_STATUSES[number]["value"];
