"use client";

import React, { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { redirect, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Bell, LogOut, Menu, Settings, Moon, Sun, User, ChevronRight,
  Plus, ExternalLink, CheckCircle, ListChecks, BarChart2, Users,
  HelpCircle, CreditCard, Search, Command, X, TrendingUp,
  ArrowUpRight, Activity, Calendar, Filter, Download, Clock,
  Zap, Shield, Briefcase, FolderOpen, AlertCircle, ChevronDown,
  MoreVertical, ArrowRight, Sparkles, Target, Package, Rocket
} from 'lucide-react';

// --- Premium Color Palette ---
const colors = {
  primary: "#10B981", // Emerald-500
  primaryDark: "#059669", // Emerald-600
  primaryLight: "#34D399", // Emerald-400
  primaryGlow: "rgba(16, 185, 129, 0.4)",
  accent: "#8B5CF6", // Violet-500
  accentDark: "#7C3AED", // Violet-600
  accentLight: "#A78BFA", // Violet-400
  warning: "#F59E0B", // Amber-500
  warningLight: "#FCD34D", // Amber-300
  danger: "#EF4444", // Red-500
  dangerLight: "#FCA5A5", // Red-300
  success: "#10B981", // Emerald-500
  info: "#3B82F6", // Blue-500
  // Neutral colors
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
    950: "#030712"
  }
};

// --- Gradient Definitions ---
const gradients = {
  primary: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
  accent: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
  mesh: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)",
  dark: "linear-gradient(180deg, #111827 0%, #1F2937 100%)",
  card: "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)",
  glow: "radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.3) 0%, transparent 70%)"
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
  progress?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
  budget?: number;
  team?: string[];
}

interface UserTask {
  id: string;
  projectId: string;
  projectName: string;
  description: string;
  status: TaskStatus;
  responsible: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  progress?: number;
}

interface ApprovalRequest {
  id: string;
  projectId: string;
  projectName: string;
  description: string;
  requestedBy: string;
  status: 'pending' | 'approved' | 'rejected';
  urgency?: 'low' | 'medium' | 'high';
  requestDate?: string;
}

interface RecentActivityItem {
  id: string;
  type: 'project_submission' | 'option_advanced' | 'task_update' | 'delivery_alert' | 'approval_request' | 'user_join' | 'comment';
  text: string;
  timestamp: string;
  iconType: 'project' | 'task_completed' | 'user_added' | 'comment' | 'alert' | 'edit' | 'approval';
  user?: {
    name: string;
    avatar?: string;
  };
}

interface NewProductRequest {
  id: string;
  projectName: string;
  initiator: string;
  submissionDate: string;
  status: NewProductRequestStatus;
  reason?: string;
  category?: string;
  estimatedRevenue?: number;
}

interface NavItem {
  href: string;
  title: string;
  icon: React.ReactNode;
  active?: boolean;
  badge?: number | null;
  badgeColor?: "warning" | "primary" | "accent";
  description?: string;
}

// --- Mock Data ---
const mockProjectsData: ProjectSummary[] = [
  { id: "proj1", name: "QuadraShield MP Series", stage: ProductLifecycleStage.PROTOTYPAGE, initiator: "Jean Martin", progress: 65, priority: 'high', budget: 250000, team: ['JM', 'SD', 'CP'] },
  { id: "proj2", name: "EcoLube Bio+ Additif Carburant", stage: ProductLifecycleStage.EVALUATION_COUT_POTENTIEL, initiator: "Sophie Dubois", progress: 30, priority: 'medium', budget: 180000, team: ['SD', 'RC'] },
  { id: "proj3", name: "SintoMax Gear Oil X (Nouvelle Formule)", stage: ProductLifecycleStage.MISE_EN_MARCHE, initiator: "Chef de Produit", progress: 85, priority: 'critical', budget: 320000, team: ['CP', 'JV', 'MD'] },
  { id: "proj4", name: "ProClean Dégraissant Industriel Bio", stage: ProductLifecycleStage.DEMANDE_IDEATION, initiator: "Ventes Nord", progress: 10, priority: 'low', budget: 150000, team: ['VN'] },
  { id: "proj5", name: "XtremeTemp Graisse G2 Haute Performance", stage: ProductLifecycleStage.PLANIFICATION_PRODUIT_FINI, initiator: "R&D Central", progress: 70, priority: 'high', budget: 280000, team: ['RC', 'ST', 'JV'] },
  { id: "proj6", name: "LubriCool SX Huile de Coupe Synthétique", stage: ProductLifecycleStage.COMITE_EVALUATION, initiator: "Marketing Global", progress: 45, priority: 'medium', budget: 200000, team: ['MG', 'RC'] },
  { id: "proj7", name: "AeroGlide Lubrifiant Sec PTFE", stage: ProductLifecycleStage.VIE_DU_PRODUIT, initiator: "R&D Central", progress: 100, priority: 'low', budget: 350000, team: ['RC', 'CP', 'ST'] },
];

