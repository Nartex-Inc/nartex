"use client";

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

const ProgressCircle: React.FC<{ percentage: number; color?: string }> = ({ percentage, color }) => {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percentage / 100) * circ;

  return (
    <svg className="w-24 h-24" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="transparent" stroke="currentColor" className="text-[hsl(var(--border-default))]" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={r} fill="transparent" stroke={color || "hsl(var(--accent))"} strokeWidth="8"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="55" textAnchor="middle" fontSize="18" fontWeight="bold" className="fill-[hsl(var(--text-primary))]">
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
  title, value, label, description, icon, percentage, color,
  secondaryLabel = null, progressBar = false, progressValue = 0,
  linkText, linkUrl, linkColor
}) => {
  const actualLinkColor = linkColor || color;

  return (
    <div className="bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border-subtle))] rounded-xl overflow-hidden shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="p-5">
        <div className="flex items-start">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[hsl(var(--text-primary))]">{title}</h2>
              {secondaryLabel}
            </div>
            <div className="mt-2 flex items-baseline">
              <p className="text-4xl font-bold text-[hsl(var(--text-primary))]">{value}</p>
              <span className="ml-2 text-sm text-[hsl(var(--text-tertiary))]">{label}</span>
            </div>
            <div className="text-sm text-[hsl(var(--text-tertiary))] mt-1.5">{description}</div>

            {progressBar && (
              <div className="mt-3.5">
                <div className="w-full bg-[hsl(var(--bg-muted))] rounded-full h-2.5 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressValue}%`, backgroundColor: color || "hsl(var(--accent))" }}></div>
                </div>
              </div>
            )}
          </div>
          {percentage !== undefined ? (
            <div className="ml-4"><ProgressCircle percentage={percentage} color={color} /></div>
          ) : icon ? (
            <div className="ml-4" style={{ color: color || "hsl(var(--accent))", opacity: 0.6 }}>{icon}</div>
          ) : null}
        </div>
      </div>
      <div className="px-5 py-3 border-t border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-elevated))]">
        <Link href={linkUrl} className="text-sm font-medium flex items-center transition-colors hover:opacity-80" style={{ color: actualLinkColor || "hsl(var(--accent))" }}>
          <span>{linkText}</span>
          <ChevronRight className="h-4 w-4 ml-1.5" />
        </Link>
      </div>
    </div>
  );
};
