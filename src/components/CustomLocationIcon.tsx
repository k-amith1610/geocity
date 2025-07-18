import React from 'react';

interface CustomLocationIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const CustomLocationIcon: React.FC<CustomLocationIconProps> = ({ 
  size = 24, 
  color = 'currentColor', 
  strokeWidth = 2,
  ...props 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Outer circle */}
      <circle cx="12" cy="12" r="10" />
      
      {/* Inner circle (solid center) */}
      <circle cx="12" cy="12" r="3" fill={color} />
      
      {/* Crosshair lines - horizontal */}
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      
      {/* Crosshair lines - vertical */}
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      
      {/* Four directional lines at 12, 3, 6, 9 o'clock */}
      <line x1="12" y1="2" x2="12" y2="4" strokeWidth={strokeWidth * 1.5} />
      <line x1="22" y1="12" x2="20" y2="12" strokeWidth={strokeWidth * 1.5} />
      <line x1="12" y1="22" x2="12" y2="20" strokeWidth={strokeWidth * 1.5} />
      <line x1="2" y1="12" x2="4" y2="12" strokeWidth={strokeWidth * 1.5} />
    </svg>
  );
};

export default CustomLocationIcon; 