// Device information utility for fraud prevention

export interface DeviceInfo {
  publicIP: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  timestamp: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

// Get public IP address using CORS-friendly services
export async function getPublicIP(): Promise<string> {
  try {
    // Primary service: ipapi.co (CORS-friendly)
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.ip || 'unknown';
    }
  } catch (error) {
    console.warn('Primary IP service failed:', error);
  }

  try {
    // Fallback service: ipify.org with no-cors mode
    const response = await fetch('https://api.ipify.org?format=json', {
      method: 'GET',
      mode: 'no-cors', // This prevents CORS errors but may not work in all cases
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.ip || 'unknown';
    }
  } catch (error) {
    console.warn('Fallback IP service failed:', error);
  }

  try {
    // Third fallback: httpbin.org (CORS-friendly)
    const response = await fetch('https://httpbin.org/ip', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.origin || 'unknown';
    }
  } catch (error) {
    console.warn('Third IP service failed:', error);
  }

  // Final fallback: return unknown
  console.warn('All IP services failed, using fallback');
  return 'unknown';
}

// Detect device type based on user agent
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/mobile|android|iphone|ipad|phone|blackberry|opera mini|iemobile/i.test(userAgent)) {
    if (/tablet|ipad/i.test(userAgent)) {
      return 'tablet';
    }
    return 'mobile';
  }
  
  return 'desktop';
}

// Get screen resolution
export function getScreenResolution(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  return `${window.screen.width}x${window.screen.height}`;
}

// Get timezone
export function getTimezone(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    return 'unknown';
  }
}

// Get language
export function getLanguage(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  return navigator.language || 'unknown';
}

// Get user agent
export function getUserAgent(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  return navigator.userAgent;
}

// Get complete device information with better error handling
export async function getDeviceInfo(): Promise<DeviceInfo> {
  let publicIP = 'unknown';
  
  try {
    publicIP = await getPublicIP();
  } catch (error) {
    console.warn('Failed to get public IP:', error);
    publicIP = 'unknown';
  }
  
  return {
    publicIP,
    userAgent: getUserAgent(),
    screenResolution: getScreenResolution(),
    timezone: getTimezone(),
    language: getLanguage(),
    timestamp: new Date().toISOString(),
    deviceType: getDeviceType(),
  };
}

// Get device fingerprint for additional fraud detection
export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return 'unknown';
  
  // Create a unique fingerprint based on canvas rendering
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('Device fingerprint', 2, 2);
  
  return canvas.toDataURL();
} 