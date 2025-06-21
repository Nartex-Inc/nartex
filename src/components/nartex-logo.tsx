// src/components/nartex-logo.tsx

// REMOVED: import Image from 'next/image';
import React from 'react';

// The SVG content is now inline.
// The `fill="currentColor"` is the key change that makes it styleable.
const NartexLogo = ({ className = "", width = 80, height = 20 }: { className?: string; width?: number; height?: number; }) => {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 180 45" // Adjust viewBox to match your actual SVG dimensions
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      aria-label="Nartex Logo"
    >
      {/* 
        This is a placeholder. Replace this <text> element 
        with the actual <path> data from your nartex-logo.svg file.
        Make sure the paths inside your SVG use `fill="currentColor"`.
      */}
      <text 
        x="0" 
        y="35" 
        fontFamily="Arial, sans-serif" 
        fontSize="40" 
        fontWeight="bold" 
        fill="currentColor"
      >
        nartex
      </text>
    </svg>
  );
};

export default NartexLogo;
