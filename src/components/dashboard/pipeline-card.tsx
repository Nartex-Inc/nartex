// src/components/dashboard/pipeline-card.tsx
"use client";

import Link from 'next/link';
import {
  Project
} from '@/lib/types'; // Assuming Project type is available

export const PipelineCard: React.FC < {
  stage: string;
  count: number;
  projects: Project[]; // Use the Project type for better data handling
} > = ({
  stage,
  count,
  projects
}) => {
  return (
    // Stripe-inspired card: softer shadow, more padding, refined border
    < div className = "flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow duration-300" >
    <
    div className = "p-5" >
    <
    div className = "flex items-center justify-between mb-4" >
    <
    h3 className = "text-sm font-semibold text-muted-foreground uppercase tracking-wider" > {
      stage
    } <
    /h3> <
    span className = "text-2xl font-bold text-foreground" > {
      count
    } <
    /span> <
    /div> <
    div className = "h-1 w-full bg-muted rounded-full overflow-hidden" >
    <
    div className = {
      `h-1 rounded-full bg-primary transition-all duration-500`
    }
    style = {
      {
        width: count > 0 ? `100%` : '0%'
      }
    }
    /> <
    /div> <
    /div>

    {
      /* Projects list with a separator */
    } <
    div className = "flex-1 space-y-2 p-5 pt-3 border-t" > {
      projects.length > 0 ? (
        projects.slice(0, 3).map((project) => ( <
          Link key = {
            project.id
          }
          href = {
            `/dashboard/projects/${project.id}`
          }
          className = "group block truncate" >
          <
          p className = "text-sm font-medium text-foreground group-hover:text-primary transition-colors" > {
            project.name
          } <
          /p> <
          p className = "text-xs text-muted-foreground" > Demandeur: {
            project.initiator
          } < /p> <
          /Link>
        ))
      ) : ( <
        p className = "text-sm text-muted-foreground italic py-4 text-center" > Aucun projet < /p>
      )
    } <
    /div> <
    /div>
  );
};
