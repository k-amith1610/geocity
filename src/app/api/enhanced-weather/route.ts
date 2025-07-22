import { NextRequest, NextResponse } from 'next/server';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { vertexAI } from '@genkit-ai/vertexai';
import { z } from 'zod';

// Initialize Genkit with Google AI and Vertex AI
const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY!,
    }),
    vertexAI({
      projectId: process.env.GOOGLE_CLOUD_PROJECT!,
      location: 'us-central1',
    }),
  ],
});

// Interfaces
interface GeocodingResult {
  lat: number;
  lng: number;
  zipCode?: string;
  formattedAddress: string;
}

interface WeatherData {
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
  airQuality?: number;
}

interface EnhancedWeatherResponse {
  location: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    zipCode?: string;
  };
  weather: WeatherData;
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
  };
  dataSource: string;
  timestamp: string;
}

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

// Function to geocode address using Google Maps API
async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return null;
    }

    const result = data.results[0];
    const location = result.geometry.location;
    
    // Extract zip code from address components
    let zipCode: string | undefined;
    if (result.address_components) {
      const postalCodeComponent = result.address_components.find(
        (component: any) => component.types.includes('postal_code')
      );
      if (postalCodeComponent) {
        zipCode = postalCodeComponent.long_name;
      }
    }

    return {
      lat: location.lat,
      lng: location.lng,
      zipCode,
      formattedAddress: result.formatted_address
    };
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

