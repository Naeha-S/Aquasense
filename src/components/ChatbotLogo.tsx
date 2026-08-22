import React from 'react';

interface ChatbotLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
}

export function ChatbotLogo({ size = 'md', animated = true, className = '' }: ChatbotLogoProps) {
  const dimensions = {
    sm: { w: 22, h: 22, p: 'p-0.5' },
    md: { w: 32, h: 32, p: 'p-1' },
    lg: { w: 44, h: 44, p: 'p-1.5' },
    xl: { w: 60, h: 60, p: 'p-2' }
  }[size];

  return (
    <div 
      className={`relative inline-flex items-center justify-center rounded-xs bg-[#052626] border border-[#24B1B1]/60 shadow-md ${dimensions.p} ${className}`}
      style={{ width: dimensions.w, height: dimensions.h }}
      title="AquaSense Planetary Hydrology AI Copilot"
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          {/* Radial Gradient for Planetary Hydro Droplet */}
          <radialGradient id="hydroGlow" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#38C7C7" />
            <stop offset="60%" stopColor="#007979" />
            <stop offset="100%" stopColor="#052626" />
          </radialGradient>

          {/* Linear Gradient for Satellite Orbital Ring */}
          <linearGradient id="orbitalRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE0C5" />
            <stop offset="50%" stopColor="#24B1B1" />
            <stop offset="100%" stopColor="#007979" />
          </linearGradient>

          {/* Core AI Spark Gradient */}
          <linearGradient id="aiSpark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF0E4" />
            <stop offset="50%" stopColor="#FFE0C5" />
            <stop offset="100%" stopColor="#24B1B1" />
          </linearGradient>
        </defs>

        {/* 1. Outer Cartographic Targeting Hex Grid / Orbit */}
        <circle
          cx="50"
          cy="50"
          r="44"
          stroke="#007979"
          strokeWidth="2"
          strokeDasharray="4 3"
          strokeOpacity="0.6"
        />

        {/* 2. Elliptical Satellite Orbital Ring */}
        <ellipse
          cx="50"
          cy="50"
          rx="40"
          ry="20"
          transform="rotate(-28 50 50)"
          stroke="url(#orbitalRing)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* 3. Orbiting Satellite Node */}
        <circle
          cx="78"
          cy="32"
          r="4"
          fill="#FFE0C5"
          stroke="#052626"
          strokeWidth="1.5"
        />

        {/* 4. Planetary Water Droplet & Bathymetric Contour */}
        <path
          d="M50 16 C50 16 26 44 26 62 C26 75.25 36.75 86 50 86 C63.25 86 74 75.25 74 62 C74 44 50 16 50 16 Z"
          fill="url(#hydroGlow)"
          stroke="#24B1B1"
          strokeWidth="2.5"
        />

        {/* 5. Inner Water Ripple Wave Contours */}
        <path
          d="M34 62 Q50 54 66 62"
          stroke="#38C7C7"
          strokeWidth="2"
          strokeLinecap="round"
          strokeOpacity="0.8"
        />
        <path
          d="M38 70 Q50 64 62 70"
          stroke="#24B1B1"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeOpacity="0.6"
        />

        {/* 6. Central AI Neural Spark / Octahedral Core */}
        <polygon
          points="50,38 56,48 50,58 44,48"
          fill="url(#aiSpark)"
          stroke="#FFF0E4"
          strokeWidth="1"
        />
        <circle cx="50" cy="48" r="2" fill="#052626" />

        {/* 7. Micro-sensor Nodes */}
        <circle cx="50" cy="22" r="1.5" fill="#FFE0C5" />
        <circle cx="32" cy="50" r="1.5" fill="#24B1B1" />
        <circle cx="68" cy="50" r="1.5" fill="#24B1B1" />
      </svg>

      {/* Pulsing Beacon Light */}
      {animated && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#24B1B1] border border-[#052626] animate-pulse shadow-xs" />
      )}
    </div>
  );
}
