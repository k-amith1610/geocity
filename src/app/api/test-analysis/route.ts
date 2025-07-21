import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';

// Initialize Vertex AI
const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT || 'newstimes-460112',
  location: 'us-central1',
});

// Initialize Gemini model
const geminiModel = vertexAI.preview.getGenerativeModel({
  model: 'gemini-1.5-flash',
});

interface SensorData {
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
}

interface AnalysisResponse {
  summary: string;
  icon: string;
  forecast: string;
  recommendations: string[];
  dataQuality: 'good' | 'moderate' | 'poor';
  weatherInsights: string;
  healthAdvisory: string;
}

// Hardcoded sensor data array with zip codes
const SENSOR_DATA: SensorData[] = [
  {
    air_quality: 1085,
    humidity: 62.3,
    temperature: 29.5,
    rain_level: 790,
    zip_code: "500081",
    location: {
      latitude: 17.3850,
      longitude: 78.4867,
      address: "HITEC City, Hyderabad, Telangana 500081"
    },
    timestamp: "2024-01-15T10:30:00.000Z"
  },
  {
    air_quality: 245,
    humidity: 45.2,
    temperature: 32.1,
    rain_level: 120,
    zip_code: "500082",
    location: {
      latitude: 17.4065,
      longitude: 78.4772,
      address: "Banjara Hills, Hyderabad, Telangana 500082"
    },
    timestamp: "2024-01-15T10:30:00.000Z"
  },
  {
    air_quality: 156,
    humidity: 58.7,
    temperature: 28.9,
    rain_level: 450,
    zip_code: "500083",
    location: {
      latitude: 17.4239,
      longitude: 78.4738,
      address: "Jubilee Hills, Hyderabad, Telangana 500083"
    },
    timestamp: "2024-01-15T10:30:00.000Z"
  },
  {
    air_quality: 892,
    humidity: 71.4,
    temperature: 26.3,
    rain_level: 1200,
    zip_code: "500084",
    location: {
      latitude: 17.3850,
      longitude: 78.4867,
      address: "Madhapur, Hyderabad, Telangana 500084"
    },
    timestamp: "2024-01-15T10:30:00.000Z"
  },
  {
    air_quality: 334,
    humidity: 52.8,
    temperature: 31.7,
    rain_level: 85,
    zip_code: "500085",
    location: {
      latitude: 17.4065,
      longitude: 78.4772,
      address: "Gachibowli, Hyderabad, Telangana 500085"
    },
    timestamp: "2024-01-15T10:30:00.000Z"
  }
];

// Function to extract zip code from address using Vertex AI
async function extractZipCode(address: string): Promise<string> {
  try {
    const prompt = `
    Extract the zip code from this address. If no zip code is found, convert the location to the nearest zip code.
    Address: ${address}
    
    Return only the zip code as a 5-6 digit number. If you can't determine a zip code, return "500081" as default.
    Be precise and accurate.
    `;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const zipCode = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '500081';
    
    // Validate zip code format
    const zipCodeMatch = zipCode.match(/\d{5,6}/);
    return zipCodeMatch ? zipCodeMatch[0] : '500081';
  } catch (error) {
    console.error('Error extracting zip code:', error);
    return '500081';
  }
}

// Function to find sensor data by zip code
function findSensorDataByZipCode(zipCode: string): SensorData | null {
  return SENSOR_DATA.find(data => data.zip_code === zipCode) || null;
}

// Function to get appropriate Lucide icon based on environmental conditions
async function getLucideIcon(sensorData: SensorData): Promise<string> {
  try {
    const prompt = `
    Based on the following environmental sensor data, choose the most appropriate Lucide icon name.
    
    Sensor Data:
    - Air Quality Index: ${sensorData.air_quality}
    - Humidity: ${sensorData.humidity}%
    - Temperature: ${sensorData.temperature}°C
    - Rain Level: ${sensorData.rain_level}mm
    
    Choose from these Lucide icon categories:
    - Weather: Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind, Thermometer, Droplets
    - Air Quality: Activity, AlertTriangle, Shield, Eye, Gauge
    - Environmental: Leaf, Tree, Mountain, Waves, Flame
    - General: Activity, TrendingUp, TrendingDown, AlertCircle
    
    Consider:
    1. Air quality severity (good: 0-50, moderate: 51-100, poor: 101-150, very poor: 151+)
    2. Temperature extremes (hot: >30°C, cold: <15°C)
    3. Precipitation levels (high: >500mm, moderate: 100-500mm, low: <100mm)
    4. Humidity levels (high: >70%, moderate: 40-70%, low: <40%)
    
    Return only the icon name, nothing else.
    `;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const icon = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Activity';
    
    // Validate it's a reasonable icon name
    const validIcons = [
      'Sun', 'Cloud', 'CloudRain', 'CloudSnow', 'CloudLightning', 'Wind', 'Thermometer', 'Droplets',
      'Activity', 'AlertTriangle', 'Shield', 'Eye', 'Gauge', 'Leaf', 'Tree', 'Mountain', 'Waves', 'Flame',
      'TrendingUp', 'TrendingDown', 'AlertCircle'
    ];
    
    return validIcons.includes(icon) ? icon : 'Activity';
  } catch (error) {
    console.error('Error getting Lucide icon:', error);
    return 'Activity';
  }
}

