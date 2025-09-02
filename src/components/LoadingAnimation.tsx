// src/components/LoadingAnimation.tsx
import React from 'react';

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
  const containerClasses = fullScreen 
    ? "fixed inset-0 bg-black flex items-center justify-center"
    : `flex items-center justify-center ${className}`;

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center space-y-6">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-cyan-400/10 rounded-full" />
          <div className="absolute top-0 w-24 h-24 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-lg shadow-cyan-400/50" />
          <div 
            className="absolute top-2 left-2 w-20 h-20 border-4 border-violet-400 border-b-transparent rounded-full animate-spin shadow-lg shadow-violet-400/50"
            style={{ animationDelay: '200ms', animationDirection: 'reverse' }}
          />
        </div>
        <div className="text-center">
          <p className="text-xl font-light tracking-wider text-white mb-2">{title}</p>
          {subtitle && (
            <p className="text-sm text-zinc-500">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadingAnimation;
