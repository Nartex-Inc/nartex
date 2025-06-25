// src/components/dashboard/pipeline-kanban-view.tsx
"use client";

import { Project } from '@/lib/types';
import { PipelineStageColumn } from './pipeline-stage-column';

export interface KanbanStage {
  id: string;
  name: string;
  projects: Project[];
  color: string;
}

interface PipelineKanbanViewProps {
  stages: KanbanStage[];
}

export const PipelineKanbanView: React.FC<PipelineKanbanViewProps> = ({ stages }) => {
  return (
    <section>
      <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4">
        Pipeline de Lancement de Produit
      </h2>
      
      {/* CHANGE: Enhanced the horizontal scroll container */}
      <div 
        className="
          flex gap-6 overflow-x-auto pb-4 -mx-6 px-6
          scroll-snap-type-x-mandatory 
          [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]
        "
      >
        {stages.map((stage) => (
          // This child component now has scroll-snap-align
          <div key={stage.id} className="scroll-snap-align-start">
            <PipelineStageColumn
              stage={stage.name}
              projects={stage.projects}
              color={stage.color}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