// Function to analyze sensor data using Vertex AI and Gemini
async function analyzeSensorData(sensorData: SensorData, address: string): Promise<AnalysisResponse> {
  try {
    const prompt = `
    Analyze this environmental sensor data for a smart city location and provide a comprehensive, professional analysis.
    
    Location: ${address}
    Zip Code: ${sensorData.zip_code}
    
    Sensor Data:
    - Air Quality Index: ${sensorData.air_quality}
    - Humidity: ${sensorData.humidity}%
    - Temperature: ${sensorData.temperature}°C
    - Rain Level: ${sensorData.rain_level}mm
    - Timestamp: ${sensorData.timestamp}
    
    Provide a comprehensive analysis that includes:
    1. Current environmental conditions and their health implications
    2. Air quality assessment and health risks
    3. Weather patterns and environmental trends
    4. Environmental concerns and alerts
    5. Data quality assessment
    
    Also provide:
    - 3-4 actionable recommendations for city management
    - Health advisory for residents
    - Weather insights for planning
    
    Format your response as JSON:
    {
      "summary": "Comprehensive analysis paragraph",
      "forecast": "Detailed environmental and weather forecast",
      "recommendations": ["recommendation1", "recommendation2", "recommendation3", "recommendation4"],
      "dataQuality": "good|moderate|poor",
      "weatherInsights": "Weather-specific insights",
      "healthAdvisory": "Health recommendations for residents"
    }
    
    Be thorough, professional, and actionable. Use real data analysis, not generic responses.
    `;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Parse the JSON response
    try {
      const analysis = JSON.parse(analysisText);
      return {
        summary: analysis.summary || 'Environmental data analysis completed.',
        icon: 'Activity', // Will be set separately
        forecast: analysis.forecast || 'Environmental conditions analyzed.',
        recommendations: analysis.recommendations || ['Continue monitoring environmental parameters'],
        dataQuality: analysis.dataQuality || 'moderate',
        weatherInsights: analysis.weatherInsights || 'Environmental patterns analyzed.',
        healthAdvisory: analysis.healthAdvisory || 'Standard health monitoring recommended.'
      };
    } catch (parseError) {
      // If JSON parsing fails, use the raw text
      return {
        summary: analysisText || 'Environmental data analysis completed.',
        icon: 'Activity',
        forecast: 'Environmental conditions analyzed.',
        recommendations: ['Continue monitoring environmental parameters'],
        dataQuality: 'moderate',
        weatherInsights: 'Environmental patterns analyzed.',
        healthAdvisory: 'Standard health monitoring recommended.'
      };
    }
  } catch (error) {
    console.error('Error analyzing sensor data:', error);
    throw new Error('Failed to analyze environmental data');
  }
}

// Function to get weather forecast using Vertex AI
async function getWeatherForecast(sensorData: SensorData, address: string): Promise<string> {
  try {
    const prompt = `
    Based on the current environmental sensor data, provide a detailed weather and environmental forecast for the next 24-48 hours.
    
    Location: ${address}
    Zip Code: ${sensorData.zip_code}
    
    Current Sensor Data:
    - Air Quality Index: ${sensorData.air_quality}
    - Humidity: ${sensorData.humidity}%
    - Temperature: ${sensorData.temperature}°C
    - Rain Level: ${sensorData.rain_level}mm
    
    Provide a comprehensive forecast that includes:
    1. Temperature trends and predictions
    2. Precipitation probability and intensity
    3. Air quality predictions
    4. Humidity changes
    5. Environmental impact assessment
    6. Any environmental warnings or advisories
    7. Impact on daily activities and city operations
    
    Be specific, accurate, and actionable. Use environmental science principles and current data patterns.
    `;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    return response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Environmental forecast analysis completed.';
  } catch (error) {
    console.error('Error getting weather forecast:', error);
    throw new Error('Failed to generate environmental forecast');
  }
}

