"use client";

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { colors } from '@/lib/data'; // Assuming colors are exported from data.ts

// A simple Progress Circle component to be included in this file or imported
const ProgressCircle: React.FC<{ percentage: number; color?: string }> = ({ percentage, color = colors.primary }) => {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percentage / 100) * circ;

  return (
    <svg className="w-24 h-24" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="transparent" stroke="currentColor" className="text-gray-300 dark:text-gray-700" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={r} fill="transparent" stroke={color} strokeWidth="8"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="55" textAnchor="middle" fontSize="18" fontWeight="bold" className="fill-gray-900 dark:fill-white">
        {percentage}%
      </text>
    </svg>
  );
};

export const StatCard: React.FC<{
  title: string;
  value: number | string;
  label: string;
  description: React.ReactNode;
  icon?: React.ReactNode;
  percentage?: number;
  color?: string;
  secondaryLabel?: React.ReactNode;
  progressBar?: boolean;
  progressValue?: number;
  linkText: string;
  linkUrl: string;
  linkColor?: string;
}> = ({
  title, value, label, description, icon, percentage, color = colors.primary,
  secondaryLabel = null, progressBar = false, progressValue = 0,
  linkText, linkUrl, linkColor
}) => {
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
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressValue}%`, backgroundColor: color }}></div>
                </div>
              </div>
            )}
          </div>
          {percentage !== undefined ? (
            <div className="ml-4"><ProgressCircle percentage={percentage} color={color} /></div>
          ) : icon ? (
            <div className="ml-4" style={{ color: color, opacity: 0.6 }}>{icon}</div>
          ) : null}
        </div>
      </div>
      <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70">
        <Link href={linkUrl} className="text-sm font-medium flex items-center transition-colors" style={{ color: actualLinkColor }}>
          <span>{linkText}</span>
          <ChevronRight className="h-4 w-4 ml-1.5" />
        </Link>
      </div>
    </div>
  );
};