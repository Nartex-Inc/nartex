import React from 'react';

// --- Enums ---
export enum ProductLifecycleStage {
  DEMANDE_IDEATION = "Demande / Idéation",
  EVALUATION_COUT_POTENTIEL = "Évaluation Coût/Potentiel",
  COMITE_EVALUATION = "Comité d'Évaluation",
  PROTOTYPAGE = "Prototypage",
  MISE_EN_FONCTION_DEVELOPPEMENT = "Mise en fonction / Développement",
  PLANIFICATION_PRODUIT_FINI = "Planification Produit Fini",
  MISE_EN_MARCHE = "Mise en Marché",
  VIE_DU_PRODUIT = "Vie du Produit",
  ARCHIVE = "Archivé"
}

export enum TaskStatus {
  NON_COMPLETE = "Non Complété",
  EN_COURS = "En Cours",
  EN_EVALUATION = "En Évaluation",
  FAIT = "Fait",
  EN_RETARD = "En Retard",
  NON_APPLICABLE = "Non Applicable"
}

export enum NewProductRequestStatus {
  EN_ATTENTE = "En attente",
  ACCEPTE = "Accepté",
  REFUSE = "Refusé"
}

// --- Type Interfaces ---
export interface ProjectSummary {
  id: string;
  name: string;
  stage: ProductLifecycleStage;
  initiator?: string;
}

export interface UserTask {
  id: string;
  projectId: string;
  projectName: string;
  description: string;
  status: TaskStatus;
  responsible: string;
  dueDate?: string;
}

export interface ApprovalRequest {
  id: string;
  projectId: string;
  projectName: string;
  description: string;
  requestedBy: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface RecentActivityItem {
  id: string;
  type: 'project_submission' | 'option_advanced' | 'task_update' | 'delivery_alert' | 'approval_request' | 'user_join' | 'comment';
  text: string;
  timestamp: string;
  iconType: 'project' | 'task_completed' | 'user_added' | 'comment' | 'alert' | 'edit' | 'approval';
  colorClass: string;
  bgColorClass: string;
  ringColorClass: string;
}

export interface NewProductRequest {
  id: string;
  projectName: string;
  initiator: string;
  submissionDate: string;
  status: NewProductRequestStatus;
  reason?: string;
}

export interface NavItem {
  href: string;
  title: string;
  icon: React.ElementType; // Use React.ElementType for component icons
  active?: boolean;
  badge?: number | null;
  badgeColor?: "warning" | "primary";
}