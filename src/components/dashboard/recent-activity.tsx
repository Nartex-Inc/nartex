"use client";

import Link from 'next/link';
import { RecentActivityItem } from '@/lib/types';
import { CheckCircle, MessageSquare, UserPlus, AlertTriangle, FilePlus, Edit, ShieldCheck } from 'lucide-react';

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
    <div className="bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border-subtle))] rounded-xl shadow-sm">
      <div className="p-5 border-b border-[hsl(var(--border-subtle))] flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[hsl(var(--text-primary))]">Activité Récente</h2>
        <Link href="/dashboard/activity-log" className="text-sm font-medium text-[hsl(var(--accent))] hover:opacity-80 transition-colors">
          Voir tout &rarr;
        </Link>
      </div>
      <div className="p-5 max-h-[400px] overflow-y-auto">
        <div className="space-y-6">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start">
              <div className={`relative flex-shrink-0 w-10 h-10 ${activity.bgColorClass} rounded-lg mr-4 flex items-center justify-center shadow-xs`}>
                <div className={`opacity-70 ${activity.colorClass}`}>{getIcon(activity.iconType)}</div>
                <span className={`absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full ring-2 ring-[hsl(var(--bg-surface))] ${activity.ringColorClass}`}></span>
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--text-secondary))] leading-relaxed" dangerouslySetInnerHTML={{ __html: activity.text }} />
                <p className="text-xs text-[hsl(var(--text-muted))] mt-1">{activity.timestamp}</p>
              </div>
            </div>
          ))}
          {activities.length === 0 && (
            <p className="text-sm text-[hsl(var(--text-muted))] italic">Aucune activité récente.</p>
          )}
        </div>
      </div>
    </div>
  );
};
