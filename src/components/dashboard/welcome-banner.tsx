"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Plus, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface WelcomeBannerProps {
  userName: string;
  activeProjectsCount: number;
  overdueTasksCount: number;
  pendingApprovalsCount: number;
}

export function WelcomeBanner({
  userName,
  activeProjectsCount,
  overdueTasksCount,
  pendingApprovalsCount
}: WelcomeBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  const [greeting, setGreeting] = useState("Bonjour");
  useState(() => {
    const hours = new Date().getHours();
    if (hours >= 12 && hours < 18) {
      setGreeting("Bon après-midi");
    } else if (hours >= 18 || hours < 5) {
      setGreeting("Bonsoir");
    }
  });

  if (!isVisible) {
    return null;
  }

  return (
    <div className="mb-8 bg-[hsl(var(--bg-surface))] rounded-xl border border-[hsl(var(--border-subtle))] overflow-hidden shadow-sm">
      <div className="relative p-6 md:p-8">
        <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-secondary))]"
            onClick={() => setIsVisible(false)}
        >
            <X className="h-5 w-5" />
            <span className="sr-only">Dismiss</span>
        </Button>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-[hsl(var(--text-primary))] mb-1">
                {greeting}, <span className="text-[hsl(var(--accent))]">{userName}</span> !
              </h1>
              <p className="text-[hsl(var(--text-tertiary))]">
                Vous avez <strong className="text-[hsl(var(--text-primary))]">{activeProjectsCount} projets actifs</strong>,
                <strong className="text-[hsl(var(--warning))]"> {overdueTasksCount} tâches en retard</strong>, et
                <strong className="text-[hsl(var(--success))]"> {pendingApprovalsCount} approbations en attente</strong>.
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <Link
                href="/dashboard/new-project-request"
                className="px-4 py-2 bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-hover))] text-white rounded-lg transition-colors flex items-center font-medium text-sm shadow-sm hover:shadow-md"
              >
                <Plus size={18} className="mr-2" />
                Nouveau projet
              </Link>
              <button className="px-4 py-2 bg-[hsl(var(--bg-elevated))] hover:bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-secondary))] rounded-lg border border-[hsl(var(--border-default))] hover:border-[hsl(var(--border-strong))] transition-colors flex items-center font-medium text-sm shadow-sm hover:shadow-md">
                <ExternalLink size={18} className="mr-2" />
                Exporter
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
