// src/components/LoadingAnimation.tsx
"use client";

import React from "react";
import { useTheme } from "next-themes";

interface LoadingAnimationProps {
  title?: string;
  subtitle?: string;
  fullScreen?: boolean;
  className?: string;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  title = "Chargement en cours",
  subtitle = "SINTO Analytics Dashboard",
  fullScreen = true,
  className = "",
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const containerClasses = fullScreen
    ? `fixed inset-0 flex items-center justify-center ${isDark ? "bg-black" : "bg-white"}`
    : `flex items-center justify-center ${className}`;

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center space-y-6">
        <div className="relative">
          {/* Outer faint ring */}
          <div
            className={`w-24 h-24 border-4 rounded-full ${
              isDark ? "border-cyan-400/10" : "border-cyan-600/10"
            }`}
          />
          {/* Main ring */}
          <div
            className={`absolute top-0 w-24 h-24 border-4 rounded-full animate-spin shadow-lg border-t-transparent ${
              isDark
                ? "border-cyan-400 shadow-cyan-400/50"
                : "border-cyan-600 shadow-cyan-600/40"
            }`}
          />
          {/* Secondary ring (reverse direction, delayed) */}
          <div
            className={`absolute top-2 left-2 w-20 h-20 border-4 rounded-full animate-spin shadow-lg border-b-transparent ${
              isDark
                ? "border-violet-400 shadow-violet-400/50"
                : "border-violet-600 shadow-violet-600/40"
            }`}
            style={{ animationDelay: "200ms", animationDirection: "reverse" }}
          />
        </div>

        {/* Labels */}
        <div className="text-center">
          <p className={`text-xl font-light tracking-wider mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
            {title}
          </p>
          {subtitle && (
            <p className={`text-sm ${isDark ? "text-zinc-500" : "text-slate-500"}`}>{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadingAnimation;
