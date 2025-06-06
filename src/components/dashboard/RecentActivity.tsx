"use client";

import Link from 'next/link';
import { RecentActivityItem } from '@/lib/types'; // Make sure you created types.ts
import { CheckCircle, MessageSquare, UserPlus, AlertTriangle, FilePlus, Edit, ShieldCheck } from 'lucide-react'; // Example icons

const iconMap = {
  project: FilePlus,
  task_completed: CheckCircle,
  user_added: UserPlus,
  comment: MessageSquare,
  alert: AlertTriangle,
  edit: Edit,
  approval: ShieldCheck,
};

export const RecentActivity: React.FC<{ activities: RecentActivityItem[] }> = ({ activities }) => {
  const getIcon = (type: RecentActivityItem['iconType']) => {
    const IconComponent = iconMap[type] || AlertTriangle;
    return <IconComponent className="w-5 h-5" />;
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
      <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Activité Récente</h2>
        <Link href="/dashboard/activity-log" className="text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors">
          Voir tout →
        </Link>
      </div>
      <div className="p-5 max-h-[400px] overflow-y-auto">
        <div className="space-y-6">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start">
              <div className={`relative flex-shrink-0 w-10 h-10 ${activity.bgColorClass} rounded-lg mr-4 flex items-center justify-center shadow`}>
                <div className={`opacity-70 ${activity.colorClass}`}>{getIcon(activity.iconType)}</div>
                <span className={`absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-gray-800 ${activity.ringColorClass}`}></span>
              </div>
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: activity.text }} />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.timestamp}</p>
              </div>
            </div>
          ))}
          {activities.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">Aucune activité récente.</p>
          )}
        </div>
      </div>
    </div>
  );
};