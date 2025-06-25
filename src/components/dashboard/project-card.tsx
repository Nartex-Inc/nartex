// src/components/dashboard/project-card.tsx
import Link from 'next/link';
import { Project } from '@/lib/types';

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  return (
    <Link 
      href={`/dashboard/projects/${project.id}`} 
      className="block p-3 rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-grab active:cursor-grabbing"
    >
      <p className="font-semibold text-sm text-foreground truncate">{project.name}</p>
      <p className="text-xs text-muted-foreground mt-1">Demandeur: {project.initiator}</p>
      {/* Potential to add more info like priority icons, due dates, or avatars */}
    </Link>
  );
};
