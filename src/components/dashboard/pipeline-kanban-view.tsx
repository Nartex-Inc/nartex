// src/components/dashboard/pipeline-kanban-view.tsx
"use client";

import { Project } from '@/lib/types';
import { PipelineStageColumn } from './pipeline-stage-column';

// HERE IS THE FIX:
// 1. The interface is now EXPORTED so other files can see it.
// 2. It's correctly named KanbanStage to match your page's import.
export interface KanbanStage {
  id: string;
  name: string;
  projects: Project[];
  color: string;
}

// The component now expects to receive props of this type
interface PipelineKanbanViewProps {
  stages: KanbanStage[];
}

// We REMOVED the internal dummy data and now accept 'stages' as a prop
export const PipelineKanbanView: React.FC<PipelineKanbanViewProps> = ({ stages }) => {
  return (
    <section>
      <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4">
        Pipeline de Lancement de Produit
      </h2>
      
      <div className="flex gap-6 overflow-x-auto pb-4 -mx-6 px-6">
        {/* It now maps over the 'stages' prop passed in from the page */}
        {stages.map((stage) => (
          <PipelineStageColumn
            key={stage.id}
            stage={stage.name}
            projects={stage.projects}
            color={stage.color}
          />
        ))}
      </div>
    </section>
  );
};
