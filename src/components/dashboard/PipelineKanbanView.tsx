// src/components/dashboard/pipeline-kanban-view.tsx
"use client";

import { Project } from '@/lib/types';
import { PipelineStageColumn } from './pipeline-stage-column';

// In a real app, this data would come from an API call
// We define a more structured data type for the pipeline
interface PipelineStage {
  id: string;
  name: string;
  projects: Project[];
  color: string; // Added color for UI
}

// Dummy data for demonstration
const pipelineData: PipelineStage[] = [
  { id: 'ideation', name: 'Demande / Idéation', projects: [{id: '1', name: 'ProClean Dégraissant Industriel Bio', initiator: 'Ventes Nord'}], color: '#3b82f6' },
  { id: 'evaluation', name: 'Évaluation Coût/Potentiel', projects: [{id: '2', name: 'Ecolube Bio+ Additif Carburant', initiator: 'Sophie Dubois'}], color: '#8b5cf6' },
  { id: 'prototype', name: 'Prototypage', projects: [{id: '3', name: 'QuadraShield MP Series', initiator: 'Jean Martin'}], color: '#ec4899' },
  { id: 'development', name: 'Mise en Fonction / Développement', projects: [], color: '#f97316' },
  { id: 'planning', name: 'Planification Produit Fini', projects: [{id: '4', name: 'XtremeTemp Graisse G2 Haute Performance', initiator: 'R&D Central'}], color: '#10b981' },
  { id: 'market', name: 'Mise en Marché', projects: [{id: '5', name: 'SintoMax Gear Oil X (Nouvelle Formule)', initiator: 'Marketing'}], color: '#6366f1' },
  { id: 'product_life', name: 'Vie du Produit', projects: [{id: '6', name: 'AeroGlide Lubrifiant Sec PTFE', initiator: 'Support'}], color: '#64748b' },
];


export const PipelineKanbanView: React.FC = () => {
  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4">Pipeline de Lancement de Produit</h2>
      
      {/* Horizontal Scroll Container */}
      {/* The padding on the bottom (pb-4) gives the scrollbar some breathing room */}
      <div className="flex gap-6 overflow-x-auto pb-4 -mx-6 px-6">
        {pipelineData.map((stage) => (
          <PipelineStageColumn
            key={stage.id}
            stage={stage.name}
            projects={stage.projects}
            color={stage.color}
          />
        ))}
      </div>
    </div>
  );
};
