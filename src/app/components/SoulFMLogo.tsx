import React from 'react';

interface SoulFMLogoProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

/**
 * Inline SVG logo component — renders directly in the DOM,
 * so it can access the page's loaded Righteous font.
 * No external file dependency, works everywhere.
 */
export function SoulFMLogo({ className = '', size, style }: SoulFMLogoProps) {
  const sizeProps = size ? { width: size, height: size } : {};

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="none"
      className={className}
      style={style}
      {...sizeProps}
    >
      <defs>
        <linearGradient id="sf-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00d9ff" />
          <stop offset="100%" stopColor="#00ffaa" />
        </linearGradient>
        <linearGradient id="sf-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0a1628" />
          <stop offset="100%" stopColor="#0d2435" />
        </linearGradient>
        <filter id="sf-neon">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background circle */}
      <circle cx="256" cy="256" r="248" fill="url(#sf-bg)" stroke="url(#sf-glow)" strokeWidth="4" />

      {/* Inner ring */}
      <circle cx="256" cy="256" r="220" fill="none" stroke="url(#sf-glow)" strokeWidth="1.5" opacity="0.3" />

      {/* Sound waves left */}
      <g filter="url(#sf-neon)" opacity="0.8">
        <path d="M130 200 Q110 256 130 312" stroke="#00d9ff" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M110 180 Q82 256 110 332" stroke="#00d9ff" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6" />
        <path d="M92 162 Q58 256 92 350" stroke="#00d9ff" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.3" />
      </g>

      {/* Sound waves right */}
      <g filter="url(#sf-neon)" opacity="0.8">
        <path d="M382 200 Q402 256 382 312" stroke="#00ffaa" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M402 180 Q430 256 402 332" stroke="#00ffaa" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6" />
        <path d="M420 162 Q454 256 420 350" stroke="#00ffaa" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.3" />
      </g>

      {/* Headphones arc */}
      <path
        d="M170 260 Q170 160 256 140 Q342 160 342 260"
        stroke="url(#sf-glow)"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        filter="url(#sf-neon)"
      />

      {/* Left ear cup */}
      <rect x="152" y="248" width="36" height="56" rx="10" fill="url(#sf-glow)" opacity="0.9" />

      {/* Right ear cup */}
      <rect x="324" y="248" width="36" height="56" rx="10" fill="url(#sf-glow)" opacity="0.9" />

      {/* SOUL text */}
      <text
        x="256"
        y="310"
        textAnchor="middle"
        fontFamily="'Righteous', 'Arial Black', sans-serif"
        fontSize="62"
        fontWeight="700"
        fill="white"
        letterSpacing="6"
      >
        SOUL
      </text>

      {/* FM text */}
      <text
        x="256"
        y="362"
        textAnchor="middle"
        fontFamily="'Righteous', 'Arial Black', sans-serif"
        fontSize="36"
        fill="url(#sf-glow)"
        letterSpacing="12"
      >
        FM
      </text>

      {/* Frequency dot */}
      <circle cx="256" cy="386" r="4" fill="#00ffaa" opacity="0.8" />
    </svg>
  );
}
