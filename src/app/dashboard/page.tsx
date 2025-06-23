// src/app/dashboard/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { PipelineCard } from "@/components/dashboard/pipeline-card";
import { NewProductRequestsTable } from "@/components/dashboard/new-product-requests-table";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  mockProjectsData, // This is now an array of 'Project'
  mockNewProductRequestsData,
  getProjectCountsByStage,
  mockRecentActivityData,
} from "@/lib/data";
import { ProductLifecycleStage, Project } from "@/lib/types"; // Import Project type
import { Check, Zap, Clock } from "lucide-react";

export default function DashboardPage() {
  const { data: session } = useSession();
  
  // Explicitly type projects to ensure type safety
  const projects: Project[] = mockProjectsData;
  const projectCountsByStage = getProjectCountsByStage(projects);

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
          linkUrl="/dashboard/rd/pipeline"
        />
        <StatCard
          title="Temps de Cycle Moyen"
          value="28 jours"
          label="par projet"
          description={<span><strong className="text-red-500">-5%</strong> plus lent que l'objectif</span>}
          icon={<Clock className="h-8 w-8 text-amber-500" />}
          linkText="Voir les métriques"
          linkUrl="/dashboard/analytics/cycle-time"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-4">
              Pipeline de Lancement de Produit
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {Object.values(ProductLifecycleStage)
                .filter((stage) => stage !== ProductLifecycleStage.ARCHIVE)
                .map((stage) => (
                  <PipelineCard
                    key={stage}
                    stage={stage}
                    count={projectCountsByStage[stage] || 0}
                    // This line is now type-safe because mockProjectsData is an array of Project
                    projects={projects.filter((p) => p.stage === stage)}
                  />
                ))}
            </div>
          </section>
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