// Function to fetch sensor data from Firebase by coordinates (nearest zip code)
async function fetchSensorDataFromFirebase(lat: number, lng: number, requestedZipCode?: string): Promise<SensorData | null> {
  try {
    const firebaseUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
    if (!firebaseUrl) {
      return null;
    }

    // Get all sensor data from Firebase
    const response = await fetch(`${firebaseUrl}/sensor_data.json`);
    if (!response.ok) {
      return null;
    }

    const allSensorData = await response.json();
    
    // First, try to find exact zip code match
    if (requestedZipCode && allSensorData[requestedZipCode]) {
      const sensor = allSensorData[requestedZipCode];
      return {
        air_quality: sensor.air_quality,
        humidity: sensor.humidity,
        temperature: sensor.temperature,
        rain_level: sensor.rain_level,
        zip_code: requestedZipCode,
        location: {
          latitude: sensor.location.latitude,
          longitude: sensor.location.longitude,
          address: `Exact Match: ${requestedZipCode}`
        },
        timestamp: new Date().toISOString()
      };
    }
    
    // If no exact zip code match, find the nearest sensor data based on coordinates
    let nearestSensor: any = null;
    let minDistance = Infinity;
    
    for (const [zipCode, sensorData] of Object.entries(allSensorData)) {
      const sensor = sensorData as any;
      if (sensor.location && sensor.location.latitude && sensor.location.longitude) {
        const distance = Math.sqrt(
          Math.pow(lat - sensor.location.latitude, 2) + 
          Math.pow(lng - sensor.location.longitude, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestSensor = { ...sensor, zip_code: zipCode };
        }
      }
    }
    
    // Only return if the nearest sensor is within reasonable distance (20km)
    // This ensures we only use Firebase data when it's actually relevant to the location
    if (nearestSensor && minDistance < 0.2) { // ~20km in degrees
      return {
        air_quality: nearestSensor.air_quality,
        humidity: nearestSensor.humidity,
        temperature: nearestSensor.temperature,
        rain_level: nearestSensor.rain_level,
        zip_code: nearestSensor.zip_code,
        location: {
          latitude: nearestSensor.location.latitude,
          longitude: nearestSensor.location.longitude,
          address: `Nearest Sensor: ${nearestSensor.zip_code}`
        },
        timestamp: new Date().toISOString()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching sensor data from Firebase:', error);
    return null;
  }
}

// Function to get weather data from Tomorrow.io
async function getWeatherData(lat: number, lng: number): Promise<WeatherData | null> {
  try {
    const apiKey = process.env.TOMORROW_IO_API_KEY;
    if (!apiKey) {
      throw new Error('Tomorrow.io API key not configured');
    }

    const response = await fetch(
      `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lng}&apikey=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`Tomorrow.io API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Get current weather from the first hourly entry
    const current = data.timelines.hourly[0];
    const currentValues = current.values;

    // Convert Tomorrow.io weather codes to descriptions
    const weatherDescriptions: { [key: number]: string } = {
      1000: 'Clear',
      1001: 'Cloudy',
      1100: 'Mostly Clear',
      1101: 'Partly Cloudy',
      1102: 'Mostly Cloudy',
      2000: 'Fog',
      2100: 'Light Fog',
      4000: 'Drizzle',
      4001: 'Rain',
      4200: 'Light Rain',
      4201: 'Heavy Rain',
      5000: 'Snow',
      5001: 'Flurries',
      5100: 'Light Snow',
      5101: 'Heavy Snow',
      6000: 'Freezing Drizzle',
      6200: 'Light Freezing Rain',
      6201: 'Freezing Rain',
      7000: 'Ice Pellets',
      7101: 'Heavy Ice Pellets',
      7102: 'Light Ice Pellets',
      8000: 'Thunderstorm'
    };

    // Get air quality data if available
    let airQuality: number | undefined;
    try {
      const aqiResponse = await fetch(
        `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lng}&fields=epaIndex&apikey=${apiKey}`
      );
      if (aqiResponse.ok) {
        const aqiData = await aqiResponse.json();
        airQuality = aqiData.data.values.epaIndex;
      }
    } catch (error) {
      console.log('Air quality data not available, using estimation');
    }

    // If no air quality data, estimate based on weather conditions
    if (!airQuality) {
      airQuality = estimateAirQuality(
        currentValues.temperature,
        currentValues.humidity,
        currentValues.windSpeed
      );
    }

    return {
      temperature: currentValues.temperature,
      humidity: currentValues.humidity,
      pressure: currentValues.pressureSeaLevel,
      windSpeed: currentValues.windSpeed,
      windDirection: currentValues.windDirection,
      description: weatherDescriptions[currentValues.weatherCode] || 'Unknown',
      icon: getWeatherIcon(currentValues.weatherCode),
      visibility: currentValues.visibility,
      clouds: currentValues.cloudCover,
      rain: currentValues.rainIntensity,
      snow: currentValues.snowIntensity,
      airQuality
    };
  } catch (error) {
    console.error('Error fetching weather data from Tomorrow.io:', error);
    return null;
  }
}

// Function to get weather icon based on Tomorrow.io weather code
function getWeatherIcon(weatherCode: number): string {
  if (weatherCode >= 1000 && weatherCode <= 1102) return 'Sun';
  if (weatherCode >= 2000 && weatherCode <= 2100) return 'Cloud';
  if (weatherCode >= 4000 && weatherCode <= 4201) return 'CloudRain';
  if (weatherCode >= 5000 && weatherCode <= 5101) return 'CloudSnow';
  if (weatherCode >= 6000 && weatherCode <= 6201) return 'CloudRain';
  if (weatherCode >= 7000 && weatherCode <= 7102) return 'CloudSnow';
  if (weatherCode === 8000) return 'CloudLightning';
  return 'Activity';
}

// Function to estimate air quality based on weather conditions
function estimateAirQuality(temperature: number, humidity: number, windSpeed: number): number {
  // Simple estimation - in production you'd use a real air quality API
  let aqi = 50; // Base moderate air quality
  
  // Temperature factor (higher temp can increase pollution)
  if (temperature > 30) aqi += 20;
  if (temperature > 35) aqi += 30;
  
  // Humidity factor (high humidity can trap pollutants)
  if (humidity > 80) aqi += 15;
  if (humidity > 90) aqi += 25;
  
  // Wind factor (higher wind can disperse pollutants)
  if (windSpeed > 20) aqi -= 10;
  if (windSpeed > 30) aqi -= 20;
  
  return Math.max(0, Math.min(500, aqi)); // Clamp between 0-500
}

// Function to combine and analyze data from both sources
async function analyzeCombinedData(
  address: string,
  coordinates: { latitude: number; longitude: number },
  zipCode?: string,
  firebaseData?: SensorData | null,
  tomorrowData?: WeatherData | null
): Promise<any> {
  try {
    // Prepare data for AI analysis
    const analysisData: any = {
      address,
      coordinates,
      zipCode: zipCode || 'Unknown',
      dataSources: [],
      combinedData: {}
    };

    // Add Firebase data if available and relevant
    if (firebaseData) {
      // Check if the Firebase sensor is actually relevant to the requested location
      const distance = Math.sqrt(
        Math.pow(coordinates.latitude - firebaseData.location.latitude, 2) + 
        Math.pow(coordinates.longitude - firebaseData.location.longitude, 2)
      );
      
      // Only include Firebase if sensor is within 20km of requested location
      if (distance < 0.2) { // ~20km in degrees
        analysisData.dataSources.push('Firebase Realtime Database');
        analysisData.combinedData.firebase = {
          air_quality: firebaseData.air_quality,
          humidity: firebaseData.humidity,
          temperature: firebaseData.temperature,
          rain_level: firebaseData.rain_level,
          timestamp: firebaseData.timestamp
        };
      }
    }

    // Add Tomorrow.io data if available
    if (tomorrowData) {
      analysisData.dataSources.push('Tomorrow.io Weather API');
      analysisData.combinedData.tomorrow = {
        temperature: tomorrowData.temperature,
        humidity: tomorrowData.humidity,
        pressure: tomorrowData.pressure,
        windSpeed: tomorrowData.windSpeed,
        windDirection: tomorrowData.windDirection,
        description: tomorrowData.description,
        visibility: tomorrowData.visibility,
        clouds: tomorrowData.clouds,
        rain: tomorrowData.rain,
        snow: tomorrowData.snow,
        airQuality: tomorrowData.airQuality
      };
    }

    // Use AI to analyze the combined data
    const result = await weatherAnalysisPrompt({
      address: analysisData.address,
      weatherData: {
        temperature: tomorrowData?.temperature || firebaseData?.temperature || 0,
        humidity: tomorrowData?.humidity || firebaseData?.humidity || 0,
        pressure: tomorrowData?.pressure || 1013.25, // Standard atmospheric pressure
        windSpeed: tomorrowData?.windSpeed || 0,
        description: tomorrowData?.description || 'Unknown',
        airQuality: tomorrowData?.airQuality || firebaseData?.air_quality || 50
      },
      dataSources: analysisData.dataSources,
      combinedData: analysisData.combinedData
    });

    if (!result.output) {
      throw new Error('No output from weather analysis');
    }

    return {
      ...result.output,
      dataSources: analysisData.dataSources,
      dataAvailability: {
        firebase: !!firebaseData && analysisData.dataSources.includes('Firebase Realtime Database'),
        tomorrow: !!tomorrowData,
        total: analysisData.dataSources.length
      }
    };
  } catch (error) {
    console.error('Error analyzing combined data:', error);
    throw error;
  }
}

// Updated AI prompt for comprehensive weather analysis
const weatherAnalysisPrompt = ai.definePrompt({
  name: 'weatherAnalyzer',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: z.object({
    address: z.string(),
    weatherData: z.object({
      temperature: z.number(),
      humidity: z.number(),
      pressure: z.number(),
      windSpeed: z.number(),
      description: z.string(),
      airQuality: z.number().optional()
    }),
    dataSources: z.array(z.string()).optional(),
    combinedData: z.any().optional()
  })},
  output: { schema: z.object({
    summary: z.string(),
    forecast: z.string(),
    recommendations: z.array(z.string()),
    healthAdvisory: z.string(),
    environmentalRisk: z.enum(['low', 'medium', 'high']),
    airQualityCategory: z.string(),
    temperatureTrend: z.string(),
    precipitationOutlook: z.string(),
    icon: z.string(),
    dataQuality: z.string(),
    insights: z.string()
  })},
  prompt: `You are an expert meteorologist and environmental scientist analyzing comprehensive weather and environmental data.
  
  Location: {{{address}}}
  
  Primary Weather Data:
  - Temperature: {{{weatherData.temperature}}}°C
  - Humidity: {{{weatherData.humidity}}}%
  - Pressure: {{{weatherData.pressure}}} hPa
  - Wind Speed: {{{weatherData.windSpeed}}} km/h
  - Weather Description: {{{weatherData.description}}}
  - Air Quality Index: {{{weatherData.airQuality}}}
  
  Data Sources: {{{dataSources}}}
  
  Provide a comprehensive analysis including:
  1. Current weather conditions and their implications
  2. Health and safety recommendations
  3. Environmental risk assessment
  4. Air quality analysis
  5. Temperature and precipitation outlook
  6. Appropriate icon for the conditions
  7. Data quality assessment
  8. Key insights from available data sources
  
  Be professional, accurate, and actionable. Use meteorological principles and consider the reliability of different data sources.`
});

// Main API endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    console.log('Processing weather request for:', address);

    // Geocode the address
    const geocodingResult = await geocodeAddress(address);
    if (!geocodingResult) {
      return NextResponse.json(
        { error: 'Could not geocode the provided address' },
        { status: 400 }
      );
    }

    try {
      // Try to get weather data from Tomorrow.io
      const weatherData = await getWeatherData(geocodingResult.lat, geocodingResult.lng);
      
      // Try to get sensor data from Firebase
      const sensorData = await fetchSensorDataFromFirebase(
        geocodingResult.lat, 
        geocodingResult.lng, 
        geocodingResult.zipCode
      );

      // Only proceed if we have real weather data
      if (!weatherData && !sensorData) {
        return NextResponse.json(
          { 
            error: 'No weather data available',
            details: 'Unable to fetch weather information for this location.',
            location: {
              address: geocodingResult.formattedAddress,
              coordinates: {
                latitude: geocodingResult.lat,
                longitude: geocodingResult.lng,
              },
              zipCode: geocodingResult.zipCode,
            },
            timestamp: new Date().toISOString()
          },
          { status: 404 }
        );
      }

      const analysis = await analyzeCombinedData(
        address,
        { latitude: geocodingResult.lat, longitude: geocodingResult.lng },
        geocodingResult.zipCode,
        sensorData,
        weatherData
      );

      const response: EnhancedWeatherResponse = {
        location: {
          address: geocodingResult.formattedAddress,
          coordinates: {
            latitude: geocodingResult.lat,
            longitude: geocodingResult.lng,
          },
          zipCode: geocodingResult.zipCode,
        },
        weather: weatherData!,
        analysis: analysis!,
        dataSource: weatherData ? 'Tomorrow.io API' : 'Firebase Sensor Data',
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        ...response,
        dataSources: ['Google Maps Geocoding API', weatherData ? 'Tomorrow.io Weather API' : '', sensorData ? 'Firebase Realtime Database' : ''].filter(Boolean),
        dataAvailability: {
          firebase: !!sensorData,
          tomorrow: !!weatherData,
          total: (sensorData ? 1 : 0) + (weatherData ? 1 : 0)
        },
        sensorData,
        timestamp: new Date().toISOString(),
        aiGenerated: !!analysis,
        models: {
          geocoding: 'Google Maps Geocoding API',
          weatherData: weatherData ? 'Tomorrow.io Weather API' : 'Firebase Sensor Data',
          sensorData: sensorData ? 'Firebase Realtime Database' : 'No Sensor Data',
          analysis: analysis ? 'Vertex AI Gemini 1.5 Flash' : 'No Analysis'
        },
        framework: 'Genkit AI Framework'
      });

    } catch (aiError) {
      console.error('AI analysis failed:', aiError);
      
      // Check if it's a quota error
      const isQuotaError = aiError instanceof Error && 
        (aiError.message.includes('429') || 
         aiError.message.includes('quota') || 
         aiError.message.includes('Too Many Requests'));
      
      if (isQuotaError) {
        return NextResponse.json(
          { 
            error: 'AI analysis temporarily unavailable',
            details: 'API quota exceeded. Please try again later or contact support.',
            location: {
              address: geocodingResult.formattedAddress,
              coordinates: {
                latitude: geocodingResult.lat,
                longitude: geocodingResult.lng,
              },
              zipCode: geocodingResult.zipCode,
            },
            timestamp: new Date().toISOString()
          },
          { status: 429 }
        );
      }
      
      // For other AI errors, return a generic error
      return NextResponse.json(
        { 
          error: 'Failed to analyze weather data',
          details: 'Unable to process weather information at this time.',
          location: {
            address: geocodingResult.formattedAddress,
            coordinates: {
              latitude: geocodingResult.lat,
              longitude: geocodingResult.lng,
            },
            zipCode: geocodingResult.zipCode,
          },
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in enhanced weather API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process weather request',
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
    const testAddress = searchParams.get('address') || 'London, UK';
    
    // Use the same logic as POST
    const geocodeResult = await geocodeAddress(testAddress);
    
    if (!geocodeResult) {
      return NextResponse.json({
        success: false,
        test: true,
        message: `Could not find location for address: "${testAddress}"`,
        details: "Please check the address and try again.",
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    // Fetch data from both sources in parallel
    const [firebaseData, tomorrowData] = await Promise.all([
      fetchSensorDataFromFirebase(geocodeResult.lat, geocodeResult.lng, geocodeResult.zipCode),
      getWeatherData(geocodeResult.lat, geocodeResult.lng)
    ]);

    // Check if we have any data
    if (!firebaseData && !tomorrowData) {
      return NextResponse.json({
        success: false,
        test: true,
        message: `No weather or environmental data available for: "${geocodeResult.formattedAddress}"`,
        details: "Neither local sensor data nor weather service data is currently available for this location. Please try again later or contact city services for information about this area.",
        location: {
          address: geocodeResult.formattedAddress,
          coordinates: {
            latitude: geocodeResult.lat,
            longitude: geocodeResult.lng
          },
          zipCode: geocodeResult.zipCode
        },
        dataSources: {
          firebase: false,
          tomorrow: false
        },
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    const analysis = await analyzeCombinedData(
      geocodeResult.formattedAddress,
      { latitude: geocodeResult.lat, longitude: geocodeResult.lng },
      geocodeResult.zipCode,
      firebaseData,
      tomorrowData
    );

    const response = {
      success: true,
      test: true,
      location: {
        address: geocodeResult.formattedAddress,
        coordinates: {
          latitude: geocodeResult.lat,
          longitude: geocodeResult.lng
        },
        zipCode: geocodeResult.zipCode
      },
      dataSources: analysis.dataSources,
      dataAvailability: analysis.dataAvailability,
      weather: tomorrowData || null,
      sensorData: firebaseData || null,
      analysis: {
        summary: analysis.summary,
        forecast: analysis.forecast,
        recommendations: analysis.recommendations,
        healthAdvisory: analysis.healthAdvisory,
        environmentalRisk: analysis.environmentalRisk,
        airQualityCategory: analysis.airQualityCategory,
        temperatureTrend: analysis.temperatureTrend,
        precipitationOutlook: analysis.precipitationOutlook,
        icon: analysis.icon,
        dataQuality: analysis.dataQuality,
        insights: analysis.insights
      },
      timestamp: new Date().toISOString(),
      aiGenerated: true,
      models: {
        geocoding: 'Google Maps Geocoding API',
        weatherData: tomorrowData ? 'Tomorrow.io Weather API' : null,
        sensorData: firebaseData ? 'Firebase Realtime Database' : null,
        analysis: 'Vertex AI Gemini 1.5 Flash'
      },
      framework: 'Genkit AI Framework'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in enhanced weather GET API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process weather request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 