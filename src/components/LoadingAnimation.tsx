// src/components/LoadingAnimation.tsx
"use client";

import React from "react";

interface LoadingAnimationProps {
  title?: string;
  subtitle?: string;
  fullScreen?: boolean;
  className?: string;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  title = "Chargement en cours",
  subtitle = "Nartex",
  fullScreen = true,
  className = "",
}) => {
  const containerClasses = fullScreen
    ? `fixed inset-0 flex items-center justify-center z-50 bg-[hsl(var(--bg-base))]`
    : `flex items-center justify-center ${className}`;

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center space-y-8">
        {/* Spinner Container */}
        <div className="relative w-28 h-28">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full blur-xl bg-[hsl(var(--accent))]/20" />

          {/* Outer static ring */}
          <div className="absolute inset-0 rounded-full border-4 border-[hsl(var(--accent))]/10" />

          {/* Primary spinning ring */}
          <div
            className="absolute inset-0 rounded-full border-4 border-[hsl(var(--accent))] border-t-transparent animate-spin"
            style={{
              animationDuration: "1s",
              animationTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />

          {/* Secondary spinning ring (reverse, smaller) — Info color for contrast */}
          <div
            className="absolute inset-3 rounded-full border-4 border-[hsl(var(--info))] border-b-transparent animate-spin"
            style={{
              animationDuration: "1.5s",
              animationTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
              animationDirection: "reverse",
            }}
          />

          {/* Inner pulsing dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-3 h-3 rounded-full animate-pulse bg-[hsl(var(--accent))]"
              style={{
                animationDuration: "1s",
              }}
            />
          </div>
        </div>

        {/* Labels */}
        <div className="text-center space-y-2">
          <p className="text-lg font-medium tracking-wide text-[hsl(var(--text-primary))]">
            {title}
          </p>
          {subtitle && (
            <p className="text-sm text-[hsl(var(--text-muted))]">
              {subtitle}
            </p>
          )}
        </div>

        {/* Loading dots animation */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full animate-bounce bg-[hsl(var(--accent))]/60"
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
