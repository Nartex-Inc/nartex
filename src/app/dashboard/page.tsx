// src/app/dashboard/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { StatCard } from "@/components/dashboard/stat-card";
// 1. IMPORT the new Kanban view and its data type
import { PipelineKanbanView, KanbanStage } from "@/components/dashboard/pipeline-kanban-view";

// 2. REMOVED NewProductRequestsTable and RecentActivity imports.

import {
  mockProjectsData,
  // REMOVED mockNewProductRequestsData and mockRecentActivityData
} from "@/lib/data";
import { ProductLifecycleStage, Project } from "@/lib/types";
import { Check, Zap, Clock } from "lucide-react";

// The configuration for our pipeline stages remains the same.
const STAGE_CONFIG = [
    { id: ProductLifecycleStage.DEMANDE_IDEATION, name: 'Demande / Idéation', color: '#3b82f6' },
    { id: ProductLifecycleStage.EVALUATION_COUT_POTENTIEL, name: 'Évaluation Coût/Potentiel', color: '#8b5cf6' },
    { id: ProductLifecycleStage.PROTOTYPAGE, name: 'Prototypage', color: '#ec4899' },
    { id: ProductLifecycleStage.MISE_EN_FONCTION_DEVELOPPEMENT, name: 'Mise en Fonction / Développement', color: '#f97316' },
    { id: ProductLifecycleStage.PLANIFICATION_PRODUIT_FINI, name: 'Planification Produit Fini', color: '#10b981' },
    { id: ProductLifecycleStage.MISE_EN_MARCHE, name: 'Mise en Marché', color: '#6366f1' },
    { id: ProductLifecycleStage.VIE_DU_PRODUIT, name: 'Vie du Produit', color: '#64748b' },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  
  const projects: Project[] = mockProjectsData;

  // Prepare data for the Kanban view
  const pipelineDataForKanban: KanbanStage[] = STAGE_CONFIG.map(config => ({
    ...config,
    projects: projects.filter(p => p.stage === config.id),
  }));

  if (!session) {
    return <div className="p-8">Loading...</div>;
  }

  const userName = session.user.name || session.user.email?.split('@')[0] || "User";

  return (
    <div className="flex-1 space-y-8 p-6 md:p-10">
      <WelcomeBanner
        userName={userName}
        activeProjectsCount={5}
        overdueTasksCount={2}
        pendingApprovalsCount={3}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Stat cards remain unchanged */}
        <StatCard
          title="Projets Complétés"
          value="12"
          label="ce trimestre"
          description={<span><strong className="text-emerald-500">+20%</strong> par rapport au dernier</span>}
          icon={<Check className="h-8 w-8 text-emerald-500" />}
          linkText="Voir les projets"
          linkUrl="/dashboard/projects?status=completed"
        />
        <StatCard
          title="Efficacité du Pipeline"
          value="92%"
          label="taux de réussite"
          description="Basé sur les projets passant de l'idéation au lancement."
          icon={<Zap className="h-8 w-8 text-blue-500" />}
          linkText="Analyser le pipeline"
          linkUrl="/dashboard/pipeline-analytics"
        />
        <StatCard
          title="Temps de Cycle Moyen"
          value="28 jours"
          label="par projet"
          description={<span><strong className="text-red-500">-5%</strong> plus lent que l'objectif</span>}
          icon={<Clock className="h-8 w-8 text-amber-500" />}
          linkText="Voir les métriques"
          linkUrl="/dashboard/metrics/cycle-time"
        />
      </div>

      {/* 
        3. KEY CHANGE: The two-column grid has been completely removed.
        We now render the PipelineKanbanView directly. Because it's a block-level
        element, it will automatically take up the full available width of its parent container.
      */}
      <div>
        <PipelineKanbanView stages={pipelineDataForKanban} />
      </div>

    </div>
  );
}
