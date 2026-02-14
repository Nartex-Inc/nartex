// src/lib/data.ts
import {
  ProductLifecycleStage,
  TaskStatus,
  NewProductRequestStatus,
  Project,
  UserTask,
  ApprovalRequest,
  RecentActivityItem,
  NewProductRequest
} from './types';

// --- Theme-token color palette ---
export const colors = {
  primary: "hsl(var(--accent))",
  primaryHover: "hsl(var(--accent-hover))",
  primaryLight: "hsl(var(--accent-muted))",
  success: "hsl(var(--success))",
  successLight: "hsl(var(--success-muted))",
  warning: "hsl(var(--warning))",
  warningLight: "hsl(var(--warning-muted))",
  danger: "hsl(var(--danger))",
  dangerLight: "hsl(var(--danger-muted))",
};

// --- Mock Data ---
export const mockProjectsData: Project[] = [
    { id: "proj1", name: "QuadraShield MP Series", stage: ProductLifecycleStage.PROTOTYPAGE, initiator: "Jean Martin" },
    { id: "proj2", name: "EcoLube Bio+ Additif Carburant", stage: ProductLifecycleStage.EVALUATION_COUT_POTENTIEL, initiator: "Sophie Dubois" },
    { id: "proj3", name: "SintoMax Gear Oil X (Nouvelle Formule)", stage: ProductLifecycleStage.MISE_EN_MARCHE, initiator: "Chef de Produit" },
    { id: "proj4", name: "ProClean Dégraissant Industriel Bio", stage: ProductLifecycleStage.DEMANDE_IDEATION, initiator: "Ventes Nord" },
    { id: "proj5", name: "XtremeTemp Graisse G2 Haute Performance", stage: ProductLifecycleStage.PLANIFICATION_PRODUIT_FINI, initiator: "R&D Central" },
    { id: "proj6", name: "LubriCool SX Huile de Coupe Synthétique", stage: ProductLifecycleStage.COMITE_EVALUATION, initiator: "Marketing Global" },
    // --- THIS IS THE FIX ---
    { id: "proj7", name: "AeroGlide Lubrifiant Sec PTFE", stage: ProductLifecycleStage.VIE_DU_PRODUIT, initiator: "R&D Central" },
];

export const mockUserTasksData: UserTask[] = [
    { id: "task1", projectId: "proj1", projectName: "QuadraShield MP Series", description: "Finaliser design packaging", status: TaskStatus.EN_COURS, responsible: "Séléna", dueDate: "Fait JV et MD" },
    { id: "task2", projectId: "proj2", projectName: "EcoLube Bio+", description: "Analyse de marché concurrentiel", status: TaskStatus.EN_RETARD, responsible: "CPO et Ventes", dueDate: "Hier" },
    { id: "task3", projectId: "proj3", projectName: "SintoMax Gear Oil X", description: "Préparer matériel de formation", status: TaskStatus.FAIT, responsible: "Sam et JV", dueDate: "Fait" },
    { id: "task4", projectId: "proj1", projectName: "QuadraShield MP Series", description: "Test produit en application", status: TaskStatus.NON_COMPLETE, responsible: "Sup. tech", dueDate: "A venir Q3" },
    { id: "task5", projectId: "proj5", projectName: "XtremeTemp Grease G2", description: "Rédaction MSDS et réglementaire", status: TaskStatus.EN_COURS, responsible: "Stéphane", dueDate: "En cours" },
];

export const mockApprovalRequestsData: ApprovalRequest[] = [
    { id: "app1", projectId: "proj1", projectName: "QuadraShield MP Series", description: "Approbation budget prototypage (Option B)", requestedBy: "Comité", status: 'pending' },
    { id: "app2", projectId: "proj2", projectName: "EcoLube Bio+", description: "Validation spécifications techniques", requestedBy: "R&D", status: 'pending' },
    { id: "app3", projectId: "proj6", projectName: "LubriCool SX", description: "Accord Comité d'évaluation (Critères)", requestedBy: "Direction", status: 'approved' },
];

export const mockRecentActivityData: RecentActivityItem[] = [
    { id: "act1", type: "project_submission", text: `Nouveau projet <span class="font-medium text-[hsl(var(--success))]">EcoLube Bio+</span> soumis par Sophie Dubois.`, timestamp: "Il y a 30 minutes", iconType: 'project', colorClass: 'text-[hsl(var(--success))]', bgColorClass: 'bg-[hsl(var(--success-muted))]', ringColorClass: 'bg-[hsl(var(--success))]' },
    { id: "act2", type: "task_update", text: `<span class="font-medium text-[hsl(var(--warning))]">'Analyse de marché'</span> (QuadraShield MP) est en retard.`, timestamp: "Il y a 1 heure", iconType: 'alert', colorClass: 'text-[hsl(var(--warning))]', bgColorClass: 'bg-[hsl(var(--warning-muted))]', ringColorClass: 'bg-[hsl(var(--warning))]' },
    { id: "act3", type: "approval_request", text: `<span class="font-medium text-[hsl(var(--success))]">Approbation budget</span> requise pour 'QuadraShield MP'.`, timestamp: "Il y a 2 heures", iconType: 'approval', colorClass: 'text-[hsl(var(--success))]', bgColorClass: 'bg-[hsl(var(--success-muted))]', ringColorClass: 'bg-[hsl(var(--success))]' },
    { id: "act4", type: "user_join", text: `<span class="font-medium text-[hsl(var(--info))]">Martin Désy</span> a rejoint le projet <span class="font-medium text-[hsl(var(--info))]">SintoMax Gear Oil X</span>.`, timestamp: "Hier", iconType: 'user_added', colorClass: 'text-[hsl(var(--info))]', bgColorClass: 'bg-[hsl(var(--accent-muted))]', ringColorClass: 'bg-[hsl(var(--info))]' },
];

export const mockNewProductRequestsData: NewProductRequest[] = [
    { id: "npr1", projectName: "Huile Moteur Synthétique LongLife", initiator: "Ventes Auto", submissionDate: "2025-05-08", status: NewProductRequestStatus.EN_ATTENTE },
    { id: "npr2", projectName: "Nettoyant Freins Écologique", initiator: "R&D Spécialités", submissionDate: "2025-05-05", status: NewProductRequestStatus.ACCEPTE, reason: "Potentiel marché élevé." },
    { id: "npr3", projectName: "Graisse Alimentaire H1 SuperLube", initiator: "Marketing Agro", submissionDate: "2025-05-02", status: NewProductRequestStatus.REFUSE, reason: "ROI faible." },
    { id: "npr4", projectName: "Fluide Hydraulique BioDégradable HVLP", initiator: "Grand Comptes Industriels", submissionDate: "2025-04-28", status: NewProductRequestStatus.EN_ATTENTE },
    { id: "npr5", projectName: "Spray Silicone Anti-Adhérent PRO", initiator: "Support Technique", submissionDate: "2025-04-25", status: NewProductRequestStatus.ACCEPTE },
];

// --- Helper Functions ---
export const getProjectCountsByStage = (projects: Project[]): Record<ProductLifecycleStage, number> => {
  const counts = {} as Record<ProductLifecycleStage, number>;
  for (const stage of Object.values(ProductLifecycleStage)) {
    counts[stage] = 0;
  }
  projects.forEach(p => {
    if (p.stage) { 
        counts[p.stage] = (counts[p.stage] || 0) + 1;
    }
  });
  return counts;
};
