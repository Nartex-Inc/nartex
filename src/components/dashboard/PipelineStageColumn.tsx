// src/components/dashboard/pipeline-stage-column.tsx
import { Project } from '@/lib/types';
import { ProjectCard } from './project-card';

interface PipelineStageColumnProps {
  stage: string;
  projects: Project[];
  color: string; // For visual distinction
}

export const PipelineStageColumn: React.FC<PipelineStageColumnProps> = ({ stage, projects, color }) => {
  return (
    // flex-shrink-0 is crucial to prevent columns from squishing on smaller screens
    <div className="flex flex-col w-80 flex-shrink-0">
      
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{stage}</h3>
        </div>
        <span className="text-sm font-medium bg-muted text-muted-foreground rounded-full px-2 py-0.5">
          {projects.length}
        </span>
      </div>

      {/* Projects List (Scrollable Area) */}
      <div className="flex-1 space-y-3 p-3 bg-muted/50 rounded-b-lg overflow-y-auto h-full">
        {projects.length > 0 ? (
          projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))
        ) : (
          <div className="flex items-center justify-center h-24 text-sm text-muted-foreground italic">
            Aucun projet
          </div>
        )}
      </div>

    </div>
  );
};
