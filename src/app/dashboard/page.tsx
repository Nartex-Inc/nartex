"use client";

import { useSession } from "next-auth/react";
// These imports will now work after you rename the files.
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { StatCard } from "@/components/dashboard/StatCard";
import { PipelineCard } from "@/components/dashboard/PipelineCard";
import { NewProductRequestsTable } from "@/components/dashboard/new-product-requests-table";
import { RecentActivity } from "@/components/dashboard/RecentActivity";

import {
  mockProjectsData,
  mockUserTasksData,
  mockApprovalRequestsData,
  mockNewProductRequestsData,
  mockRecentActivityData,
  getProjectCountsByStage,
  colors
} from "@/lib/data";
import { ProductLifecycleStage, TaskStatus } from "@/lib/types";
import { ListChecks, CheckCircle } from "lucide-react";

export default function DashboardPage() {
  const { data: session } = useSession();

  const projects = mockProjectsData;
  const userTasks = mockUserTasksData;
  const approvalRequests = mockApprovalRequestsData;
  const projectCountsByStage = getProjectCountsByStage(projects);

  const activeProjectsCount = projects.filter(p => p.stage !== ProductLifecycleStage.ARCHIVE).length;
  const overdueTasksCount = userTasks.filter(t => t.status === TaskStatus.EN_RETARD).length;
  const pendingApprovalsCount = approvalRequests.filter(a => a.status === 'pending').length;
  const openTasksCount = userTasks.filter(t => t.status !== TaskStatus.FAIT && t.status !== TaskStatus.NON_APPLICABLE).length;
  const completedTasksCount = userTasks.filter(t => t.status === TaskStatus.FAIT).length;
  
  const userDisplayName = session?.user?.name || "Nartex User";

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Welcome banner */}
      <WelcomeBanner
        userName={userDisplayName}
        activeProjectsCount={activeProjectsCount}
        overdueTasksCount={overdueTasksCount}
        pendingApprovalsCount={pendingApprovalsCount}
      />
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Projets en Développement"
          value={activeProjectsCount}
          label="actifs"
          description={`${projectCountsByStage[ProductLifecycleStage.PROTOTYPAGE] || 0} en Proto, ${projectCountsByStage[ProductLifecycleStage.MISE_EN_MARCHE] || 0} en Lancement`}
          percentage={Math.round((activeProjectsCount / Math.max(projects.length, 1)) * 100)}
          color={colors.primary}
          linkText="Voir tous les projets"
          linkUrl="/dashboard/projects"
        />
        <StatCard
          title="Mes Tâches"
          value={openTasksCount}
          label="ouvertes"
          description={`${completedTasksCount} terminées, ${openTasksCount} à faire`}
          secondaryLabel={
            overdueTasksCount > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 px-2.5 py-1 rounded-md text-xs font-medium">
                {overdueTasksCount} en retard
              </span>
            ) : null
          }
          progressBar={true}
          progressValue={userTasks.length > 0 ? (completedTasksCount / userTasks.length) * 100 : 0}
          color={colors.warning}
          icon={<ListChecks size={40} />}
          linkText="Voir toutes les tâches"
          linkUrl="/dashboard/tasks"
          linkColor={colors.warning}
        />
        <StatCard
          title="Approbations Requises"
          value={pendingApprovalsCount}
          label="en attente"
          description={pendingApprovalsCount > 0 ? `${approvalRequests.filter(a=> a.status === 'pending')[0].projectName}: ${approvalRequests.filter(a=> a.status === 'pending')[0].description.substring(0,25)}...` : 'Aucune approbation.'}
          color={colors.primary}
          icon={<CheckCircle size={40} />}
          linkText="Voir les approbations"
          linkUrl="/dashboard/approvals"
        />
      </div>

      {/* Pipeline Section */}
      <div className="mb-8">
         <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">Pipeline de Lancement de Produit</h2>
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
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
      </div>
      
      {/* Product Requests Table */}
      <div className="mb-8">
        <NewProductRequestsTable requests={mockNewProductRequestsData} />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 mb-8">
        <RecentActivity activities={mockRecentActivityData} />
      </div>
    </div>
  );
}