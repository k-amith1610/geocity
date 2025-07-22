// API utility functions for GEOCITY

export interface ApiResponse {
  status: string;
  message: string;
  data?: any;
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
  location: string;
  description: string;
  emergency: boolean;
  deviceInfo: DeviceInfo;
}

export interface RouteData {
  origin: string;
  destination: string;
  mode: string;
}

// Enhanced Weather API Response
export interface EnhancedWeatherResponse {
  success: boolean;
  location: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    zipCode?: string;
  };
  dataSources: string[];
  dataAvailability: {
    firebase: boolean;
    tomorrow: boolean;
    total: number;
  };
  weather: {
    temperature: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
    windDirection: number;
    description: string;
    icon: string;
    visibility: number;
    clouds: number;
    rain?: number;
    snow?: number;
    airQuality: number;
  };
  sensorData?: {
    air_quality: number;
    humidity: number;
    temperature: number;
    rain_level: number;
    zip_code: string;
    location: {
      latitude: number;
      longitude: number;
      address: string;
    };
    timestamp: string;
  };
  analysis: {
    summary: string;
    forecast: string;
    recommendations: string[];
    healthAdvisory: string;
    environmentalRisk: 'low' | 'medium' | 'high';
    airQualityCategory: string;
    temperatureTrend: string;
    precipitationOutlook: string;
    icon: string;
    dataQuality: string;
    insights: string;
  };
  timestamp: string;
  aiGenerated: boolean;
  models: {
    geocoding: string;
    weatherData?: string;
    sensorData?: string;
    analysis: string;
  };
  framework: string;
}

// Social Media Scrape Request
export interface SocialMediaRequest {
  routes: string[];
  keywords: string[];
  maxPosts: number;
}

// Social Media Scrape Response
export interface SocialMediaResponse {
  status: string;
  message: string;
  data: {
    posts: Array<{
      id: string;
      text: string;
      timestamp: string;
      link: string;
      user: string;
      location: string;
      source: string;
      hashtags: string[];
      media: any[];
      description: string;
      engagement: {
        likes: number;
        shares: number;
        comments: number;
      };
    }>;
    totalPosts: number;
    routes: string[];
    keywords: string[];
    maxAgeHours: number;
    maxPosts: number;
    scrapedAt: string;
    sources: string[];
    note: string;
  };
}

// AI Keywords Generation Request/Response
export interface AIKeywordsRequest {
  origin: string;
  destination: string;
}

export interface AIKeywordsResponse {
  routes: string[];
  keywords: string[];
  maxPosts: number;
}

// AI Chat Request/Response
export interface AIChatRequest {
  message: string;
  context: {
    type: 'weather' | 'social';
    data: any;
  };
}

export interface AIChatResponse {
  response: string;
  timestamp: string;
}

