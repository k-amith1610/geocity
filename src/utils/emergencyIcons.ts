// Enhanced Emergency Icons with proper animations and wave effects
export interface IconConfig {
  icon: string;
  color: string;
  animation: 'pulse' | 'blink' | 'wave' | 'none';
  blinkRate: number;
  size: number;
  waveColor?: string;
  isEmergency?: boolean;
  priority?: 'high' | 'medium' | 'low' | 'safe';
}

// Priority-based colors for non-emergency reports
const priorityColors = {
  high: '#EF4444',    // Red
  medium: '#F59E0B',  // Orange  
  low: '#EAB308',     // Yellow
  safe: '#10B981'     // Green
};

  // Emergency type configurations
  export const emergencyIconConfigs: Record<string, IconConfig> = {
    // Emergency types (when isEmergency = true)
  MEDICAL: {
    icon: 'ambulance',
    color: '#3B82F6',
      animation: 'blink' as const,
      blinkRate: 800,
    size: 32,
    waveColor: '#3B82F6',
    isEmergency: true
  },
  FIRE_HAZARD: {
    icon: 'flame',
    color: '#EF4444',
      animation: 'blink' as const,
      blinkRate: 600,
    size: 32,
    waveColor: '#EF4444',
    isEmergency: true
  },
  LAW_ENFORCEMENT: {
    icon: 'shield',
    color: '#8B5CF6',
      animation: 'blink' as const,
      blinkRate: 700,
    size: 32,
    waveColor: '#8B5CF6',
    isEmergency: true
  },
  ENVIRONMENTAL: {
    icon: 'alert-triangle',
    color: '#F59E0B',
      animation: 'blink' as const,
      blinkRate: 900,
    size: 32,
    waveColor: '#F59E0B',
    isEmergency: true
  },
    // Non-emergency types (when isEmergency = false) - based on priority
    HIGH_PRIORITY: {
      icon: 'alert-triangle',
      color: priorityColors.high,
      animation: 'blink' as const,
      blinkRate: 500,
      size: 28,
      waveColor: priorityColors.high,
      isEmergency: false,
      priority: 'high'
    },
    MEDIUM_PRIORITY: {
      icon: 'alert-triangle',
      color: priorityColors.medium,
      animation: 'blink' as const,
      blinkRate: 800,
      size: 28,
      waveColor: priorityColors.medium,
      isEmergency: false,
      priority: 'medium'
    },
    LOW_PRIORITY: {
      icon: 'alert-triangle',
      color: priorityColors.low,
      animation: 'pulse' as const,
      blinkRate: 1200,
      size: 26,
      waveColor: priorityColors.low,
      isEmergency: false,
      priority: 'low'
    },
  SAFE: {
      icon: 'alert-triangle',
      color: priorityColors.safe,
      animation: 'none' as const,
    blinkRate: 0,
    size: 24,
      waveColor: priorityColors.safe,
      isEmergency: false,
      priority: 'safe'
  }
};

// SVG paths for each icon type
const iconPaths = {
  ambulance: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  flame: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15h4v2h-4v-2zm0-8h4v6h-4V9z',
  shield: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z',
  'alert-triangle': 'M12 2L1 21h22L12 2zm-2 15h4v2h-4v-2zm0-8h4v6h-4V9z'
};

export function generateSVGIcon(config: IconConfig): string {
  const { icon, color, animation, blinkRate, size, waveColor, isEmergency } = config;
  const iconPath = iconPaths[icon as keyof typeof iconPaths] || iconPaths['alert-triangle'];
  
  // Calculate animation duration based on blink rate
  const animationDuration = blinkRate / 1000;
  
  // Generate CSS animations
  const blinkAnimation = `
    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0.3; }
    }
  `;
  
  const pulseAnimation = `
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
  `;
  
  const waveAnimation = `
    @keyframes wave {
      0% { transform: scale(1); opacity: 0.8; }
      50% { transform: scale(1.2); opacity: 0.4; }
      100% { transform: scale(1.5); opacity: 0; }
    }
  `;
  
  // Determine which animation to apply
  let animationStyle = '';
  switch (animation) {
    case 'blink':
      animationStyle = `animation: blink ${animationDuration}s infinite;`;
      break;
    case 'pulse':
      animationStyle = `animation: pulse ${animationDuration}s infinite;`;
      break;
    case 'wave':
      animationStyle = `animation: pulse ${animationDuration}s infinite;`;
      break;
    default:
      animationStyle = '';
  }
  
  // Create enhanced wave effect for emergency reports
  const waveElements = isEmergency ? `
    <!-- Primary wave -->
    <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" stroke="${waveColor}" stroke-width="2" fill="none" opacity="0.8">
      <animate attributeName="r" values="${size/2 - 2};${size/2 + 10};${size/2 - 2}" dur="${animationDuration}s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.8;0;0.8" dur="${animationDuration}s" repeatCount="indefinite"/>
    </circle>
    <!-- Secondary wave -->
    <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 4}" stroke="${waveColor}" stroke-width="1.5" fill="none" opacity="0.6">
      <animate attributeName="r" values="${size/2 - 4};${size/2 + 15};${size/2 - 4}" dur="${animationDuration * 1.3}s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.6;0;0.6" dur="${animationDuration * 1.3}s" repeatCount="indefinite"/>
    </circle>
    <!-- Tertiary wave -->
    <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 6}" stroke="${waveColor}" stroke-width="1" fill="none" opacity="0.4">
      <animate attributeName="r" values="${size/2 - 6};${size/2 + 20};${size/2 - 6}" dur="${animationDuration * 1.6}s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.4;0;0.4" dur="${animationDuration * 1.6}s" repeatCount="indefinite"/>
    </circle>
  ` : '';
  
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <style>
        ${blinkAnimation}
        ${pulseAnimation}
        ${waveAnimation}
        .icon-main { ${animationStyle} }
      </style>
      
      <!-- Wave effects for emergency reports -->
      ${waveElements}
      
      <!-- Main icon background -->
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 4}" fill="${color}" class="icon-main"/>
      
      <!-- Icon symbol -->
      <path d="${iconPath}" fill="white" transform="scale(0.6) translate(${size/3}, ${size/3})"/>
      
      <!-- Emergency indicator ring -->
      ${isEmergency ? `<circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" stroke="white" stroke-width="2" fill="none"/>` : ''}
    </svg>
  `)}`;
}

