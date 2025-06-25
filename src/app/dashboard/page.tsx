// src/app/dashboard/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { StatCard } from "@/components/dashboard/stat-card";
import { NewProductRequestsTable } from "@/components/dashboard/new-product-requests-table";
// 1. IMPORT the new Kanban view and its data type
import { PipelineKanbanView, KanbanStage } from "@/components/dashboard/pipeline-kanban-view";

import {
  mockProjectsData,
  mockNewProductRequestsData,
  mockRecentActivityData,
} from "@/lib/data";
import { ProductLifecycleStage, Project } from "@/lib/types";
import { Check, Zap, Clock } from "lucide-react";

// 2. DEFINE the configuration for our pipeline stages, including colors.
// This gives us full control over order, naming, and appearance.
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

  // 3. PREPARE data for the Kanban view
  // We transform the flat project list into the structured format our Kanban view needs.
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
        <StatCard /* ... props */ />
        <StatCard /* ... props */ />
        <StatCard /* ... props */ />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          
          {/* 4. REPLACE the old grid with the new, single component */}
          <PipelineKanbanView stages={pipelineDataForKanban} />

          <section>
            <NewProductRequestsTable requests={mockNewProductRequestsData} />
          </section>
        </div>

        <aside className="lg:col-span-1">
          <RecentActivity activities={mockRecentActivityData} />
        </aside>
      </div>
    </div>
  );
}
