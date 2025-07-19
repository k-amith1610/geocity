// API utility functions for frontend-backend communication
import axios from 'axios';

const API_BASE = '/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear invalid auth data
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
    }
    return Promise.reject(error);
  }
);

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
  options: any = {}
): Promise<ApiResponse<T>> {
  try {
    const { method = 'GET', data, ...config } = options;
    
    const response = await api.request({
      url: endpoint,
      method,
      data,
      ...config,
    });

    return response.data;
  } catch (error: any) {
    console.error(`API Error (${endpoint}):`, error);
    
    // Handle axios error response
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('API request failed');
    }
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
    data: {
      ...reportData,
      timestamp: new Date().toISOString()
    },
  });
}

export async function getReports(): Promise<ApiResponse> {
  return apiCall('/reports');
}

// Routes API
export async function calculateRoute(routeData: RouteData): Promise<ApiResponse> {
  return apiCall('/routes', {
    method: 'POST',
    data: routeData,
  });
}

export async function getRouteHistory(): Promise<ApiResponse> {
  return apiCall('/routes');
}
*/ 