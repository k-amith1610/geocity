import { NextRequest, NextResponse } from 'next/server';
import { ref, get } from 'firebase/database';
import { realtimeDb } from '@/lib/fireBaseConfig';
import { db } from '@/lib/fireBaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Twilio Configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || '';
const ADMIN_PHONE_NUMBER = process.env.ADMIN_PHONE_NUMBER || '';

// Initialize Twilio client if credentials are available
let twilioClient: any = null;

if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  try {
    // Dynamic import to avoid require() ESLint error
    const twilio = await import('twilio');
    twilioClient = twilio.default(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    console.log('Twilio client initialized successfully');
  } catch (error) {
    console.warn('Failed to initialize Twilio client:', error);
    twilioClient = null;
  }
} else {
  console.log('Twilio credentials not provided, SMS notifications disabled');
}

// Interface for sensor data from Firebase Realtime Database
interface SensorData {
  zipcode: string;
  airQuality: number;
  flameDetected: number;
  fluidLevel: number;
  humidity: number;
  isEmergency: boolean | number;
  latitude: number;
  longitude: number;
  rainValue: number;
  temperature: number;
}

// Interface for processed emergency data
interface EmergencyData {
  zipcode: string;
  location: string;
  sensorData: SensorData;
  timestamp: string;
}

// Function to get location from coordinates using reverse geocoding
async function getLocationFromCoordinates(latitude: number, longitude: number): Promise<string> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return data.results[0].formatted_address;
    }
    
    return `${latitude}, ${longitude}`;
  } catch (error) {
    console.error('Error getting location from coordinates:', error);
    return `${latitude}, ${longitude}`;
  }
}

// Function to send emergency SMS notification
async function sendEmergencySMS(location: string, zipcode: string): Promise<void> {
  if (!twilioClient) {
    console.warn('Twilio client not initialized, cannot send SMS notification.');
    return;
  }

  try {
    console.log('📱 Sending emergency SMS notification...');
    console.log(`📞 To: ${ADMIN_PHONE_NUMBER}`);
    console.log(`📞 From: ${TWILIO_FROM_NUMBER}`);
    
    const message = `🚨 EMERGENCY ALERT

Location: ${location}
Zipcode: ${zipcode}`;

    console.log(`📝 SMS Message:`, message);

    const messageResponse = await twilioClient.messages.create({
      body: message,
      from: TWILIO_FROM_NUMBER,
      to: ADMIN_PHONE_NUMBER
    });

    console.log('✅ Emergency SMS sent successfully:', messageResponse.sid);
    console.log('📊 SMS Status:', messageResponse.status);
  } catch (error) {
    console.error('❌ Failed to send emergency SMS:', error);
    throw error;
  }
}

