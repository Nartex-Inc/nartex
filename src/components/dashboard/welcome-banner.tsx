"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button'; // Assuming you use shadcn button
import { X, Plus, ExternalLink } from 'lucide-react';
import Link from 'next/link';

// Define an interface for the props this component will receive
interface WelcomeBannerProps {
  userName: string;
  activeProjectsCount: number;
  overdueTasksCount: number;
  pendingApprovalsCount: number;
}

// Update the function to accept these props
export function WelcomeBanner({
  userName,
  activeProjectsCount,
  overdueTasksCount,
  pendingApprovalsCount
}: WelcomeBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Your original logic for the greeting
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

  // Restore the original, more detailed banner
  return (
    <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xl">
      <div className="relative p-6 md:p-8">
        <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            onClick={() => setIsVisible(false)}
        >
            <X className="h-5 w-5" />
            <span className="sr-only">Dismiss</span>
        </Button>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
                {greeting}, <span className="text-green-600">{userName}</span> !
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Vous avez <strong className="text-gray-700 dark:text-gray-100">{activeProjectsCount} projets actifs</strong>,
                <strong className="text-amber-500 dark:text-amber-400"> {overdueTasksCount} tâches en retard</strong>, et
                <strong className="text-green-600 dark:text-green-400"> {pendingApprovalsCount} approbations en attente</strong>.
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <Link
                href="/dashboard/new-project-request"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg border border-green-700 hover:border-green-800 transition-colors flex items-center font-medium text-sm shadow-sm hover:shadow-md"
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
  );
}