"use client";

import React, { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { redirect, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Bell, LogOut, Menu, Settings, Moon, Sun, User, ChevronRight,
  Plus, ExternalLink, CheckCircle, ListChecks, BarChart2, Users,
  HelpCircle, CreditCard
} from 'lucide-react';

// --- AWS-inspired color palette (Updated with Success Green as Primary) ---
const colors = {
  primary: "#1D8102", // AWS Success Green (Replaced Cyan)
  primaryHover: "#176802", // Darker Success Green (Replaced Cyan Hover)
  primaryLight: "#EAFBEA", // Success Light Green (Replaced Cyan Light)
  success: "#1D8102", // Kept Success Green definition
  successLight: "#EAFBEA", // Kept Success Light Green
  warning: "#FF9900",
  warningLight: "#FFF8E6",
  danger: "#D13212",
  dangerLight: "#FFF1ED",
  darkBgPrimary: "#0D1117",
  darkBgSecondary: "#161E2D",
  darkBgTertiary: "#232F3E",
  darkTextPrimary: "#E6EDF3",
  darkTextSecondary: "#AAB7C4",
  darkTextTertiary: "#8596A9",
  darkBorder: "#31465F",
  lightBgPrimary: "#F8F9FA",
  lightBgSecondary: "#FFFFFF",
  lightTextPrimary: "#161E2D",
  lightTextSecondary: "#4A5F78",
  lightBorder: "#E9EEF2"
};

// --- Enums ---
enum ProductLifecycleStage {
  DEMANDE_IDEATION = "Demande / Idéation",
  EVALUATION_COUT_POTENTIEL = "Évaluation Coût/Potentiel",
  COMITE_EVALUATION = "Comité d'Évaluation",
  PROTOTYPAGE = "Prototypage",
  MISE_EN_FONCTION_DEVELOPPEMENT = "Mise en fonction / Développement",
  PLANIFICATION_PRODUIT_FINI = "Planification Produit Fini",
  MISE_EN_MARCHE = "Mise en Marché",
  VIE_DU_PRODUIT = "Vie du Produit",
  ARCHIVE = "Archivé"
}

enum TaskStatus {
  NON_COMPLETE = "Non Complété",
  EN_COURS = "En Cours",
  EN_EVALUATION = "En Évaluation",
  FAIT = "Fait",
  EN_RETARD = "En Retard",
  NON_APPLICABLE = "Non Applicable"
}

enum NewProductRequestStatus {
  EN_ATTENTE = "En attente",
  ACCEPTE = "Accepté",
  REFUSE = "Refusé"
}

// --- Type Interfaces ---
interface ProjectSummary {
  id: string;
  name: string;
  stage: ProductLifecycleStage;
  initiator?: string;
}

interface UserTask {
  id: string;
  projectId: string;
  projectName: string;
  description: string;
  status: TaskStatus;
  responsible: string;
  dueDate?: string;
}

interface ApprovalRequest {
  id: string;
  projectId: string;
  projectName: string;
  description: string;
  requestedBy: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface RecentActivityItem {
  id: string;
  type: 'project_submission' | 'option_advanced' | 'task_update' | 'delivery_alert' | 'approval_request' | 'user_join' | 'comment';
  text: string;
  timestamp: string;
  iconType: 'project' | 'task_completed' | 'user_added' | 'comment' | 'alert' | 'edit' | 'approval';
  colorClass: string;
  bgColorClass: string;
  ringColorClass: string;
}

interface NewProductRequest {
  id: string;
  projectName: string;
  initiator: string;
  submissionDate: string;
  status: NewProductRequestStatus;
  reason?: string;
}

interface NavItem {
  href: string;
  title: string;
  icon: React.ReactNode;
  active?: boolean;
  badge?: number | null;
  badgeColor?: "warning" | "primary"; // primary will now be green
}

// --- Mock Data (Updated Recent Activity Colors) ---
const mockProjectsData: ProjectSummary[] = [
  { id: "proj1", name: "QuadraShield MP Series", stage: ProductLifecycleStage.PROTOTYPAGE, initiator: "Jean Martin" },
  { id: "proj2", name: "EcoLube Bio+ Additif Carburant", stage: ProductLifecycleStage.EVALUATION_COUT_POTENTIEL, initiator: "Sophie Dubois" },
  { id: "proj3", name: "SintoMax Gear Oil X (Nouvelle Formule)", stage: ProductLifecycleStage.MISE_EN_MARCHE, initiator: "Chef de Produit" },
  { id: "proj4", name: "ProClean Dégraissant Industriel Bio", stage: ProductLifecycleStage.DEMANDE_IDEATION, initiator: "Ventes Nord" },
  { id: "proj5", name: "XtremeTemp Graisse G2 Haute Performance", stage: ProductLifecycleStage.PLANIFICATION_PRODUIT_FINI, initiator: "R&D Central" },
  { id: "proj6", name: "LubriCool SX Huile de Coupe Synthétique", stage: ProductLifecycleStage.COMITE_EVALUATION, initiator: "Marketing Global" },
  { id: "proj7", name: "AeroGlide Lubrifiant Sec PTFE", stage: ProductLifecycleStage.VIE_DU_PRODUIT, initiator: "R&D Central" },
];

const mockUserTasksData: UserTask[] = [
  { id: "task1", projectId: "proj1", projectName: "QuadraShield MP Series", description: "Finaliser design packaging", status: TaskStatus.EN_COURS, responsible: "Séléna", dueDate: "Fait JV et MD" },
  { id: "task2", projectId: "proj2", projectName: "EcoLube Bio+", description: "Analyse de marché concurrentiel", status: TaskStatus.EN_RETARD, responsible: "CPO et Ventes", dueDate: "Hier" },
  { id: "task3", projectId: "proj3", projectName: "SintoMax Gear Oil X", description: "Préparer matériel de formation", status: TaskStatus.FAIT, responsible: "Sam et JV", dueDate: "Fait" },
  { id: "task4", projectId: "proj1", projectName: "QuadraShield MP Series", description: "Test produit en application", status: TaskStatus.NON_COMPLETE, responsible: "Sup. tech", dueDate: "A venir Q3" },
  { id: "task5", projectId: "proj5", projectName: "XtremeTemp Grease G2", description: "Rédaction MSDS et réglementaire", status: TaskStatus.EN_COURS, responsible: "Stéphane", dueDate: "En cours" },
];

const mockApprovalRequestsData: ApprovalRequest[] = [
  { id: "app1", projectId: "proj1", projectName: "QuadraShield MP Series", description: "Approbation budget prototypage (Option B)", requestedBy: "Comité", status: 'pending' },
  { id: "app2", projectId: "proj2", projectName: "EcoLube Bio+", description: "Validation spécifications techniques", requestedBy: "R&D", status: 'pending' },
  { id: "app3", projectId: "proj6", projectName: "LubriCool SX", description: "Accord Comité d'évaluation (Critères)", requestedBy: "Direction", status: 'approved' },
];

const mockRecentActivityData: RecentActivityItem[] = [
  { id: "act1", type: "project_submission", text: `Nouveau projet <span class="font-medium text-green-600 dark:text-green-400">EcoLube Bio+</span> soumis par Sophie Dubois.`, timestamp: "Il y a 30 minutes", iconType: 'project', colorClass: 'text-green-600 dark:text-green-400', bgColorClass: 'bg-green-50 dark:bg-green-500/20', ringColorClass: 'bg-green-500' }, // Updated to green
  { id: "act2", type: "task_update", text: `<span class="font-medium text-amber-600 dark:text-amber-400">'Analyse de marché'</span> (QuadraShield MP) est en retard.`, timestamp: "Il y a 1 heure", iconType: 'alert', colorClass: 'text-amber-600 dark:text-amber-400', bgColorClass: 'bg-amber-100 dark:bg-amber-500/20', ringColorClass: 'bg-amber-500' },
  { id: "act3", type: "approval_request", text: `<span class="font-medium text-green-600 dark:text-green-400">Approbation budget</span> requise pour 'QuadraShield MP'.`, timestamp: "Il y a 2 heures", iconType: 'approval', colorClass: 'text-green-600 dark:text-green-400', bgColorClass: 'bg-green-100 dark:bg-green-500/20', ringColorClass: 'bg-green-500' }, // Updated to green
  { id: "act4", type: "user_join", text: `<span class="font-medium text-purple-600 dark:text-purple-400">Martin Désy</span> a rejoint le projet <span class="font-medium text-purple-500 dark:text-purple-300">SintoMax Gear Oil X</span>.`, timestamp: "Hier", iconType: 'user_added', colorClass: 'text-purple-600 dark:text-purple-400', bgColorClass: 'bg-purple-100 dark:bg-purple-500/20', ringColorClass: 'bg-purple-500' },
];

const mockNewProductRequestsData: NewProductRequest[] = [
  { id: "npr1", projectName: "Huile Moteur Synthétique LongLife", initiator: "Ventes Auto", submissionDate: "2025-05-08", status: NewProductRequestStatus.EN_ATTENTE },
  { id: "npr2", projectName: "Nettoyant Freins Écologique", initiator: "R&D Spécialités", submissionDate: "2025-05-05", status: NewProductRequestStatus.ACCEPTE, reason: "Potentiel marché élevé." },
  { id: "npr3", projectName: "Graisse Alimentaire H1 SuperLube", initiator: "Marketing Agro", submissionDate: "2025-05-02", status: NewProductRequestStatus.REFUSE, reason: "ROI faible." },
  { id: "npr4", projectName: "Fluide Hydraulique BioDégradable HVLP", initiator: "Grand Comptes Industriels", submissionDate: "2025-04-28", status: NewProductRequestStatus.EN_ATTENTE },
  { id: "npr5", projectName: "Spray Silicone Anti-Adhérent PRO", initiator: "Support Technique", submissionDate: "2025-04-25", status: NewProductRequestStatus.ACCEPTE },
];

// --- Helper Functions ---
const getProjectCountsByStage = (projects: ProjectSummary[]): Record<ProductLifecycleStage, number> => {
  const counts = {} as Record<ProductLifecycleStage, number>;

  for (const stage of Object.values(ProductLifecycleStage)) {
    counts[stage] = 0;
  }

  projects.forEach(p => {
    counts[p.stage] = (counts[p.stage] || 0) + 1;
  });

  return counts;
};

// --- Component: Loading Spinner ---
const LoadingSpinner: React.FC<{ className?: string }> = ({ className = "h-5 w-5 text-green-600" }) => ( // Updated text-cyan-500 to text-green-600
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// --- Component: Progress Circle ---
const ProgressCircle: React.FC<{ percentage: number; color?: string }> = ({ percentage, color = colors.primary }) => { // Default color now uses updated colors.primary (green)
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percentage / 100) * circ;

  return (
    <svg className="w-24 h-24" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="transparent" stroke="currentColor" className="text-gray-300 dark:text-gray-700" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={r}
        fill="transparent"
        stroke={color} // Uses the passed color, which defaults to green
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
      />
      <text
        x="50" y="55"
        textAnchor="middle"
        fontSize="18"
        fontWeight="bold"
        className="fill-gray-900 dark:fill-white"
      >
        {percentage}%
      </text>
    </svg>
  );
};

// --- Component: Stat Card ---
const StatCard: React.FC<{
  title: string;
  value: number | string;
  label: string;
  description: React.ReactNode;
  icon?: React.ReactNode;
  percentage?: number;
  color?: string;
  colorName?: "primary" | "warning" | "success" | "danger"; // primary now refers to green
  secondaryLabel?: React.ReactNode;
  progressBar?: boolean;
  progressValue?: number;
  linkText: string;
  linkUrl: string;
  linkColor?: string;
}> = ({
  title,
  value,
  label,
  description,
  icon,
  percentage,
  color = colors.primary, // Default color is now green
  colorName = "primary", // Default colorName is now green
  secondaryLabel = null,
  progressBar = false,
  progressValue = 0,
  linkText,
  linkUrl,
  linkColor
}) => {
  // Determine theme classes based on dark mode context
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  // Override color if colorName is provided
  if (colorName) {
    color = colors[colorName] || colors.primary; // Ensure default is the new primary (green)
  }

  // Use linkColor if provided, otherwise use main color
  const actualLinkColor = linkColor || color;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-xl">
      <div className="p-5">
        <div className="flex items-start">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
              {secondaryLabel}
            </div>
            <div className="mt-2 flex items-baseline">
              <p className="text-4xl font-bold text-gray-900 dark:text-gray-50">{value}</p>
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">{label}</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1.5">{description}</div>

            {progressBar && (
              <div className="mt-3.5">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${progressValue}%`,
                      backgroundColor: color, // Will use the correct color (green if primary/default)
                      background: `linear-gradient(to right, ${color}, ${color})`
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {percentage !== undefined ? (
            <div className="ml-4">
              <ProgressCircle percentage={percentage} color={color} /> {/* Passes the correct color */}
            </div>
          ) : icon ? (
            <div className="ml-4" style={{ color: color, opacity: 0.6 }}> {/* Icon uses the correct color */}
              {icon}
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70">
        <Link
          href={linkUrl}
          className="text-sm font-medium flex items-center transition-colors"
          style={{ color: actualLinkColor }} // Link uses the correct color
          // Add hover effect directly here if needed, e.g., onMouseEnter/Leave or using Tailwind peer/group
        >
          <span>{linkText}</span>
          <ChevronRight className="h-4 w-4 ml-1.5" />
        </Link>
      </div>
    </div>
  );
};


// --- Component: Pipeline Card ---
const PipelineCard: React.FC<{
  stage: string;
  count: number;
  projects: string[];
}> = ({ stage, count, projects }) => {
  const color = colors.primary; // Now green
  const progressBarWidth = count > 0 ? `${(count * 25 + 20)}%` : '0%'; // Simple scaling logic, adjust if needed

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors duration-200 flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate" title={stage}>
          {stage}
        </h3>
        <span className={`text-lg font-bold ${count > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}> {/* Updated text-cyan-500 to text-green-600 */}
          {count}
        </span>
      </div>

      <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full mb-3">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${count > 0 ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'}`} // Updated bg-cyan-500 to bg-green-600
          style={{ width: progressBarWidth }}
        />
      </div>

      <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1 custom-scrollbar-thin flex-grow text-sm">
        {projects.length > 0 ? (
          projects.slice(0, 3).map((project, idx) => ( // Show first 3
            <Link
              key={idx}
              href={`/dashboard/projects/${encodeURIComponent(project)}`} // Example link, adjust as needed
              className="block text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white truncate p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors"
              title={project}
            >
              {project}
            </Link>
          ))
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-500 italic">
            Aucun projet
          </p>
        )}

        {projects.length > 3 && (
          <p className="text-xs text-gray-500 dark:text-gray-500 italic mt-1">
            et {projects.length - 3} autres...
          </p>
        )}
      </div>
    </div>
  );
};

// --- Component: Product Requests Table ---
const NewProductRequestsTable: React.FC<{
  requests: NewProductRequest[]
}> = ({ requests }) => {
  const getStatusColorClasses = (status: NewProductRequestStatus) => {
    switch (status) {
      case NewProductRequestStatus.ACCEPTE:
        return `bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-l-4 border-green-500`; // Updated cyan to green
      case NewProductRequestStatus.REFUSE:
        return `bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-l-4 border-red-500`;
      case NewProductRequestStatus.EN_ATTENTE:
      default:
        return `bg-gray-100 dark:bg-gray-700/40 text-gray-600 dark:text-gray-300 border-l-4 border-gray-400 dark:border-gray-500`;
    }
  };

  if (!requests || requests.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">
          Demandes de Nouveaux Produits
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Aucune demande.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
      <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          Demandes de Nouveaux Produits
        </h2>
        <Link
          href="/dashboard/new-product-requests/all"
          className="text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors" // Updated cyan to green
        >
          Voir tout →
        </Link>
      </div>

      <div className="overflow-x-auto custom-scrollbar-thin">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr className="border-b border-gray-200 dark:border-gray-600">
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Nom du Projet
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Demandeur
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Date Soumission
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Statut
              </th>
            </tr>
          </thead>

          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {requests.slice(0, 5).map((req) => (
              <tr
                key={req.id}
                className={`${getStatusColorClasses(req.status)} hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors duration-150`}
                title={req.reason ? `${req.status}: ${req.reason}` : req.status}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  {req.projectName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                  {req.initiator}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                  {new Date(req.submissionDate).toLocaleDateString('fr-CA')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    req.status === NewProductRequestStatus.ACCEPTE
                      ? 'bg-green-100 dark:bg-green-600/20 text-green-700 dark:text-green-300' // Updated cyan to green
                      : req.status === NewProductRequestStatus.REFUSE
                      ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'
                      : 'bg-gray-200 dark:bg-gray-600/40 text-gray-700 dark:text-gray-200'
                  }`}>
                    {req.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {requests.length > 5 && (
        <div className="p-4 text-center border-t border-gray-200 dark:border-gray-700">
          <Link
            href="/dashboard/new-product-requests/all"
            className="text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors" // Updated cyan to green
          >
            Afficher {requests.length - 5} autres demandes...
          </Link>
        </div>
      )}
    </div>
  );
};

// --- Component: Recent Activity ---
const RecentActivity: React.FC<{
  activities: RecentActivityItem[]
}> = ({ activities }) => {
  const getIcon = (type: string, colorClass: string) => {
    // Icons themselves don't need color changes unless they had hardcoded fill/stroke
    // The color is applied via the colorClass prop to the parent SVG or path
    switch (type) {
      case 'project':
        return (
          <svg className={`w-5 h-5 ${colorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case 'task_completed':
        return (
          <svg className={`w-5 h-5 ${colorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      case 'user_added':
        return (
          <svg className={`w-5 h-5 ${colorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
          </svg>
        );
      case 'comment':
        return (
          <svg className={`w-5 h-5 ${colorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
          </svg>
        );
      case 'approval':
        return (
          <svg className={`w-5 h-5 ${colorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A9 9 0 109.028 21.028M9 12l2 2 4-4" />
          </svg>
        );
      case 'edit':
        return (
          <svg className={`w-5 h-5 ${colorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
        );
      case 'alert':
      default:
        return (
          <svg className={`w-5 h-5 ${colorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
      <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Activité Récente</h2>
        <Link
          href="/dashboard/activity-log"
          className="text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors" // Updated cyan to green
        >
          Voir tout →
        </Link>
      </div>
      <div className="p-5 max-h-[400px] overflow-y-auto custom-scrollbar-thin">
        <div className="space-y-6">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start">
              <div className={`relative flex-shrink-0 w-10 h-10 ${activity.bgColorClass || 'bg-gray-100 dark:bg-gray-700'} rounded-lg mr-4 flex items-center justify-center shadow`}>
                <div className="opacity-70">
                  {getIcon(activity.iconType, activity.colorClass)}
                </div>
                <span className={`absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-gray-800 ${activity.ringColorClass || 'bg-green-500'}`}></span> {/* Default ring updated to green */}
              </div>
              <div>
                <p
                  className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: activity.text }} // Text color handled inside the HTML span
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {activity.timestamp}
                </p>
              </div>
            </div>
          ))}

          {activities.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              Aucune activité récente.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main Dashboard Component ---
export default function Dashboard() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userMenuButtonRef = useRef<HTMLButtonElement>(null);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [greeting, setGreeting] = useState<string>("");
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [projects, setProjects] = useState<ProjectSummary[]>(mockProjectsData);
  const [userTasks, setUserTasks] = useState<UserTask[]>(mockUserTasksData);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>(mockApprovalRequestsData);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>(mockRecentActivityData);
  const [newProductRequests, setNewProductRequests] = useState<NewProductRequest[]>(mockNewProductRequestsData);
  const [projectCountsByStage, setProjectCountsByStage] = useState(() => getProjectCountsByStage(mockProjectsData));

  // Initialize project counts
  useEffect(() => {
    setProjectCountsByStage(getProjectCountsByStage(projects));
  }, [projects]);

  // Outside click handler for user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isUserMenuOpen &&
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node) &&
        userMenuButtonRef.current &&
        !userMenuButtonRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUserMenuOpen]);

  // Responsive sidebar handler
  useEffect(() => {
    const checkSize = () => {
      setIsSidebarOpen(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', checkSize);
    checkSize(); // Initial check

    return () => window.removeEventListener('resize', checkSize);
  }, []);

  // Dark mode toggle handler
  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => {
      const newMode = !prevMode;
      if (newMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('nartex-theme-preference', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('nartex-theme-preference', 'light');
      }
      return newMode;
    });
  };

  // Dark mode initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem('nartex-theme-preference');
    let currentIsDark = false;
    if (savedTheme) {
      currentIsDark = savedTheme === 'dark';
    } else {
      currentIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    setIsDarkMode(currentIsDark);
    if (currentIsDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if no preference is saved
      if (!localStorage.getItem('nartex-theme-preference')) {
        setIsDarkMode(e.matches);
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    // Only listen if no preference is saved
    if (!savedTheme) {
      mediaQuery.addEventListener('change', handleChange);
    }

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);


  // Time and greeting updater
  useEffect(() => {
    const updateTimeAndGreeting = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      setCurrentTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);

      if (hours >= 5 && hours < 12) {
        setGreeting("Bonjour");
      } else if (hours >= 12 && hours < 18) {
        setGreeting("Bon après-midi");
      } else {
        setGreeting("Bonsoir");
      }
    };
    updateTimeAndGreeting();
    const intervalId = setInterval(updateTimeAndGreeting, 60000); // Update every minute
    return () => clearInterval(intervalId);
  }, []);

  // Authentication check
  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/");
    }
  }, [status]);

  // Logout handler
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div className="flex flex-col items-center">
          <LoadingSpinner className="h-12 w-12 text-green-600" /> {/* Updated color */}
          <p className="mt-4 text-gray-500 dark:text-gray-400 animate-pulse">
            Chargement de votre espace...
          </p>
        </div>
      </div>
    );
  }

  // User information extraction from session
    const firstName = session?.user?.firstName;
  const lastName = session?.user?.lastName;
  let userDisplayName = "Utilisateur Nartex"; // Default

  if (firstName && lastName) {
    userDisplayName = `${firstName} ${lastName}`;
  } else if (firstName) { // If only firstName is available
    userDisplayName = firstName;
  } else if (lastName) { // If only lastName is available
    userDisplayName = lastName;
  } else if (session?.user?.name && session.user.name !== session.user.email && !session.user.name.includes('@')) {
    // Fallback to session.user.name if it's a proper name
    userDisplayName = session.user.name;
  } else if (session?.user?.email) {
    // Fallback to the part of the email before "@"
    userDisplayName = session.user.email.split('@')[0];
  }
  const userImage = session?.user?.image;
  const userEmail = session?.user?.email || "utilisateur@exemple.com";
  const currentDate = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Computed statistics
  const activeProjectsCount = projects.filter(p => p.stage !== ProductLifecycleStage.ARCHIVE).length;
  const overdueTasksCount = userTasks.filter(t => t.status === TaskStatus.EN_RETARD).length;
  const pendingApprovalsCount = approvalRequests.filter(a => a.status === 'pending').length;
  const openTasksCount = userTasks.filter(t => t.status !== TaskStatus.FAIT && t.status !== TaskStatus.NON_APPLICABLE).length;
  const completedTasksCount = userTasks.filter(t => t.status === TaskStatus.FAIT).length;

  // Navigation items
  const navigationItems: NavItem[] = [
    {
      href: "/dashboard",
      title: "Tableau de bord",
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
      active: pathname === "/dashboard",
      badge: null
    },
    {
      href: "/dashboard/projects",
      title: "Mes Projets",
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
      active: pathname === "/dashboard/projects",
      badge: null
    },
    {
      href: "/dashboard/new-project-request",
      title: "Nouv. Demande",
      icon: <Plus size={20} />,
      active: pathname === "/dashboard/new-project-request",
      badge: null
    },
    {
      href: "/dashboard/tasks",
      title: "Mes Tâches",
      icon: <ListChecks size={20} />,
      active: pathname === "/dashboard/tasks",
      badge: openTasksCount > 0 ? openTasksCount : null,
      badgeColor: "warning" // Warning color remains amber/orange
    },
    {
      href: "/dashboard/approvals",
      title: "Approbations",
      icon: <CheckCircle size={20} />,
      active: pathname === "/dashboard/approvals",
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
      badgeColor: "primary" // This will now use green styles
    },
    {
      href: "/dashboard/analytics",
      title: "Analytiques",
      icon: <BarChart2 size={20} />,
      active: pathname === "/dashboard/analytics",
      badge: null
    },
    {
      href: "/dashboard/team",
      title: "Équipe",
      icon: <Users size={20} />,
      active: pathname === "/dashboard/team",
      badge: null
    }
  ];

  const adminNavigationItems: NavItem[] = [
    {
      href: "/dashboard/settings",
      title: "Paramètres",
      icon: <Settings size={20} />,
      active: pathname === "/dashboard/settings",
      badge: null
    },
    {
      href: "/dashboard/billing",
      title: "Facturation",
      icon: <CreditCard size={20} />,
      active: pathname === "/dashboard/billing",
      badge: null
    },
    {
      href: "/dashboard/help",
      title: "Support",
      icon: <HelpCircle size={20} />,
      active: pathname === "/dashboard/help",
      badge: null
    }
  ];


  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
      {/* Overlay background */}
      <div className="fixed inset-0 z-0 bg-gray-100 dark:bg-gray-950"></div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-gray-700 py-3 shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 max-w-full mx-auto">
          {/* Left side: Logo & toggle */}
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className="text-gray-400 hover:text-white transition-colors duration-150 p-2 -ml-2 mr-2 rounded-md focus:outline-none active:text-green-500 active:bg-gray-700/50" // Updated active:text-cyan-500
              aria-label="Toggle navigation menu"
            >
              <Menu size={20} />
            </button>
            <Link href="/dashboard" className="flex items-center">
              <Image
                src="/nartex-logo.svg" // Assuming this remains the same
                alt="Nartex Logo"
                width={110}
                height={28}
                priority
                className="inline-block filter invert brightness-125 contrast-150" // Style might need adjustment based on logo
                onError={(e) => (e.currentTarget.src = 'https://placehold.co/110x28/FFFFFF/000000?text=Nartex&font=sans')}
              />
            </Link>
          </div>

          {/* Right side: Utilities */}
          <div className="flex items-center space-x-4 md:space-x-6">
            {/* Date and time (hidden on mobile) */}
            <div className="hidden md:flex items-center">
              <div className="text-sm text-gray-400 mr-4">{currentDate}</div>
              <div className="bg-gray-800/70 backdrop-blur-sm px-3.5 py-1.5 rounded-lg border border-gray-700">
                <span className="text-green-400 font-medium">{currentTime}</span> {/* Updated text-cyan-400 */}
              </div>
            </div>

            {/* Theme toggle, notifications, and user menu */}
            <div className="flex items-center space-x-3 md:space-x-4">
              <button
                onClick={toggleDarkMode}
                className="text-gray-400 hover:text-white transition-colors duration-150 p-2 rounded-full hover:bg-gray-700/50 focus:outline-none"
                aria-label={isDarkMode ? "Passer en mode clair" : "Passer en mode sombre"}
                title={isDarkMode ? "Mode clair" : "Mode sombre"}
              >
                {isDarkMode ? (
                  <Sun size={18} className="text-yellow-300 hover:text-yellow-200" />
                ) : (
                  <Moon size={18} className="text-gray-400 hover:text-white" />
                )}
              </button>

              <Link
                href="/dashboard/notifications"
                className="text-gray-400 hover:text-white transition relative p-2 rounded-full hover:bg-gray-700/50"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {(pendingApprovalsCount + overdueTasksCount > 0) && (
                  <span className="absolute top-0 right-0 flex h-3 w-3 -mt-0.5 -mr-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span> {/* Updated bg-cyan-500 */}
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span> {/* Updated bg-cyan-500 */}
                  </span>
                )}
              </Link>

              {/* User dropdown */}
              <div className="relative">
                <button
                  ref={userMenuButtonRef}
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="group flex items-center space-x-2 text-sm text-gray-300 hover:text-white transition py-1.5 pl-2 pr-3 rounded-lg hover:bg-gray-800"
                >
                  <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white overflow-hidden border-2 border-gray-700 group-hover:border-gray-600"> {/* Updated bg-cyan-500 */}
                    {userImage ? (
                      <Image
                        src={userImage}
                        alt={userDisplayName}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <span className="text-sm font-medium">{userDisplayName.charAt(0).toUpperCase()}</span>
                    )}
                    {/* Online status indicator - color remains green */}
                    <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-black bg-green-500 border-2 border-gray-700"></span>
                  </div>
                  <span className="hidden sm:inline font-medium text-gray-200">{userDisplayName}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isUserMenuOpen && (
                  <div
                    ref={userMenuRef}
                    className="absolute right-0 mt-2.5 w-64 bg-gray-800/95 backdrop-blur-lg rounded-xl shadow-2xl border border-gray-700 py-1.5 z-50 transition-all duration-150 ease-in-out"
                  >
                    <div className="px-4 py-3 border-b border-gray-700">
                      <p className="text-sm font-semibold text-gray-100">{userDisplayName}</p>
                      <p className="text-xs text-gray-400 truncate">{userEmail}</p>
                    </div>
                    <div className="p-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href="/dashboard/profile"
                          className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-700/70 transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <User className="text-green-400 mb-1.5" size={20} /> {/* Updated text-cyan-400 */}
                          <span className="text-xs text-gray-300">Profil</span>
                        </Link>
                        <Link
                          href="/dashboard/settings"
                          className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-700/70 transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Settings className="text-green-400 mb-1.5" size={20} /> {/* Updated text-cyan-400 */}
                          <span className="text-xs text-gray-300">Paramètres</span>
                        </Link>
                        <Link
                          href="/dashboard/help"
                          className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-700/70 transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <HelpCircle className="text-green-400 mb-1.5" size={20} /> {/* Updated text-cyan-400 */}
                          <span className="text-xs text-gray-300">Aide</span>
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-700/70 transition-colors"
                        >
                          <LogOut className="text-green-400 mb-1.5" size={20} /> {/* Updated text-cyan-400 */}
                          <span className="text-xs text-gray-300">Déconnexion</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative z-10 w-full">
        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-20 backdrop-blur-sm bg-black/40 dark:bg-black/40"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed lg:relative z-30 h-full
            flex-none
            transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full lg:w-20 lg:translate-x-0'}
            ${isDarkMode
              ? 'bg-gray-900 border-r border-gray-700/80'
              : 'bg-white border-r border-gray-200'
            }
          `}
        >
          <div className={`h-full overflow-x-hidden ${isSidebarOpen ? 'w-72' : 'w-20'}`}>
            <div className="flex flex-col h-full">
              <div className="p-5 space-y-7">
                {/* Navigation section */}
                <div>
                  <div className={`flex items-center mb-4 ${!isSidebarOpen && 'lg:justify-center'}`}>
                    <div className={`px-2.5 py-1 rounded text-xs font-medium text-green-600 tracking-wider uppercase ${!isSidebarOpen && 'lg:hidden'} ${isDarkMode ? 'bg-gray-800/70' : 'bg-green-50'}`}> {/* Updated text-cyan-500, bg-cyan-50 */}
                      Navigation
                    </div>
                  </div>
                  <nav className="space-y-1.5">
                    {navigationItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.title}
                        className={`group flex items-center px-3.5 py-2.5 rounded-lg transition-colors duration-150
                                  ${isSidebarOpen ? '' : 'lg:justify-center'}
                                  ${item.active
                                    ? `${isDarkMode ? `bg-green-600/10 text-green-400 border-green-500/40` : `bg-green-50 text-green-600 border-green-300`} border` // Updated cyan to green
                                    : `${isDarkMode ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-700/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`
                                  }`}
                      >
                        <span className={`group-hover:text-green-500 ${isSidebarOpen ? 'mr-3' : 'lg:mr-0'}`}> {/* Updated group-hover:text-cyan-500 */}
                          {item.icon}
                        </span>
                        <span className={`truncate font-medium text-sm ${!isSidebarOpen ? 'lg:hidden' : ''}`}>
                          {item.title}
                        </span>
                        {item.badge !== null && (
                          <span className={`ml-auto px-2 py-0.5 rounded-md text-xs font-semibold ${!isSidebarOpen && 'lg:hidden'}
                                        ${item.badgeColor === "warning"
                                            ? (isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600')
                                            : (isDarkMode ? `bg-green-600/20 text-green-400` : `bg-green-100 text-green-600`) // Updated cyan to green for 'primary' badge
                                        }`}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </nav>
                </div>

                {/* Administration section */}
                <div>
                  <div className={`flex items-center mt-6 mb-4 ${!isSidebarOpen && 'lg:justify-center'}`}>
                     <div className={`px-2.5 py-1 rounded text-xs font-medium text-green-600 tracking-wider uppercase ${!isSidebarOpen && 'lg:hidden'} ${isDarkMode ? 'bg-gray-800/70' : 'bg-green-50'}`}> {/* Updated text-cyan-500, bg-cyan-50 */}
                       Administration
                    </div>
                  </div>
                  <nav className={`space-y-1.5 ${!isSidebarOpen && 'lg:space-y-2'}`}>
                    {adminNavigationItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.title}
                        className={`group flex items-center px-3.5 py-2.5 rounded-lg transition-colors duration-150
                                    ${isSidebarOpen ? '' : 'lg:justify-center'}
                                    ${item.active
                                      ? `${isDarkMode ? `bg-green-600/10 text-green-400 border-green-500/40` : `bg-green-50 text-green-600 border-green-300`} border` // Updated cyan to green
                                      : `${isDarkMode ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-700/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}`
                                    }
                      >
                        <span className={`group-hover:text-green-500 ${isSidebarOpen ? 'mr-3' : 'lg:mr-0'}`}> {/* Updated group-hover:text-cyan-500 */}
                          {item.icon}
                        </span>
                        <span className={`truncate font-medium text-sm ${!isSidebarOpen ? 'lg:hidden' : ''}`}>
                          {item.title}
                        </span>
                      </Link>
                    ))}
                  </nav>
                </div>
              </div>

              {/* User footer in sidebar */}
              <div className={`mt-auto p-4 border-t ${!isSidebarOpen && 'lg:p-2.5'} ${isDarkMode ? 'border-gray-700/80' : 'border-gray-200'}`}>
                <div className={`p-3 rounded-lg border ${!isSidebarOpen && 'lg:p-2 lg:flex lg:justify-center'} ${isDarkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`flex items-center ${!isSidebarOpen && 'lg:flex-col lg:space-y-1.5'}`}>
                    <div className="flex-shrink-0 relative">
                      {/* Avatar background remains green for consistency */}
                      <div className={`relative w-9 h-9 rounded-full overflow-hidden bg-green-600 p-0.5 ${!isSidebarOpen && 'lg:w-8 lg:h-8'}`}> {/* Updated bg-cyan-500 */}
                         <div className={`absolute inset-0.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                          {userImage ? (
                            <Image
                              src={userImage}
                              alt={userDisplayName}
                              width={36}
                              height={36}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full text-sm font-semibold text-white">
                              {userDisplayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                      {isSidebarOpen && (
                        // Online status indicator dot remains green
                        <span className={`absolute bottom-0 -right-0.5 block h-3 w-3 rounded-full ring-2 bg-green-500 ${isDarkMode ? 'ring-gray-800' : 'ring-white'}`}></span>
                      )}
                    </div>
                    <div className={`flex-1 min-w-0 ${isSidebarOpen ? 'ml-3' : 'lg:hidden'}`}>
                      <p className={`text-sm font-semibold truncate ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                        {userDisplayName}
                      </p>
                      <div className="flex items-center">
                        {/* Online status dot remains green */}
                        <span className="flex h-2 w-2 rounded-full bg-green-500 mr-1.5"></span>
                        <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          En ligne
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className={`transition p-1.5 rounded-full ${isSidebarOpen ? 'ml-2' : 'lg:mt-1.5'} ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
                      title="Déconnexion"
                    >
                      <LogOut className={`w-4 h-4 ${!isSidebarOpen && 'lg:w-5 lg:h-5'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-grow min-w-0 py-6 sm:py-8 overflow-y-auto">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            {/* Welcome header card */}
            <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xl">
              <div className="relative p-6 md:p-8">
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div>
                      <h1 className="text-3xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
                        {greeting}, <span className="text-green-600">{userDisplayName}</span> ! {/* Updated text-cyan-500 */}
                      </h1>
                      <p className="text-gray-600 dark:text-gray-400">
                        Vous avez <strong className="text-gray-700 dark:text-gray-100">{activeProjectsCount} projets actifs</strong>,
                        <strong className="text-amber-500 dark:text-amber-400"> {overdueTasksCount} tâches en retard</strong>, et
                        <strong className="text-green-600 dark:text-green-400"> {pendingApprovalsCount} approbations en attente</strong>. {/* Updated text-cyan-600 */}
                      </p>
                    </div>
                    <div className="mt-4 md:mt-0 flex space-x-3">
                      <Link
                        href="/dashboard/new-project-request"
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg border border-green-700 hover:border-green-800 transition-colors flex items-center font-medium text-sm shadow-sm hover:shadow-md" // Updated cyan to green
                      >
                        <Plus size={18} className="mr-2" />
                        Nouveau projet
                      </Link>
                      <button className="px-4 py-2 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/80 text-gray-700 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors flex items-center font-medium text-sm shadow-sm hover:shadow-md">
                        <ExternalLink size={18} className="mr-2" />
                        Exporter
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              {/* Projects Card */}
              <StatCard
                title="Projets en Développement"
                value={activeProjectsCount}
                label="actifs"
                description={
                  <>
                    <span className="text-sm">
                      {projectCountsByStage[ProductLifecycleStage.EVALUATION_COUT_POTENTIEL] || 0} en Éval,
                      {projectCountsByStage[ProductLifecycleStage.PROTOTYPAGE] || 0} en Proto,
                      {projectCountsByStage[ProductLifecycleStage.MISE_EN_MARCHE] || 0} en Lancement
                    </span>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {projectCountsByStage[ProductLifecycleStage.DEMANDE_IDEATION] || 0} nouvelles demandes
                    </p>
                  </>
                }
                percentage={Math.round((activeProjectsCount / Math.max(projects.length, 1)) * 100)}
                color={colors.primary} // Uses green
                colorName="primary" // Uses green
                linkText="Voir tous les projets"
                linkUrl="/dashboard/projects"
                // linkColor will default to green
              />

              {/* Tasks Card */}
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
                color={colors.warning} // Uses warning color (amber)
                colorName="warning"
                icon={<ListChecks size={40} />}
                linkText="Voir toutes les tâches"
                linkUrl="/dashboard/tasks"
                linkColor={colors.warning} // Explicitly set link color to warning
              />

              {/* Approvals Card */}
              <StatCard
                title="Approbations Requises"
                value={pendingApprovalsCount}
                label="en attente"
                description={
                  <>
                    {approvalRequests.filter(a => a.status === 'pending').slice(0,2).map(req => (
                      <p key={req.id} className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 truncate" title={`${req.projectName}: ${req.description}`}>
                        <span className="font-medium text-green-600 dark:text-green-400">{req.projectName}:</span> {/* Updated text-cyan-600 */}
                        {req.description.substring(0,25)}{req.description.length > 25 ? '...' : ''}
                      </p>
                    ))}
                    {pendingApprovalsCount === 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5">
                        Aucune approbation.
                      </p>
                    )}
                  </>
                }
                color={colors.primary} // Uses green
                colorName="primary" // Uses green
                icon={<CheckCircle size={40} />}
                linkText="Voir les approbations"
                linkUrl="/dashboard/approvals"
                // linkColor will default to green
              />
            </div>

            {/* Pipeline Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  Pipeline de Lancement de Produit
                </h2>
                <Link
                  href="/dashboard/pipeline-details"
                  className="text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors" // Updated cyan to green
                >
                  Voir détails →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {Object.values(ProductLifecycleStage)
                  .filter(stage => stage !== ProductLifecycleStage.ARCHIVE)
                  .map(stage => {
                    const count = projectCountsByStage[stage] || 0;
                    const stageProjects = projects.filter(p => p.stage === stage);

                    return (
                      <PipelineCard
                        key={stage}
                        stage={stage}
                        count={count}
                        projects={stageProjects.map(p => p.name)}
                      />
                    );
                  })
                }
              </div>
            </div>

            {/* Product Requests Table */}
            <div className="mb-8">
              <NewProductRequestsTable requests={newProductRequests} />
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 mb-8">
              <RecentActivity activities={recentActivity} />
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-5 px-4 sm:px-6 lg:px-8 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-950">
        <div className="max-w-full mx-auto flex flex-col md:flex-row items-center justify-between">
          <p>© {new Date().getFullYear()} Nartex. Tous droits réservés.</p>
          <div className="flex items-center space-x-4 mt-2 md:mt-0">
            <Link href="/terms" className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              Conditions
            </Link>
            <span className="text-gray-400 dark:text-gray-600" aria-hidden="true">•</span>
            <Link href="/privacy" className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              Confidentialité
            </Link>
            <span className="text-gray-400 dark:text-gray-600" aria-hidden="true">•</span>
            <Link href="/contact" className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}