const mockUserTasksData: UserTask[] = [
  { id: "task1", projectId: "proj1", projectName: "QuadraShield MP Series", description: "Finaliser design packaging", status: TaskStatus.EN_COURS, responsible: "Séléna", dueDate: "2025-06-15", priority: 'high', progress: 60 },
  { id: "task2", projectId: "proj2", projectName: "EcoLube Bio+", description: "Analyse de marché concurrentiel", status: TaskStatus.EN_RETARD, responsible: "CPO et Ventes", dueDate: "2025-05-28", priority: 'high', progress: 20 },
  { id: "task3", projectId: "proj3", projectName: "SintoMax Gear Oil X", description: "Préparer matériel de formation", status: TaskStatus.FAIT, responsible: "Sam et JV", dueDate: "2025-05-25", priority: 'medium', progress: 100 },
  { id: "task4", projectId: "proj1", projectName: "QuadraShield MP Series", description: "Test produit en application", status: TaskStatus.NON_COMPLETE, responsible: "Sup. tech", dueDate: "2025-07-01", priority: 'medium', progress: 0 },
  { id: "task5", projectId: "proj5", projectName: "XtremeTemp Grease G2", description: "Rédaction MSDS et réglementaire", status: TaskStatus.EN_COURS, responsible: "Stéphane", dueDate: "2025-06-10", priority: 'high', progress: 40 },
];

const mockApprovalRequestsData: ApprovalRequest[] = [
  { id: "app1", projectId: "proj1", projectName: "QuadraShield MP Series", description: "Approbation budget prototypage (Option B)", requestedBy: "Comité", status: 'pending', urgency: 'high', requestDate: "2025-05-29" },
  { id: "app2", projectId: "proj2", projectName: "EcoLube Bio+", description: "Validation spécifications techniques", requestedBy: "R&D", status: 'pending', urgency: 'medium', requestDate: "2025-05-30" },
  { id: "app3", projectId: "proj6", projectName: "LubriCool SX", description: "Accord Comité d'évaluation (Critères)", requestedBy: "Direction", status: 'approved', urgency: 'low', requestDate: "2025-05-25" },
];

const mockRecentActivityData: RecentActivityItem[] = [
  { id: "act1", type: "project_submission", text: `Nouveau projet EcoLube Bio+ soumis`, timestamp: "Il y a 30 minutes", iconType: 'project', user: { name: "Sophie Dubois", avatar: "/avatars/sd.jpg" } },
  { id: "act2", type: "task_update", text: `'Analyse de marché' (QuadraShield MP) est en retard`, timestamp: "Il y a 1 heure", iconType: 'alert', user: { name: "System" } },
  { id: "act3", type: "approval_request", text: `Approbation budget requise pour 'QuadraShield MP'`, timestamp: "Il y a 2 heures", iconType: 'approval', user: { name: "Comité" } },
  { id: "act4", type: "user_join", text: `Martin Désy a rejoint le projet SintoMax Gear Oil X`, timestamp: "Hier", iconType: 'user_added', user: { name: "Martin Désy", avatar: "/avatars/md.jpg" } },
];

