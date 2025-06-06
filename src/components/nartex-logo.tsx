// components/nartex-logo.tsx
import React from 'react';
import Image from 'next/image';

const NartexLogo = ({ className = "", width = 80, height = 20 }: { className?: string, width?: number, height?: number }) => {
  return (
    <Image
      src="/nartex-logo.svg" // Path relative to the `public` directory
      alt="Nartex Logo"
      width={width}         // Provide explicit width
      height={height}       // Provide explicit height
      className={className}   // Apply Tailwind classes for additional styling (e.g., text-white for fill if SVG uses currentColor)
      priority             // Optional: if it's an LCP element
    />
  );
};

export default NartexLogo;