// Main API endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, zipCode: requestZipCode } = body;

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Step 1: Extract zip code from address using Vertex AI
    const extractedZipCode = await extractZipCode(address);
    console.log(`Extracted zip code: ${extractedZipCode} from address: ${address}`);

    // Step 2: Use provided zip code or extracted zip code
    const targetZipCode = requestZipCode || extractedZipCode;
    console.log(`Target zip code: ${targetZipCode}`);

    // Step 3: Find matching sensor data
    const sensorData = findSensorDataByZipCode(targetZipCode);

    if (!sensorData) {
      return NextResponse.json({
        success: false,
        message: `No environmental sensor reports available for the specified area (Zip Code: ${targetZipCode}).`,
        details: "Environmental monitoring data is not currently available for this location. Please check back later or contact city services for information about this area.",
        availableZipCodes: SENSOR_DATA.map(data => data.zip_code),
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    // Step 4: Analyze the data using Vertex AI and Gemini
    const analysis = await analyzeSensorData(sensorData, address);

    // Step 5: Get weather forecast using Vertex AI
    const forecast = await getWeatherForecast(sensorData, address);

    // Step 6: Get appropriate Lucide icon
    const icon = await getLucideIcon(sensorData);

    // Step 7: Return comprehensive analysis
    return NextResponse.json({
      success: true,
      location: {
        address,
        zipCode: targetZipCode,
        coordinates: sensorData.location
      },
      sensorData: {
        air_quality: sensorData.air_quality,
        humidity: sensorData.humidity,
        temperature: sensorData.temperature,
        rain_level: sensorData.rain_level,
        timestamp: sensorData.timestamp
      },
      analysis: {
        summary: analysis.summary,
        icon: icon,
        forecast: forecast,
        recommendations: analysis.recommendations,
        dataQuality: analysis.dataQuality,
        weatherInsights: analysis.weatherInsights,
        healthAdvisory: analysis.healthAdvisory
      },
      aiGenerated: true,
      models: {
        zipCodeExtraction: 'Vertex AI Gemini',
        analysis: 'Vertex AI Gemini',
        forecasting: 'Vertex AI Gemini',
        iconSelection: 'Vertex AI Gemini'
      },
      dataSource: 'Local Sensor Database',
      availableZipCodes: SENSOR_DATA.map(data => data.zip_code)
    });

  } catch (error) {
    console.error('Error in location analysis:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze location data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testAddress = searchParams.get('address') || 'C9VM+J8P, HUDA Techno Enclave, HITEC City, Hyderabad, Telangana 500081, India';
    const testZipCode = searchParams.get('zipCode');
    
    // Use the same logic as POST but with test address
    const extractedZipCode = await extractZipCode(testAddress);
    const targetZipCode = testZipCode || extractedZipCode;
    
    const sensorData = findSensorDataByZipCode(targetZipCode);

    if (!sensorData) {
      return NextResponse.json({
        success: false,
        test: true,
        message: `No environmental sensor reports available for the specified area (Zip Code: ${targetZipCode}).`,
        details: "Environmental monitoring data is not currently available for this location. Please check back later or contact city services for information about this area.",
        availableZipCodes: SENSOR_DATA.map(data => data.zip_code),
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }
    
    const analysis = await analyzeSensorData(sensorData, testAddress);
    const forecast = await getWeatherForecast(sensorData, testAddress);
    const icon = await getLucideIcon(sensorData);

    return NextResponse.json({
      success: true,
      test: true,
      location: {
        address: testAddress,
        zipCode: targetZipCode,
        coordinates: sensorData.location
      },
      sensorData: {
        air_quality: sensorData.air_quality,
        humidity: sensorData.humidity,
        temperature: sensorData.temperature,
        rain_level: sensorData.rain_level,
        timestamp: sensorData.timestamp
      },
      analysis: {
        summary: analysis.summary,
        icon: icon,
        forecast: forecast,
        recommendations: analysis.recommendations,
        dataQuality: analysis.dataQuality,
        weatherInsights: analysis.weatherInsights,
        healthAdvisory: analysis.healthAdvisory
      },
      aiGenerated: true,
      models: {
        zipCodeExtraction: 'Vertex AI Gemini',
        analysis: 'Vertex AI Gemini',
        forecasting: 'Vertex AI Gemini',
        iconSelection: 'Vertex AI Gemini'
      },
      dataSource: 'Local Sensor Database',
      availableZipCodes: SENSOR_DATA.map(data => data.zip_code)
    });

  } catch (error) {
    console.error('Error in test analysis:', error);
    return NextResponse.json(
      { 
        error: 'Failed to perform test analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 