const mockNewProductRequestsData: NewProductRequest[] = [
  { id: "npr1", projectName: "Huile Moteur Synthétique LongLife", initiator: "Ventes Auto", submissionDate: "2025-05-08", status: NewProductRequestStatus.EN_ATTENTE, category: "Automotive", estimatedRevenue: 450000 },
  { id: "npr2", projectName: "Nettoyant Freins Écologique", initiator: "R&D Spécialités", submissionDate: "2025-05-05", status: NewProductRequestStatus.ACCEPTE, reason: "Potentiel marché élevé.", category: "Specialty", estimatedRevenue: 320000 },
  { id: "npr3", projectName: "Graisse Alimentaire H1 SuperLube", initiator: "Marketing Agro", submissionDate: "2025-05-02", status: NewProductRequestStatus.REFUSE, reason: "ROI faible.", category: "Food Grade", estimatedRevenue: 180000 },
  { id: "npr4", projectName: "Fluide Hydraulique BioDégradable HVLP", initiator: "Grand Comptes Industriels", submissionDate: "2025-04-28", status: NewProductRequestStatus.EN_ATTENTE, category: "Industrial", estimatedRevenue: 550000 },
  { id: "npr5", projectName: "Spray Silicone Anti-Adhérent PRO", initiator: "Support Technique", submissionDate: "2025-04-25", status: NewProductRequestStatus.ACCEPTE, category: "Specialty", estimatedRevenue: 280000 },
];

// --- Components ---

// Premium Loading Spinner
const LoadingSpinner: React.FC<{ className?: string }> = ({ className = "h-5 w-5 text-emerald-500" }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// Animated Progress Ring
const ProgressRing: React.FC<{ 
  percentage: number; 
  size?: number; 
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  showPercentage?: boolean;
  animate?: boolean;
}> = ({ 
  percentage, 
  size = 120, 
  strokeWidth = 8, 
  color = colors.primary,
  bgColor = colors.gray[200],
  showPercentage = true,
  animate = true
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className={animate ? "transform -rotate-90 transition-transform duration-1000" : "transform -rotate-90"}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="none"
          className="dark:stroke-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={animate ? "transition-all duration-1000 ease-out" : ""}
          style={{
            filter: `drop-shadow(0 0 6px ${color}40)`
          }}
        />
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{percentage}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Premium Stat Card
const PremiumStatCard: React.FC<{
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon: React.ReactNode;
  color: string;
  bgGradient?: string;
  actions?: React.ReactNode;
  chart?: React.ReactNode;
  details?: React.ReactNode;
}> = ({ title, value, change, icon, color, bgGradient, actions, chart, details }) => {
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Background gradient effect */}
      <div 
        className="absolute inset-0 opacity-5 dark:opacity-10"
        style={{ background: bgGradient || gradients.mesh }}
      />
      
      {/* Hover glow effect */}
      <div 
        className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${color}20, transparent 70%)`
        }}
      />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div 
              className="p-3 rounded-xl bg-gradient-to-br shadow-lg transform group-hover:scale-110 transition-transform duration-300"
              style={{ 
                background: `linear-gradient(135deg, ${color}20, ${color}10)`,
                boxShadow: `0 4px 12px ${color}20`
              }}
            >
              <div style={{ color }}>{icon}</div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h3>
              <div className="flex items-baseline space-x-2">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                {change && (
                  <span className={`flex items-center text-sm font-medium ${
                    change.type === 'increase' ? 'text-emerald-500' : 'text-red-500'
                  }`}>
                    {change.type === 'increase' ? <TrendingUp size={16} className="mr-1" /> : <TrendingUp size={16} className="mr-1 rotate-180" />}
                    {change.value}%
                  </span>
                )}
              </div>
            </div>
          </div>
          {actions && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {actions}
            </div>
          )}
        </div>

        {/* Chart or details */}
        {chart && <div className="mt-4">{chart}</div>}
        {details && <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">{details}</div>}
      </div>
    </div>
  );
};

// Premium Pipeline Stage Card
const PremiumPipelineCard: React.FC<{
  stage: string;
  count: number;
  projects: ProjectSummary[];
  icon: React.ReactNode;
  color: string;
  totalBudget: number;
}> = ({ stage, count, projects, icon, color, totalBudget }) => {
  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Animated background gradient */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${color}, transparent 70%)`
        }}
      />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div 
              className="p-2 rounded-lg"
              style={{ 
                background: `${color}15`,
                color: color
              }}
            >
              {icon}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{stage}</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">Budget total</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(totalBudget)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{ 
                width: `${Math.min(count * 20, 100)}%`,
                background: `linear-gradient(90deg, ${color}, ${color}dd)`
              }}
            />
          </div>
        </div>

        {/* Projects list */}
        <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
          {projects.length > 0 ? (
            projects.slice(0, 3).map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="group/item flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="flex -space-x-1">
                    {project.team?.slice(0, 2).map((member, idx) => (
                      <div 
                        key={idx}
                        className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300 ring-2 ring-white dark:ring-gray-800"
                      >
                        {member}
                      </div>
                    ))}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{project.name}</span>
                </div>
                <ArrowRight size={14} className="text-gray-400 group-hover/item:text-gray-600 dark:group-hover/item:text-gray-300 transition-colors" />
              </Link>
            ))
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">Aucun projet</p>
          )}
        </div>

        {projects.length > 3 && (
          <Link 
            href="/dashboard/projects"
            className="mt-3 flex items-center justify-center text-sm font-medium py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            style={{ color }}
          >
            Voir {projects.length - 3} autres
            <ChevronRight size={16} className="ml-1" />
          </Link>
        )}
      </div>
    </div>
  );
};

