// API utility functions for frontend-backend communication

const API_BASE = '/api';

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data?: T;
}

export interface DeviceInfo {
  publicIP: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  timestamp: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

export interface ReportData {
  photo: string; // Base64 encoded
  photoDetails: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  };
  location: string;
  description: string;
  emergency: boolean;
  deviceInfo: DeviceInfo;
}

export interface RouteData {
  origin: string;
  destination: string;
  mode: 'driving' | 'walking' | 'bicycling';
}

// Generic API call function
async function apiCall<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// Health check API
export async function checkHealth(): Promise<ApiResponse> {
  return apiCall('/health');
}

/*
// Reports API
export async function submitReport(reportData: ReportData): Promise<ApiResponse> {
  return apiCall('/reports', {
    method: 'POST',
    body: JSON.stringify({
      ...reportData,
      timestamp: new Date().toISOString()
    }),
  });
}

export async function getReports(): Promise<ApiResponse> {
  return apiCall('/reports');
}

// Routes API
export async function calculateRoute(routeData: RouteData): Promise<ApiResponse> {
  return apiCall('/routes', {
    method: 'POST',
    body: JSON.stringify(routeData),
  });
}

export async function getRouteHistory(): Promise<ApiResponse> {
  return apiCall('/routes');
}
*/ 