// Generic API call function
async function apiCall(endpoint: string, options: RequestInit = {}): Promise<ApiResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const url = `${baseUrl}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Health check
export async function checkHealth(): Promise<ApiResponse> {
  return apiCall('/api/health');
}

// Submit report
export async function submitReport(reportData: ReportData): Promise<ApiResponse> {
  return apiCall('/api/reports', {
    method: 'POST',
    body: JSON.stringify({
      ...reportData,
      timestamp: new Date().toISOString()
    }),
  });
}

// Get route information
export async function getRouteInfo(routeData: RouteData): Promise<ApiResponse> {
  return apiCall('/api/routes', {
    method: 'POST',
    body: JSON.stringify(routeData),
  });
}

// Enhanced Weather API
export async function getEnhancedWeather(address: string): Promise<EnhancedWeatherResponse> {
  const url = '/api/enhanced-weather';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Enhanced weather API call failed:', error);
    throw error;
  }
}

// Social Media Scraping API
export async function getSocialMediaData(requestBody: SocialMediaRequest): Promise<SocialMediaResponse> {
  const scrapeUrl = process.env.NEXT_PUBLIC_SCRAPE_URL;
  if (!scrapeUrl) {
    throw new Error('SCRAPE_URL not configured');
  }
  
  const url = `${scrapeUrl}/scrape`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Social media scraping API call failed:', error);
    throw error;
  }
}

// AI Keywords Generation (using Gemini)
export async function generateAIKeywords(origin: string, destination: string): Promise<AIKeywordsResponse> {
  const url = '/api/ai-keywords';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ origin, destination }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    // Return the data field from the response
    return data.data;
  } catch (error) {
    console.error('AI keywords generation failed:', error);
    
    // Enhanced fallback with better route extraction
    const extractCityNames = (address: string): string[] => {
      const cityNames = [];
      
      // Extract common city patterns
      if (address.includes('Hyderabad')) cityNames.push('Hyderabad');
      if (address.includes('HITEC City') || address.includes('Hitec City')) cityNames.push('HITEC City');
      if (address.includes('Madhapur')) cityNames.push('Madhapur');
      if (address.includes('Gachibowli')) cityNames.push('Gachibowli');
      if (address.includes('Kondapur')) cityNames.push('Kondapur');
      if (address.includes('Jubilee Hills')) cityNames.push('Jubilee Hills');
      if (address.includes('Banjara Hills')) cityNames.push('Banjara Hills');
      if (address.includes('Secunderabad')) cityNames.push('Secunderabad');
      if (address.includes('Bandlaguda Jagir')) cityNames.push('Bandlaguda Jagir');
      if (address.includes('Kismatpur')) cityNames.push('Kismatpur');
      if (address.includes('Abhyudaya Nagar')) cityNames.push('Abhyudaya Nagar');
      
      // Bengaluru patterns
      if (address.includes('Bengaluru') || address.includes('Bangalore')) cityNames.push('Bengaluru');
      if (address.includes('Madavara')) cityNames.push('Madavara');
      if (address.includes('Majestic')) cityNames.push('Majestic');
      if (address.includes('Koramangala')) cityNames.push('Koramangala');
      if (address.includes('Indiranagar')) cityNames.push('Indiranagar');
      if (address.includes('Whitefield')) cityNames.push('Whitefield');
      if (address.includes('Electronic City')) cityNames.push('Electronic City');
      if (address.includes('Marathahalli')) cityNames.push('Marathahalli');
      if (address.includes('HSR Layout')) cityNames.push('HSR Layout');
      if (address.includes('JP Nagar')) cityNames.push('JP Nagar');
      if (address.includes('BTM Layout')) cityNames.push('BTM Layout');
      
      // If no specific cities found, extract first part before comma
      if (cityNames.length === 0) {
        const firstPart = address.split(',')[0].trim();
        if (firstPart && firstPart.length > 2) {
          cityNames.push(firstPart);
        }
      }
      
      return cityNames;
    };
    
    // Extract city names from both addresses
    const originCities = extractCityNames(origin);
    const destCities = extractCityNames(destination);
    
    // Combine and deduplicate
    const allCities = [...new Set([...originCities, ...destCities])];
    
    // Generate comprehensive traffic-related keywords
    const trafficKeywords = [
      'traffic', 'road', 'accident', 'construction', 'blockage', 'congestion',
      'jam', 'delay', 'route', 'transport', 'commute', 'travel', 'roadblock',
      'diversion', 'maintenance', 'repair', 'flood', 'waterlogging', 'pothole',
      'speed', 'safety', 'emergency', 'police', 'ambulance', 'fire', 'rescue',
      'metro', 'bus', 'auto', 'cab', 'uber', 'ola', 'public transport',
      'pedestrian', 'cyclist', 'motorcycle', 'car', 'truck', 'vehicle'
    ];
    
    return {
      routes: allCities.length > 0 ? allCities : ['General'],
      keywords: trafficKeywords,
      maxPosts: 10
    };
  }
}

// AI Chat API
export async function sendAIChat(request: AIChatRequest): Promise<AIChatResponse> {
  const url = '/api/ai-chat';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('AI chat API call failed:', error);
    throw error;
  }
} 