// Premium Activity Feed
const PremiumActivityFeed: React.FC<{ activities: RecentActivityItem[] }> = ({ activities }) => {
  const getActivityIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'project': <Briefcase size={18} />,
      'task_completed': <CheckCircle size={18} />,
      'user_added': <Users size={18} />,
      'comment': <Activity size={18} />,
      'approval': <Shield size={18} />,
      'alert': <AlertCircle size={18} />,
      'edit': <Target size={18} />
    };
    return iconMap[type] || <Activity size={18} />;
  };

  const getActivityColor = (type: string) => {
    const colorMap: Record<string, string> = {
      'project': colors.primary,
      'task_completed': colors.success,
      'user_added': colors.accent,
      'comment': colors.info,
      'approval': colors.primary,
      'alert': colors.warning,
      'edit': colors.info
    };
    return colorMap[type] || colors.gray[500];
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-lg">
              <Activity size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Activité Récente</h2>
          </div>
          <Link href="/dashboard/activity" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors flex items-center">
            Voir tout
            <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {activities.map((activity) => (
          <div key={activity.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
            <div className="flex items-start space-x-4">
              <div 
                className="flex-shrink-0 p-2 rounded-lg"
                style={{
                  background: `${getActivityColor(activity.iconType)}15`,
                  color: getActivityColor(activity.iconType)
                }}
              >
                {getActivityIcon(activity.iconType)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {activity.user && (
                    <span className="font-medium text-gray-900 dark:text-white">{activity.user.name}</span>
                  )}{' '}
                  {activity.text}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                  <Clock size={12} className="mr-1" />
                  {activity.timestamp}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Premium Quick Actions
const QuickActions: React.FC = () => {
  const actions = [
    { icon: <Plus size={20} />, label: "Nouveau Projet", href: "/dashboard/new-project", color: colors.primary },
    { icon: <ListChecks size={20} />, label: "Créer Tâche", href: "/dashboard/tasks/new", color: colors.accent },
    { icon: <Users size={20} />, label: "Inviter Membre", href: "/dashboard/team/invite", color: colors.info },
    { icon: <Download size={20} />, label: "Exporter", href: "/dashboard/export", color: colors.warning }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {actions.map((action, idx) => (
        <Link
          key={idx}
          href={action.href}
          className="group relative bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
               style={{ background: `radial-gradient(circle at 50% 50%, ${action.color}10, transparent 70%)` }} />
          <div className="relative flex flex-col items-center text-center space-y-3">
            <div 
              className="p-3 rounded-lg transform group-hover:scale-110 transition-transform duration-300"
              style={{ 
                background: `${action.color}15`,
                color: action.color
              }}
            >
              {action.icon}
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
          </div>
        </Link>
      ))}
    </div>
  );
};

// Command Palette
const CommandPalette: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [search, setSearch] = useState('');
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-start justify-center min-h-screen pt-20 px-4">
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <Search size={20} className="text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher des commandes, projets, ou actions..."
              className="flex-1 ml-3 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-500"
              autoFocus
            />
            <button
              onClick={onClose}
              className="ml-3 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto p-2">
            <div className="space-y-1">
              {/* Quick actions */}
              <div className="p-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Actions Rapides</p>
                <div className="space-y-1">
                  <button className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors text-left">
                    <Plus size={18} className="text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Nouveau Projet</span>
                    <span className="ml-auto text-xs text-gray-400">⌘N</span>
                  </button>
                  <button className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors text-left">
                    <Search size={18} className="text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Rechercher</span>
                    <span className="ml-auto text-xs text-gray-400">⌘K</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
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
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userMenuButtonRef = useRef<HTMLButtonElement>(null);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [greeting, setGreeting] = useState<string>("");
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Data states
  const [projects] = useState<ProjectSummary[]>(mockProjectsData);
  const [userTasks] = useState<UserTask[]>(mockUserTasksData);
  const [approvalRequests] = useState<ApprovalRequest[]>(mockApprovalRequestsData);
  const [recentActivity] = useState<RecentActivityItem[]>(mockRecentActivityData);
  const [newProductRequests] = useState<NewProductRequest[]>(mockNewProductRequestsData);

  // Navigation items
  const navigationItems: NavItem[] = [
    {
      href: "/dashboard",
      title: "Vue d'ensemble",
      icon: <BarChart2 size={20} />,
      active: pathname === "/dashboard",
      description: "Tableau de bord principal"
    },
    {
      href: "/dashboard/projects",
      title: "Projets",
      icon: <Briefcase size={20} />,
      active: pathname.startsWith("/dashboard/projects"),
      badge: projects.filter(p => p.stage !== ProductLifecycleStage.ARCHIVE).length,
      description: "Gérer vos projets"
    },
    {
      href: "/dashboard/tasks",
      title: "Tâches",
      icon: <ListChecks size={20} />,
      active: pathname.startsWith("/dashboard/tasks"),
      badge: userTasks.filter(t => t.status !== TaskStatus.FAIT).length,
      badgeColor: "warning",
      description: "Vos tâches assignées"
    },
    {
      href: "/dashboard/approvals",
      title: "Approbations",
      icon: <Shield size={20} />,
      active: pathname.startsWith("/dashboard/approvals"),
      badge: approvalRequests.filter(a => a.status === 'pending').length,
      badgeColor: "accent",
      description: "Demandes en attente"
    },
    {
      href: "/dashboard/analytics",
      title: "Analytiques",
      icon: <Activity size={20} />,
      active: pathname.startsWith("/dashboard/analytics"),
      description: "Insights et rapports"
    },
    {
      href: "/dashboard/team",
      title: "Équipe",
      icon: <Users size={20} />,
      active: pathname.startsWith("/dashboard/team"),
      description: "Gestion d'équipe"
    }
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Theme initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem('nartex-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDarkMode(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Time and greeting
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
    const intervalId = setInterval(updateTimeAndGreeting, 60000);
    return () => clearInterval(intervalId);
  }, []);

  // Authentication
  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/");
    }
  }, [status]);

  // User menu outside click
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

  // Toggle theme
  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      if (newMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('nartex-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('nartex-theme', 'light');
      }
      return newMode;
    });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center">
          <LoadingSpinner className="h-12 w-12 text-emerald-500" />
          <p className="mt-4 text-gray-500 dark:text-gray-400 animate-pulse">
            Chargement de votre espace...
          </p>
        </div>
      </div>
    );
  }

  const userDisplayName = session?.user?.name || "Utilisateur";
  const userEmail = session?.user?.email || "user@example.com";

  // Computed values
  const activeProjectsCount = projects.filter(p => p.stage !== ProductLifecycleStage.ARCHIVE).length;
  const totalProjectValue = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const completedTasksPercentage = Math.round((userTasks.filter(t => t.status === TaskStatus.FAIT).length / userTasks.length) * 100) || 0;
  const overdueTasksCount = userTasks.filter(t => t.status === TaskStatus.EN_RETARD).length;

  // Pipeline stage configuration
  const pipelineStages = [
    { stage: ProductLifecycleStage.DEMANDE_IDEATION, icon: <Sparkles size={20} />, color: colors.accent },
    { stage: ProductLifecycleStage.EVALUATION_COUT_POTENTIEL, icon: <Target size={20} />, color: colors.info },
    { stage: ProductLifecycleStage.COMITE_EVALUATION, icon: <Shield size={20} />, color: colors.warning },
    { stage: ProductLifecycleStage.PROTOTYPAGE, icon: <Package size={20} />, color: colors.primary },
    { stage: ProductLifecycleStage.MISE_EN_FONCTION_DEVELOPPEMENT, icon: <Zap size={20} />, color: colors.accent },
    { stage: ProductLifecycleStage.PLANIFICATION_PRODUIT_FINI, icon: <Calendar size={20} />, color: colors.info },
    { stage: ProductLifecycleStage.MISE_EN_MARCHE, icon: <Rocket size={20} />, color: colors.primary },
    { stage: ProductLifecycleStage.VIE_DU_PRODUIT, icon: <Activity size={20} />, color: colors.success }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Command Palette */}
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />

      {/* Premium Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Menu size={20} className="text-gray-700 dark:text-gray-300" />
              </button>
              
              <Link href="/dashboard" className="flex items-center">
              <Image
                src="/nartex-logo.svg" // Ensure this path is correct (in your `public` folder)
                alt="Nartex Logo"
                width={110} // Desired width
                height={28}  // Desired height
                priority    // Good to have if logo is above the fold (LCP)
                className="block h-7 w-auto filter dark:invert dark:brightness-125 dark:contrast-150"
                onError={(e) => {
                  // Fallback in case the logo fails to load
                  e.currentTarget.src = 'https://placehold.co/110x28/CCCCCC/000000?text=Nartex&font=sans';
                  e.currentTarget.alt = 'Nartex (logo unavailable)';
                }}
              />
            </Link>
            
              {/* Search */}
              <button
                onClick={() => setIsCommandPaletteOpen(true)}
                className="hidden md:flex items-center space-x-3 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-w-[200px]"
              >
                <Search size={18} className="text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Rechercher...</span>
                <kbd className="ml-auto text-xs bg-white dark:bg-gray-700 px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600">⌘K</kbd>
              </button>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* Theme toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {isDarkMode ? <Sun size={20} className="text-gray-700 dark:text-gray-300" /> : <Moon size={20} className="text-gray-700 dark:text-gray-300" />}
              </button>

              {/* Notifications */}
              <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Bell size={20} className="text-gray-700 dark:text-gray-300" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full"></span>
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  ref={userMenuButtonRef}
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {userDisplayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <ChevronDown size={16} className="text-gray-500" />
                </button>

                {isUserMenuOpen && (
                  <div
                    ref={userMenuRef}
                    className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{userDisplayName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{userEmail}</p>
                    </div>
                    <div className="p-2">
                      <Link
                        href="/dashboard/profile"
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <User size={18} className="text-gray-600 dark:text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Mon Profil</span>
                      </Link>
                      <Link
                        href="/dashboard/settings"
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Settings size={18} className="text-gray-600 dark:text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Paramètres</span>
                      </Link>
                      <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <LogOut size={18} className="text-gray-600 dark:text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Déconnexion</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Premium Sidebar */}
        <aside className={`${isSidebarOpen ? 'w-72' : 'w-0 lg:w-20'} transition-all duration-300 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-hidden`}>
          <div className="h-full flex flex-col">
            <nav className="flex-1 p-4 space-y-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    group flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200
                    ${item.active 
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                    ${!isSidebarOpen && 'lg:justify-center'}
                  `}
                >
                  <span className={`${item.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {item.icon}
                  </span>
                  {isSidebarOpen && (
                    <>
                      <span className="flex-1 font-medium">{item.title}</span>
                      {item.badge !== null && item.badge !== undefined && item.badge > 0 && (
                        <span className={`
                          px-2 py-0.5 text-xs font-medium rounded-full
                          ${item.badgeColor === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 
                            item.badgeColor === 'accent' ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400' :
                            'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'}
                        `}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              ))}
            </nav>

            {/* Sidebar footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
              <div className={`${isSidebarOpen ? 'block' : 'hidden'}`}>
                <div className="bg-gradient-to-br from-emerald-500/10 to-violet-500/10 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Plan Premium</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Débloquez toutes les fonctionnalités</p>
                  <button className="w-full px-3 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all duration-300">
                    Mettre à niveau
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 space-y-8">
            {/* Welcome Section */}
            <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-8 text-white overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20" />
              <div className="relative z-10">
                <h1 className="text-3xl font-bold mb-2">
                  {greeting}, {userDisplayName}! 👋
                </h1>
                <p className="text-emerald-100 text-lg">
                  Voici un aperçu de vos projets et activités d'aujourd'hui
                </p>
                <div className="mt-6 flex flex-wrap gap-4">
                  <Link
                    href="/dashboard/new-project"
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                  >
                    <Plus size={20} />
                    <span className="font-medium">Nouveau Projet</span>
                  </Link>
                  <button className="inline-flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors">
                    <Download size={20} />
                    <span className="font-medium">Exporter Rapport</span>
                  </button>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            </div>

            {/* Quick Actions */}
            <QuickActions />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <PremiumStatCard
                title="Projets Actifs"
                value={activeProjectsCount}
                                change={{ value: 12, type: 'increase' }}
                icon={<Briefcase size={28} />}
                color={colors.primary}
                bgGradient={gradients.primary}
              />

              <PremiumStatCard
                title="Tâches ouvertes"
                value={userTasks.filter(t => t.status !== TaskStatus.FAIT).length}
                change={{ value: 5, type: 'decrease' }}
                icon={<ListChecks size={28} />}
                color={colors.accent}
                bgGradient={gradients.accent}
              />

              <PremiumStatCard
                title="Approbations en attente"
                value={approvalRequests.filter(a => a.status === 'pending').length}
                icon={<Shield size={28} />}
                color={colors.warning}
                bgGradient={gradients.mesh}
              />

              <PremiumStatCard
                title="Nouvelles demandes"
                value={newProductRequests.filter(r => r.status === NewProductRequestStatus.EN_ATTENTE).length}
                icon={<Sparkles size={28} />}
                color={colors.success}
                bgGradient={gradients.glow}
              />
            </div>

            {/* Pipeline Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {pipelineStages.map(({ stage, icon, color }) => {
                const stageProjects = projects.filter(p => p.stage === stage);
                const totalBudget = stageProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
                return (
                  <PremiumPipelineCard
                    key={stage}
                    stage={stage}
                    count={stageProjects.length}
                    projects={stageProjects}
                    icon={icon}
                    color={color}
                    totalBudget={totalBudget}
                  />
                );
              })}
            </div>

            {/* Activity Feed */}
            <PremiumActivityFeed activities={recentActivity} />
          </div>
        </main>
      </div>
    </div>
  );
}