export function getEmergencyIconConfig(
  emergencyType?: string,
  category?: string,
  isEmergency?: boolean,
  priority?: string
): IconConfig {
  // If it's an emergency, use emergency type icons
  if (isEmergency && emergencyType && emergencyIconConfigs[emergencyType as keyof typeof emergencyIconConfigs]) {
    return emergencyIconConfigs[emergencyType as keyof typeof emergencyIconConfigs];
  }
  
  // If it's not an emergency, use priority-based triangle icons
  if (!isEmergency) {
    if (priority) {
      switch (priority.toLowerCase()) {
        case 'high':
          return emergencyIconConfigs.HIGH_PRIORITY;
        case 'medium':
          return emergencyIconConfigs.MEDIUM_PRIORITY;
        case 'low':
          return emergencyIconConfigs.LOW_PRIORITY;
        case 'safe':
          return emergencyIconConfigs.SAFE;
        default:
          return emergencyIconConfigs.MEDIUM_PRIORITY;
    }
    }
    
    // Fallback based on category
    if (category) {
      const categoryLower = category.toLowerCase();
      if (categoryLower.includes('danger') || categoryLower.includes('critical')) {
        return emergencyIconConfigs.HIGH_PRIORITY;
    }
    if (categoryLower.includes('warning') || categoryLower.includes('caution')) {
        return emergencyIconConfigs.MEDIUM_PRIORITY;
    }
      if (categoryLower.includes('info') || categoryLower.includes('notice')) {
        return emergencyIconConfigs.LOW_PRIORITY;
      }
    }
    
    // Default to medium priority
    return emergencyIconConfigs.MEDIUM_PRIORITY;
  }
  
  // Fallback for emergency without specific type
  return emergencyIconConfigs.FIRE_HAZARD;
}

export function createAnimatedIcon(config: IconConfig): google.maps.Icon {
  return {
    url: generateSVGIcon(config),
    scaledSize: new google.maps.Size(config.size, config.size),
    anchor: new google.maps.Point(config.size / 2, config.size), // Fixed anchor point to prevent dancing
    origin: new google.maps.Point(0, 0)
  };
}

// Function to create cluster icon for multiple reports at same location
export function createClusterIcon(count: number, isEmergency: boolean, priority?: string): google.maps.Icon {
  const size = isEmergency ? 40 : 36;
  let color = isEmergency ? '#EF4444' : '#3B82F6';
  
  // For non-emergency clusters, use priority color
  if (!isEmergency && priority) {
    switch (priority.toLowerCase()) {
      case 'high':
        color = priorityColors.high;
        break;
      case 'medium':
        color = priorityColors.medium;
        break;
      case 'low':
        color = priorityColors.low;
        break;
      case 'safe':
        color = priorityColors.safe;
        break;
    }
  }
  
  const textColor = 'white';
  
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <style>
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
          .cluster { animation: pulse 2s infinite; }
        </style>
        
        <!-- Enhanced wave effects for emergency clusters -->
        ${isEmergency ? `
          <!-- Primary wave -->
          <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" stroke="${color}" stroke-width="2" fill="none" opacity="0.8">
            <animate attributeName="r" values="${size/2 - 2};${size/2 + 12};${size/2 - 2}" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite"/>
          </circle>
          <!-- Secondary wave -->
          <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 4}" stroke="${color}" stroke-width="1.5" fill="none" opacity="0.6">
            <animate attributeName="r" values="${size/2 - 4};${size/2 + 18};${size/2 - 4}" dur="2.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.6;0;0.6" dur="2.5s" repeatCount="indefinite"/>
          </circle>
          <!-- Tertiary wave -->
          <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 6}" stroke="${color}" stroke-width="1" fill="none" opacity="0.4">
            <animate attributeName="r" values="${size/2 - 6};${size/2 + 25};${size/2 - 6}" dur="3s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite"/>
          </circle>
        ` : ''}
        
        <!-- Main cluster circle -->
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 4}" fill="${color}" class="cluster"/>
        
        <!-- Count text -->
        <text x="${size/2}" y="${size/2 + 4}" text-anchor="middle" fill="${textColor}" font-size="12" font-weight="bold" font-family="Arial, sans-serif">
          ${count > 99 ? '99+' : count}
        </text>
        
        <!-- Emergency indicator ring -->
        ${isEmergency ? `<circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" stroke="white" stroke-width="2" fill="none"/>` : ''}
      </svg>
    `)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size), // Fixed anchor point
    origin: new google.maps.Point(0, 0)
  };
} 