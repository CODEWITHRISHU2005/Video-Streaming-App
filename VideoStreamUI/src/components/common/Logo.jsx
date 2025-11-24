import React from 'react';
import { Link } from 'react-router-dom';

function Logo({ to = '/', size = 56, text = true }) {
  const markSize = { width: size, height: size };
  const iconSize = size < 40 ? size : 40; // Smaller icon for collapsed state
  
  return (
    <Link to={to} className={`flex flex-col items-start ${text ? 'gap-3 mb-6' : ''}`}>
      {/* Modern StreamFlow Logo with gradient and streaming waves */}
      <svg 
        className="mark" 
        style={markSize} 
        viewBox="0 0 64 64" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        aria-label="StreamFlow"
      >
        <defs>
          {/* Primary gradient - Cyan to Purple */}
          <linearGradient id="sfGradPrimary" x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00BCD4" stopOpacity="1"/>
            <stop offset="30%" stopColor="#3B82F6" stopOpacity="1"/>
            <stop offset="70%" stopColor="#7C4DFF" stopOpacity="1"/>
            <stop offset="100%" stopColor="#A855F7" stopOpacity="1"/>
          </linearGradient>
          
          {/* Secondary gradient - Lighter for highlights */}
          <linearGradient id="sfGradSecondary" x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="1"/>
            <stop offset="50%" stopColor="#60A5FA" stopOpacity="1"/>
            <stop offset="100%" stopColor="#C084FC" stopOpacity="1"/>
          </linearGradient>
          
          {/* Glow filter */}
          <filter id="sfGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Shadow filter */}
          <filter id="sfShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Background circle with gradient */}
        <circle 
          cx="32" 
          cy="32" 
          r="28" 
          fill="url(#sfGradPrimary)" 
          opacity="0.15"
        />
        
        {/* Main "SF" monogram - Modern geometric design */}
        <g filter="url(#sfShadow)">
          {/* Letter S - Stream (sleeker design) */}
          <path 
            d="M20 18 C20 15, 22 13, 25 13 C27 13, 29 14, 30 15 C31 16, 31 17, 30 18 C29 19, 27 19, 25 19 C23 19, 21 20, 21 22 C21 24, 23 25, 25 25 C27 25, 29 26, 30 27 C31 28, 31 29, 30 30 C29 31, 27 31, 25 31 C22 31, 20 29, 20 26" 
            stroke="url(#sfGradPrimary)" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            fill="none"
          />
          
          {/* Letter F - Flow */}
          <path 
            d="M38 13 L38 31 M38 13 L47 13 M38 22 L46 22" 
            stroke="url(#sfGradPrimary)" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          
          {/* Play button icon - Representing video streaming */}
          <circle 
            cx="32" 
            cy="42" 
            r="6" 
            stroke="url(#sfGradSecondary)" 
            strokeWidth="2" 
            fill="none"
            opacity="0.7"
          />
          <path 
            d="M29 42 L33 44 L33 40 Z" 
            fill="url(#sfGradSecondary)" 
            opacity="0.8"
          />
          
          {/* Streaming waves - Representing continuous flow */}
          <path 
            d="M16 50 Q20 48, 24 50 T32 50 T40 50 T48 50" 
            stroke="url(#sfGradSecondary)" 
            strokeWidth="2" 
            strokeLinecap="round" 
            fill="none"
            opacity="0.7"
          />
        </g>
        
        {/* Accent glow dots */}
        <circle cx="50" cy="18" r="2.5" fill="url(#sfGradSecondary)" opacity="0.6">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="14" cy="50" r="2" fill="url(#sfGradSecondary)" opacity="0.5">
          <animate attributeName="opacity" values="0.5;0.9;0.5" dur="2.5s" repeatCount="indefinite"/>
        </circle>
      </svg>
      
      {text && (
        <div className="flex flex-col items-start gap-0.5">
          <span 
            className="text-2xl font-bold leading-tight tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #00BCD4 0%, #3B82F6 50%, #7C4DFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            StreamFlow
          </span>
          <span className="text-lg font-normal text-white/90 leading-tight">Play</span>
        </div>
      )}
    </Link>
  );
}

export default Logo;

