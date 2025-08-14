import React from 'react';

interface LogoIconProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  variant?: 'default' | 'light' | 'dark';
}

export default function LogoIcon({ size = 'md', className = '', variant = 'default' }: LogoIconProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12'
  };

  const gradients = {
    default: {
      start: '#111827',
      end: '#1e40af'
    },
    light: {
      start: '#3b82f6',
      end: '#1d4ed8'
    },
    dark: {
      start: '#1e293b',
      end: '#0f172a'
    }
  };

  const currentGradient = gradients[variant];

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <svg 
        viewBox="0 0 64 64" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id={`logoGradient-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: currentGradient.start, stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: currentGradient.end, stopOpacity: 1 }} />
          </linearGradient>
          <filter id={`shadow-${variant}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.3"/>
          </filter>
        </defs>
        
        {/* Background with gradient */}
        <rect width="64" height="64" rx="8" ry="8" fill={`url(#logoGradient-${variant})`} filter={`url(#shadow-${variant})`}/>
        
        {/* Scissors icon */}
        <g transform="translate(32, 32)" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Left blade */}
          <circle cx="-6" cy="-6" r="3"/>
          <path d="M-3 -3 L8 8"/>
          <path d="M-9 -3 L-3 -3"/>
          
          {/* Right blade */}  
          <circle cx="-6" cy="6" r="3"/>
          <path d="M-3 3 L8 -8"/>
          <path d="M-9 3 L-3 3"/>
          
          {/* Pivot point */}
          <circle cx="8" cy="0" r="1" fill="white"/>
        </g>
      </svg>
    </div>
  );
}
