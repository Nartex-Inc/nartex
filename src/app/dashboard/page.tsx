"use client";

import { useSession } from "next-auth/react";
// --- FIX: Removed the .tsx extensions ---
import { PipelineCard } from "@/components/dashboard/pipeline-card";
import { NewProductRequestsTable } from "@/components/dashboard/new-product-requests-table";
import {
  mockProjectsData,
  mockNewProductRequestsData,
  getProjectCountsByStage,
} from "@/lib/data";
import { ProductLifecycleStage } from "@/lib/types";

export default function DashboardPage() {
  const { data: session } = useSession();
  const projects = mockProjectsData;
  const projectCountsByStage = getProjectCountsByStage(projects);

  if (!session) {
    return <div className="p-8">Loading...</div>;
  }
  
  return (
    <div className="w-full space-y-8 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Tableau de bord R&D
        </h1>
        <p className="text-muted-foreground">
          Vue d'ensemble du pipeline de développement et des nouvelles demandes.
        </p>
      </div>
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Pipeline de Lancement de Produit
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Object.values(ProductLifecycleStage)
            .filter(stage => stage !== ProductLifecycleStage.ARCHIVE)
            .map(stage => (
              <PipelineCard
                key={stage}
                stage={stage}
                count={projectCountsByStage[stage] || 0}
                projects={projects.filter(p => p.stage === stage).map(p => p.name)}
              />
            ))
          }
        </div>
      </section>
      <section>
        <NewProductRequestsTable requests={mockNewProductRequestsData} />
      </section>
    </div>
  );
}