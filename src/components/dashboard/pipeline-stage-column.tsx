// src/components/dashboard/pipeline-stage-column.tsx
import { Project } from '@/lib/types';
import { ProjectCard } from './project-card';

interface PipelineStageColumnProps {
  stage: string;
  projects: Project[];
  color: string;
}

export const PipelineStageColumn: React.FC<PipelineStageColumnProps> = ({ stage, projects, color }) => {
  return (
    // CHANGE 1: We've made the column a flex container and given it a fixed height.
    // 'h-96' (or h-[400px], etc.) is the key. All columns will now be this tall.
    // flex-shrink-0 is still crucial.
    <div className="flex flex-col w-80 h-96 flex-shrink-0 bg-muted/50 rounded-lg">
      
      {/* Column Header (No changes here, but it's now part of the flex layout) */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{stage}</h3>
        </div>
        <span className="text-sm font-medium bg-background text-muted-foreground rounded-full px-2 py-0.5">
          {projects.length}
        </span>
      </div>

      {/* CHANGE 2: This is now the flexible, scrollable content area.
          - `flex-1`: This makes the div grow to fill ALL available vertical space.
          - `overflow-y-auto`: This adds a scrollbar ONLY if the projects list is too long.
      */}
      <div className="flex-1 space-y-3 p-3 overflow-y-auto">
        {projects.length > 0 ? (
          projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))
        ) : (
          // CHANGE 3: The empty state now lives inside the flexible container, so it will be centered nicely.
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground italic">
            Aucun projet
          </div>
        )}
      </div>
    </div>
  );
};
