"use client";

import Link from 'next/link';

export const PipelineCard: React.FC<{
  stage: string;
  count: number;
  projects: string[];
}> = ({ stage, count, projects }) => {
  const progressBarWidth = count > 0 ? `${(count * 25 + 20)}%` : '0%'; // Simple scaling

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors duration-200 flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate" title={stage}>
          {stage}
        </h3>
        <span className={`text-lg font-bold ${count > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
          {count}
        </span>
      </div>
      <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full mb-3">
        <div className={`h-1.5 rounded-full transition-all duration-500 ${count > 0 ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'}`} style={{ width: progressBarWidth }}/>
      </div>
      <div className="space-y-1.5 text-sm">
        {projects.length > 0 ? (
          projects.slice(0, 3).map((project, idx) => (
            <Link key={idx} href={`/dashboard/projects/${encodeURIComponent(project)}`} className="block text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white truncate p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors" title={project}>
              {project}
            </Link>
          ))
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-500 italic">Aucun projet</p>
        )}
        {projects.length > 3 && (
          <p className="text-xs text-gray-500 dark:text-gray-500 italic mt-1">et {projects.length - 3} autres...</p>
        )}
      </div>
    </div>
  );
};