// Function to send Discord notification
async function sendDiscordNotification(message: string): Promise<boolean> {
  try {
    console.log('📱 Sending Discord notification...');
    console.log(`📝 Message: "${message}"`);

    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/social/discord`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        isEmergency: true
      }),
    });

    const result = await response.json();

    console.log('📊 Discord API response status:', response.status);
    console.log('📊 Discord API response:', JSON.stringify(result, null, 2));

    if (response.ok && result.success) {
      console.log('✅ Discord notification sent successfully:', result.message);
      return true;
    } else {
      console.error('❌ Discord notification failed:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending Discord notification:', error);
    return false;
  }
}

// Function to log social media post status
async function logSocialMediaStatus(
  zipcode: string, 
  location: string, 
  discordSuccess: boolean
): Promise<void> {
  try {
    const logData = {
      zipcode,
      location,
      timestamp: serverTimestamp(),
      socialMediaStatus: {
        discord: discordSuccess,
      },
      status: 'completed'
    };

    await addDoc(collection(db, 'emergency-social-logs'), logData);
    console.log('Social media status logged successfully');
  } catch (error) {
    console.error('Error logging social media status:', error);
  }
}

// Main scheduled job function
export async function GET(request: NextRequest) {
  try {
    console.log('🚨 Starting emergency monitoring job...');
    console.log('📊 Timestamp:', new Date().toISOString());
    
    // Step 1: Fetch emergency sensor data from Firebase Realtime Database
    console.log('🔍 Step 1: Querying Firebase Realtime Database for emergencies...');
    
    // Fetch all data and filter in JavaScript to avoid index requirement
    const dataRef = ref(realtimeDb, '/weatherData');
    
    console.log('📡 Executing Firebase query...');
    const snapshot = await get(dataRef);
    
    console.log('📋 Query completed. Snapshot exists:', snapshot.exists());
    
    const emergencyData: EmergencyData[] = [];
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log('📦 Raw data from Firebase:', JSON.stringify(data, null, 2));
      
      // Filter for emergencies in JavaScript
      for (const [key, sensorData] of Object.entries(data)) {
        const sensor = sensorData as SensorData;
        console.log(`🔍 Checking key: ${key}`);
        console.log(`📊 Sensor data:`, JSON.stringify(sensor, null, 2));
        console.log(`🚨 isEmergency value:`, sensor.isEmergency);
        
        // Check for emergency - handle both boolean true and numeric 1 values
        const isEmergency = sensor.isEmergency === true || sensor.isEmergency === 1 || Boolean(sensor.isEmergency);
        
        if (isEmergency) {
          console.log(`✅ EMERGENCY DETECTED for key: ${key}`);
          const zipcode = sensor.zipcode || key;
          console.log(`📍 Processing emergency zipcode: ${zipcode}`);
          
          // Get location from coordinates
          console.log(`🗺️ Getting location for coordinates: ${sensor.latitude}, ${sensor.longitude}`);
          const location = await getLocationFromCoordinates(sensor.latitude, sensor.longitude);
          console.log(`📍 Resolved location: ${location}`);
          
          emergencyData.push({
            zipcode,
            location,
            sensorData: sensor,
            timestamp: new Date().toISOString()
          });
        } else {
          console.log(`⏭️ Skipping non-emergency key: ${key} (isEmergency: ${sensor.isEmergency})`);
        }
      }
    } else {
      console.log('⚠️ No data found in Firebase Realtime Database');
    }
    
    console.log(`🎯 Found ${emergencyData.length} emergency situations`);
    
    if (emergencyData.length === 0) {
      console.log('✅ No emergencies to process. Job completed.');
      return NextResponse.json({
        success: true,
        message: 'Emergency monitoring completed. No emergencies found.',
        processed: 0,
        timestamp: new Date().toISOString()
      });
    }
    
    // Step 2: Process each emergency
    console.log('🔄 Step 2: Processing emergencies...');
    
    for (const emergency of emergencyData) {
      try {
        console.log(`\n🚨 Processing emergency for zipcode: ${emergency.zipcode}`);
        console.log(`📍 Location: ${emergency.location}`);
        console.log(`📊 Sensor readings:`, JSON.stringify(emergency.sensorData, null, 2));
        
        // Send SMS notification
        console.log(`📱 Step 2.1: Sending SMS notification...`);
        await sendEmergencySMS(emergency.location, emergency.zipcode);
        console.log(`✅ SMS notification sent successfully`);
        
        // Send Discord notification
        console.log(`📱 Step 2.2: Sending Discord notification...`);
        const discordMessage = `🚨 EMERGENCY ALERT

Location: ${emergency.location}
Zipcode: ${emergency.zipcode}

Sensor Data:
• Temperature: ${emergency.sensorData.temperature}°C
• Humidity: ${emergency.sensorData.humidity}%
• Air Quality: ${emergency.sensorData.airQuality}
• Rain Level: ${emergency.sensorData.rainValue}
• Flame Detected: ${emergency.sensorData.flameDetected ? 'YES' : 'NO'}
• Fluid Level: ${emergency.sensorData.fluidLevel}

Authorities have been notified via SMS.`;

        const discordSuccess = await sendDiscordNotification(discordMessage);
        console.log(`✅ Discord notification result: ${discordSuccess ? 'SUCCESS' : 'FAILED'}`);
        
        // Log status
        console.log(`📊 Step 2.3: Logging status to Firestore...`);
        await logSocialMediaStatus(
          emergency.zipcode,
          emergency.location,
          discordSuccess
        );
        console.log(`✅ Status logged to Firestore`);
        
        console.log(`✅ Emergency processing completed for ${emergency.zipcode}: SMS: ✅, Discord: ${discordSuccess ? '✅' : '❌'}`);
        
      } catch (error) {
        console.error(`❌ Error processing emergency for ${emergency.zipcode}:`, error);
      }
    }
    
    console.log(`\n🎉 Emergency monitoring job completed successfully!`);
    console.log(`📊 Summary: Processed ${emergencyData.length} emergencies`);
    
    return NextResponse.json({
      success: true,
      message: `Emergency monitoring completed. Processed ${emergencyData.length} emergencies.`,
      processed: emergencyData.length,
      emergencies: emergencyData.map(e => ({
        zipcode: e.zipcode,
        location: e.location,
        timestamp: e.timestamp
      })),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Emergency monitoring job failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Emergency monitoring job failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST endpoint for manual trigger
export async function POST(request: NextRequest) {
  return GET(request);
} 