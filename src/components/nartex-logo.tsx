// src/components/ui/nartex-logo.tsx
import React from 'react';

// The component now only needs a `className` prop.
// Sizing (h-..., w-...) and color (text-...) will be passed via Tailwind classes.
export const NartexLogo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    // The className is applied directly to the <svg> tag.
    // We remove explicit width/height and add `fill="currentColor"` so it
    // inherits color from parent text utility classes (e.g., "text-emerald-400").
    <svg 
      className={className} 
      viewBox="0 0 180 45" // IMPORTANT: Use the viewBox from your original SVG for correct scaling.
      fill="currentColor" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 
        !!! ACTION REQUIRED !!!
        Replace the placeholder <path> tag below with the actual SVG code
        from your `/public/nartex-logo.svg` file. 
        Just copy everything that is *inside* the original <svg> tag.
      */}
      <path d="M47.2,38.2c-2.8,0-5.4-0.6-7.8-1.7c-2.4-1.1-4.4-2.8-6-4.9c-1.6-2.1-2.7-4.7-3.3-7.6c-0.6-3-0.9-6.2-0.9-9.5 s0.3-6.5,0.9-9.5c0.6-3,1.7-5.5,3.3-7.6c1.6-2.1,3.6-3.8,6-4.9C41.8,1.1,44.4,0.5,47.2,0.5c3.2,0,6.2,0.8,8.8,2.3 c2.6,1.5,4.7,3.6,6.2,6.2c1.5,2.6,2.3,5.6,2.3,9c0,1.9-0.2,3.8-0.5,5.6h-16c0.1,2,0.5,3.8,1.2,5.3c0.7,1.5,1.7,2.8,2.9,3.8 c1.2,1,2.7,1.5,4.3,1.5c1.7,0,3.3-0.5,4.6-1.4c1.3-0.9,2.4-2.2,3.1-3.8l5.6,2.7c-1,2.4-2.4,4.5-4.3,6.1 c-1.9,1.7-4.2,2.8-6.9,3.5C51.1,37.9,49.2,38.2,47.2,38.2z M52.9,18.3c-0.1-1.3-0.4-2.5-0.8-3.6c-0.4-1.1-1-2-1.8-2.8 c-0.8-0.8-1.7-1.4-2.8-1.7c-1.1-0.3-2.2-0.5-3.4-0.5c-2.4,0-4.4,0.7-6.1,2.1c-1.7,1.4-2.8,3.4-3.4,5.9H52.9z M79.7,37.7 l-6.2-11.7h-4.4v11.7h-6.2V0.9h11.9c2.7,0,5,0.7,6.8,2.2c1.8,1.5,2.7,3.6,2.7,6.3c0,2.1-0.6,3.9-1.7,5.4c-1.1,1.5-2.8,2.5-4.9,3.1 l6.9,11.8L79.7,37.7z M72.9,16.5c1,0,1.9-0.2,2.6-0.7c0.7-0.5,1-1.2,1-2.2c0-0.9-0.3-1.7-1-2.2c-0.7-0.5-1.5-0.8-2.5-0.8 h-5.1v5.8H72.9z M95.7,37.7V0.9h6.2v36.7H95.7z M123.6,37.7l-8.9-13.5c-0.3,2.3-0.5,4.4-0.5,6.4v7.1h-6.2V0.9h6.2v12.3 c0,2.3,0.1,4.4,0.4,6.2l8.5-12.8h7.2l-10.7,15.6l11.4,16.6H123.6z M151.7,23.5l-3.3-3.8c1.3-1.1,2-2.7,2-4.7 c0-2.3-0.8-4.2-2.3-5.6c-1.5-1.4-3.5-2.1-6-2.1c-2.7,0-5,0.8-6.9,2.3c-1.9,1.5-3.2,3.6-3.8,6.2c-0.6,2.6-0.9,5.5-0.9,8.5 c0,3.2,0.3,6.1,0.8,8.8c0.6,2.7,1.6,5,3,6.8c1.4,1.8,3.3,3.2,5.6,4.1c2.3,0.9,4.9,1.4,7.8,1.4c2.4,0,4.7-0.4,6.8-1.1 c2.1-0.7,3.9-1.8,5.4-3.2l-3.2-4.1c-1.1,1-2.4,1.8-3.9,2.3s-3,0.8-4.7,0.8c-2.1,0-3.9-0.5-5.4-1.6c-1.5-1.1-2.6-2.6-3.3-4.6 c-0.7-2-1.1-4.3-1.1-6.9c0-2.5,0.4-4.8,1.1-6.9c0.7-2.1,1.8-3.7,3.3-4.9c1.5-1.2,3.3-1.8,5.4-1.8c1.4,0,2.8,0.3,4,0.8 c1.2,0.5,2.4,1.3,3.4,2.3L151.7,23.5z" />
    </svg>
  );
};

export default NartexLogo;
