export interface IconConfig {
  icon: string;
  color: string;
  animation: 'pulse' | 'blink' | 'none';
  blinkRate: number;
  size: number;
}

export const emergencyIconConfigs = {
  MEDICAL: {
    icon: 'ambulance',
    color: '#3B82F6',
    animation: 'pulse',
    blinkRate: 1000,
    size: 32
  },
  FIRE_HAZARD: {
    icon: 'flame',
    color: '#EF4444',
    animation: 'blink',
    blinkRate: 500,
    size: 32
  },
  LAW_ENFORCEMENT: {
    icon: 'shield',
    color: '#8B5CF6',
    animation: 'pulse',
    blinkRate: 800,
    size: 32
  },
  ENVIRONMENTAL: {
    icon: 'alert-triangle',
    color: '#F59E0B',
    animation: 'blink',
    blinkRate: 1200,
    size: 32
  },
  SAFE: {
    icon: 'check-circle',
    color: '#10B981',
    animation: 'none',
    blinkRate: 0,
    size: 24
  },
  WARNING: {
    icon: 'alert-triangle',
    color: '#F59E0B',
    animation: 'pulse',
    blinkRate: 1000,
    size: 28
  },
  DANGER: {
    icon: 'alert-circle',
    color: '#EF4444',
    animation: 'blink',
    blinkRate: 600,
    size: 32
  }
};

export function getEmergencyIconConfig(
  emergencyType?: 'MEDICAL' | 'LAW_ENFORCEMENT' | 'FIRE_HAZARD' | 'ENVIRONMENTAL',
  category?: 'SAFE' | 'WARNING' | 'DANGER'
): IconConfig {
  // If it's an emergency, use emergency type config
  if (emergencyType && emergencyType in emergencyIconConfigs) {
    return emergencyIconConfigs[emergencyType];
  }
  
  // Otherwise, use category-based config
  if (category && category in emergencyIconConfigs) {
    return emergencyIconConfigs[category];
  }
  
  // Default to warning
  return emergencyIconConfigs.WARNING;
}

export function generateSVGIcon(config: IconConfig): string {
  const { icon, color, animation, size } = config;
  
  let svgContent = '';
  
  switch (icon) {
    case 'ambulance':
      svgContent = `
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="8" width="16" height="12" rx="2" fill="${color}" stroke="white" stroke-width="1"/>
          <rect x="4" y="10" width="4" height="2" fill="white"/>
          <rect x="10" y="10" width="4" height="2" fill="white"/>
          <rect x="4" y="14" width="4" height="2" fill="white"/>
          <rect x="10" y="14" width="4" height="2" fill="white"/>
          <circle cx="6" cy="18" r="2" fill="white"/>
          <circle cx="16" cy="18" r="2" fill="white"/>
          <path d="M18 12h2v2h-2z" fill="white"/>
        </svg>
      `;
      break;
      
    case 'flame':
      svgContent = `
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8 6 4 10 4 14c0 4 3 6 8 6s8-2 8-6c0-4-4-8-8-12z" fill="${color}" stroke="white" stroke-width="1"/>
          <path d="M12 6c-2 2-4 4-4 6 0 2 1 3 4 3s4-1 4-3c0-2-2-4-4-6z" fill="white" opacity="0.3"/>
        </svg>
      `;
      break;
      
    case 'shield':
      svgContent = `
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L3 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-9-4z" fill="${color}" stroke="white" stroke-width="1"/>
          <path d="M12 8l-2 2v4l2 2 2-2v-4l-2-2z" fill="white"/>
        </svg>
      `;
      break;
      
    case 'alert-triangle':
      svgContent = `
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 20h20L12 2z" fill="${color}" stroke="white" stroke-width="1"/>
          <path d="M12 8v6" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <circle cx="12" cy="18" r="1" fill="white"/>
        </svg>
      `;
      break;
      
    case 'check-circle':
      svgContent = `
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="1"/>
          <path d="M9 12l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      break;
      
    case 'alert-circle':
      svgContent = `
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="1"/>
          <path d="M12 8v6" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <circle cx="12" cy="18" r="1" fill="white"/>
        </svg>
      `;
      break;
      
    default:
      svgContent = `
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="1"/>
          <path d="M12 8v6" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <circle cx="12" cy="18" r="1" fill="white"/>
        </svg>
      `;
  }
  
  // Add animation if specified
  if (animation === 'pulse') {
    svgContent = svgContent.replace('</svg>', `
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        svg { animation: pulse 2s infinite; }
      </style>
    </svg>`);
  } else if (animation === 'blink') {
    svgContent = svgContent.replace('</svg>', `
      <style>
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
        svg { animation: blink ${config.blinkRate}ms infinite; }
      </style>
    </svg>`);
  }
  
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgContent)}`;
}

export function createAnimatedIcon(config: IconConfig): google.maps.Icon {
  return {
    url: generateSVGIcon(config),
    scaledSize: new google.maps.Size(config.size, config.size),
    anchor: new google.maps.Point(config.size / 2, config.size / 2)
  };
} 