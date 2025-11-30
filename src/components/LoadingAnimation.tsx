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
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Default to dark during SSR to prevent flash
  const isDark = mounted ? resolvedTheme === "dark" : true;

  const containerClasses = fullScreen
    ? `fixed inset-0 flex items-center justify-center z-50 ${isDark ? "bg-[#0A0A0A]" : "bg-white"}`
    : `flex items-center justify-center ${className}`;

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center space-y-8">
        {/* Spinner Container */}
        <div className="relative w-28 h-28">
          {/* Outer glow ring — GREEN */}
          <div
            className={`absolute inset-0 rounded-full blur-xl ${
              isDark ? "bg-emerald-500/20" : "bg-emerald-600/15"
            }`}
          />

          {/* Outer static ring */}
          <div
            className={`absolute inset-0 rounded-full border-4 ${
              isDark ? "border-emerald-400/10" : "border-emerald-600/10"
            }`}
          />

          {/* Primary spinning ring — GREEN */}
          <div
            className={`absolute inset-0 rounded-full border-4 border-t-transparent animate-spin ${
              isDark
                ? "border-emerald-400"
                : "border-emerald-600"
            }`}
            style={{
              animationDuration: "1s",
              animationTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />

          {/* Secondary spinning ring (reverse, smaller) — Teal for contrast */}
          <div
            className={`absolute inset-3 rounded-full border-4 border-b-transparent animate-spin ${
              isDark
                ? "border-teal-400"
                : "border-teal-600"
            }`}
            style={{
              animationDuration: "1.5s",
              animationTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
              animationDirection: "reverse",
            }}
          />

          {/* Inner pulsing dot — GREEN */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`w-3 h-3 rounded-full animate-pulse ${
                isDark ? "bg-emerald-400" : "bg-emerald-600"
              }`}
              style={{
                animationDuration: "1s",
              }}
            />
          </div>
        </div>

        {/* Labels */}
        <div className="text-center space-y-2">
          <p
            className={`text-lg font-medium tracking-wide ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            {title}
          </p>
          {subtitle && (
            <p
              className={`text-sm ${
                isDark ? "text-slate-500" : "text-slate-500"
              }`}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Loading dots animation — GREEN */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full animate-bounce ${
                isDark ? "bg-emerald-400/60" : "bg-emerald-600/60"
              }`}
              style={{
                animationDelay: `${i * 0.15}s`,
                animationDuration: "0.6s",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingAnimation;
