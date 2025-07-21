import { NextRequest, NextResponse } from 'next/server';

interface FirebaseSensorData {
  air_quality: number;
  humidity: number;
  location: {
    latitude: number;
    longitude: number;
  };
  rain_level: number;
  temperature: number;
  zip_code: string;
}

interface FirebaseData {
  sensor_data: {
    [zipCode: string]: FirebaseSensorData;
  };
}

// Function to fetch data from Firebase Realtime Database
async function fetchFirebaseData(): Promise<FirebaseData | null> {
  try {
    const firebaseUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
    if (!firebaseUrl) {
      throw new Error('Firebase database URL not configured');
    }

    const response = await fetch(`${firebaseUrl}.json`);
    if (!response.ok) {
      throw new Error(`Firebase request failed: ${response.status}`);
    }

    const data: FirebaseData = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Firebase data:', error);
    return null;
  }
}

// Function to get sensor data by zip code
async function getSensorDataByZipCode(zipCode: string): Promise<FirebaseSensorData | null> {
  try {
    const firebaseUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
    if (!firebaseUrl) {
      throw new Error('Firebase database URL not configured');
    }

    const response = await fetch(`${firebaseUrl}/sensor_data/${zipCode}.json`);
    if (!response.ok) {
      return null;
    }

    const data: FirebaseSensorData = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching sensor data for zip code:', zipCode, error);
    return null;
  }
}

// GET endpoint to fetch all Firebase weather data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const zipCode = searchParams.get('zipCode');

    if (zipCode) {
      // Fetch specific zip code data
      const sensorData = await getSensorDataByZipCode(zipCode);
      
      if (!sensorData) {
        return NextResponse.json({
          success: false,
          message: `No sensor data found for zip code: ${zipCode}`,
          timestamp: new Date().toISOString()
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        zipCode,
        sensorData,
        timestamp: new Date().toISOString(),
        dataSource: 'Firebase Realtime Database'
      });
    } else {
      // Fetch all sensor data
      const firebaseData = await fetchFirebaseData();
      
      if (!firebaseData) {
        return NextResponse.json({
          success: false,
          message: 'Failed to fetch data from Firebase',
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: firebaseData,
        availableZipCodes: Object.keys(firebaseData.sensor_data || {}),
        timestamp: new Date().toISOString(),
        dataSource: 'Firebase Realtime Database'
      });
    }
  } catch (error) {
    console.error('Error in Firebase weather API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch Firebase weather data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST endpoint to fetch data for specific address/zip code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zipCode, address } = body;

    if (!zipCode && !address) {
      return NextResponse.json(
        { error: 'Either zipCode or address is required' },
        { status: 400 }
      );
    }

    let targetZipCode = zipCode;
    
    // If address is provided, try to extract zip code
    if (address && !zipCode) {
      const zipMatch = address.match(/\d{5,6}/);
      targetZipCode = zipMatch ? zipMatch[0] : null;
      
      if (!targetZipCode) {
        return NextResponse.json({
          success: false,
          message: 'Could not extract zip code from address',
          address,
          timestamp: new Date().toISOString()
        }, { status: 400 });
      }
    }

    const sensorData = await getSensorDataByZipCode(targetZipCode);
    
    if (!sensorData) {
      return NextResponse.json({
        success: false,
        message: `No sensor data found for zip code: ${targetZipCode}`,
        zipCode: targetZipCode,
        address,
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      location: {
        address: address || `Zip Code: ${targetZipCode}`,
        zipCode: targetZipCode,
        coordinates: sensorData.location
      },
      sensorData: {
        air_quality: sensorData.air_quality,
        humidity: sensorData.humidity,
        temperature: sensorData.temperature,
        rain_level: sensorData.rain_level,
        zip_code: sensorData.zip_code
      },
      timestamp: new Date().toISOString(),
      dataSource: 'Firebase Realtime Database'
    });

  } catch (error) {
    console.error('Error in Firebase weather POST API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch Firebase weather data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 