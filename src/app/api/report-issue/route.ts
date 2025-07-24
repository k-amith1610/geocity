import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { db } from '@/lib/fireBaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Initialize Google Cloud Storage with Firebase Admin SDK credentials
let storage: Storage;

try {
  // Check for required environment variables
  if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
    throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required');
  }
  
  if (!process.env.GOOGLE_CLOUD_PRIVATE_KEY) {
    throw new Error('GOOGLE_CLOUD_PRIVATE_KEY environment variable is required');
  }
  
  if (!process.env.GOOGLE_CLOUD_CLIENT_EMAIL) {
    throw new Error('GOOGLE_CLOUD_CLIENT_EMAIL environment variable is required');
  }

  // Use Firebase Admin SDK credentials from environment variables
  storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    credentials: {
      type: "service_account",
      project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
      private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLOUD_CLIENT_ID
    }
  });
  
  console.log('Google Cloud Storage initialized successfully');
} catch (error) {
  console.error('Failed to initialize Google Cloud Storage:', error);
  throw new Error('Google Cloud Storage not properly configured. Please check your environment variables.');
}

const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'raised_issue';

// Main Report Data Interface - Matching ReportModal.tsx exactly
interface ReportData {
  photo: string; // Base64 encoded image data URI
  photoDetails: {
    name: string;
    size: number;
    type: string;
    lastModified: string; // Date/time string format
  };
  location: string;
  description: string;
  isEmergency: boolean; // Changed from emergency to isEmergency
  emergencyType?: 'MEDICAL' | 'LAW_ENFORCEMENT' | 'FIRE_HAZARD' | 'ENVIRONMENTAL' | null;
  deviceInfo: {
    publicIP: string;
    userAgent: string;
    screenResolution: string;
    timezone: string;
    language: string;
    timestamp: string; // ISO string format
    deviceType: 'mobile' | 'tablet' | 'desktop';
  };
  imageAnalysis?: {
    authenticity: 'REAL' | 'AI_GENERATED' | 'UNCERTAIN';
    description: string;
    humanReadableDescription: string;
    emergencyLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    category: 'SAFE' | 'WARNING' | 'DANGER';
    reasoning: string;
    confidence: number;
  };
  expirationHours?: number;
  userId: string;
}

// Function to convert base64 to buffer
function base64ToBuffer(base64String: string): Buffer {
  // Remove data URI prefix if present
  const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

// Function to extract file extension from MIME type
function getFileExtension(mimeType: string): string {
  const extensions: { [key: string]: string } = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/svg+xml': 'svg'
  };
  return extensions[mimeType] || 'jpg';
}

// Function to generate unique filename
function generateUniqueFilename(originalName: string, mimeType: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = getFileExtension(mimeType);
  
  // Clean the original name and use it as prefix
  const cleanName = originalName
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 50); // Limit length
  
  return `${cleanName}_${timestamp}_${randomString}.${extension}`;
}

// Function to upload image to Google Cloud Storage
async function uploadImageToGCS(base64Image: string, filename: string, mimeType: string): Promise<string> {
  try {
    console.log('Starting GCS upload for filename:', filename);
    console.log('MIME type:', mimeType);
    console.log('Base64 image length:', base64Image.length);
    
    const bucket = storage.bucket(bucketName);
    console.log('Bucket reference created:', bucketName);
    
    const file = bucket.file(filename);
    console.log('File reference created:', filename);
    
    // Convert base64 to buffer
    const buffer = base64ToBuffer(base64Image);
    console.log('Buffer created, size:', buffer.length, 'bytes');
    
    // Upload file
    console.log('Starting file upload...');
    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000', // 1 year cache
      },
      public: false, // Keep private for security
    });
    console.log('File uploaded successfully');

    // Generate signed URL for temporary access
    console.log('Generating signed URL...');
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });
    console.log('Signed URL generated successfully');

    return signedUrl;
  } catch (error) {
    console.error('Detailed GCS upload error:', error);
    
    // Provide specific error messages based on error type
    if (error instanceof Error) {
      if (error.message.includes('ENOTFOUND')) {
        throw new Error('Network error: Could not connect to Google Cloud Storage. Please check your internet connection.');
      } else if (error.message.includes('Unauthorized')) {
        throw new Error('Authentication error: Invalid credentials. Please check your service account configuration.');
      } else if (error.message.includes('Forbidden')) {
        throw new Error('Permission error: Service account does not have permission to access the bucket.');
      } else if (error.message.includes('Not Found')) {
        throw new Error('Bucket not found: The bucket "raised_issue" does not exist or is not accessible.');
      } else {
        throw new Error(`Google Cloud Storage error: ${error.message}`);
      }
    } else {
      throw new Error('Failed to upload image to cloud storage: Unknown error occurred');
    }
  }
}

// Function to save report to Firestore - Matching the collection structure exactly
async function saveReportToFirestore(reportData: ReportData, imageUrl: string): Promise<string> {
  try {
    const issuesCollection = collection(db, 'raised-issue'); // Using 'raised-issue' collection
    
    // Create the document structure matching your Firestore collection
    const reportDoc = {
      // Original report data
      photo: imageUrl, // Store the GCS URL instead of base64
      photoDetails: {
        name: reportData.photoDetails.name,
        size: reportData.photoDetails.size,
        type: reportData.photoDetails.type,
        lastModified: reportData.photoDetails.lastModified,
        user_id: reportData.userId || 'anonymous' // Add user_id to photoDetails
      },
      location: reportData.location,
      description: reportData.description,
      isEmergency: reportData.isEmergency,
      emergencyType: reportData.emergencyType,
      deviceInfo: {
        publicIP: reportData.deviceInfo.publicIP,
        userAgent: reportData.deviceInfo.userAgent,
        screenResolution: reportData.deviceInfo.screenResolution,
        timezone: reportData.deviceInfo.timezone,
        language: reportData.deviceInfo.language,
        timestamp: reportData.deviceInfo.timestamp,
        deviceType: reportData.deviceInfo.deviceType
      },
      // AI Analysis data
      imageAnalysis: reportData.imageAnalysis ? {
        authenticity: reportData.imageAnalysis.authenticity,
        description: reportData.imageAnalysis.description,
        humanReadableDescription: reportData.imageAnalysis.humanReadableDescription,
        emergencyLevel: reportData.imageAnalysis.emergencyLevel,
        category: reportData.imageAnalysis.category,
        reasoning: reportData.imageAnalysis.reasoning,
        confidence: reportData.imageAnalysis.confidence
      } : null,
      // Additional fields
      expirationHours: reportData.expirationHours || 1,
      userId: reportData.userId || '',
      // Firestore timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Status tracking
      status: 'pending',
      priority: reportData.isEmergency ? 'high' : 'medium',
      assignedTo: null,
      resolvedAt: null,
      resolutionNotes: null
    };

    const docRef = await addDoc(issuesCollection, reportDoc);
    return docRef.id;
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    throw new Error('Failed to save report to database');
  }
}

// Function to validate report data
function validateReportData(data: any): data is ReportData {
  // Basic validation
  if (!data.photo || !data.photoDetails || !data.location || !data.deviceInfo) {
    return false;
  }

  // Validate photo is base64
  if (!data.photo.startsWith('data:image/')) {
    return false;
  }

  // Validate required fields
  if (!data.photoDetails.name || !data.photoDetails.type || !data.photoDetails.size) {
    return false;
  }

  if (!data.deviceInfo.publicIP || !data.deviceInfo.userAgent || !data.deviceInfo.timestamp) {
    return false;
  }

  // Validate isEmergency is boolean
  if (typeof data.isEmergency !== 'boolean') {
    return false;
  }

  // Validate emergency type if emergency is true
  if (data.isEmergency && !data.emergencyType) {
    return false;
  }

  return true;
}

// Main API endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request data
    if (!validateReportData(body)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid report data. Missing required fields or invalid format.',
        message: 'Please provide all required fields: photo, photoDetails, location, deviceInfo, isEmergency'
      }, { status: 400 });
    }

    const reportData: ReportData = body;
    
    console.log('Processing report submission:', {
      location: reportData.location,
      isEmergency: reportData.isEmergency,
      emergencyType: reportData.emergencyType,
      imageSize: reportData.photoDetails.size,
      deviceType: reportData.deviceInfo.deviceType,
      userId: reportData.userId
    });

    // Step 1: Generate unique filename
    const filename = generateUniqueFilename(
      reportData.photoDetails.name,
      reportData.photoDetails.type
    );

    // Step 2: Upload image to Google Cloud Storage
    const imageUrl = await uploadImageToGCS(
      reportData.photo,
      filename,
      reportData.photoDetails.type
    );

    console.log('Image uploaded successfully:', filename);

    // Step 3: Save report to Firestore
    const reportId = await saveReportToFirestore(reportData, imageUrl);

    console.log('Report saved to Firestore:', reportId);

    // Step 4: Return success response
    return NextResponse.json({
      success: true,
      data: {
        reportId: reportId,
        imageUrl: imageUrl,
        filename: filename,
        location: reportData.location,
        isEmergency: reportData.isEmergency,
        emergencyType: reportData.emergencyType,
        imageAnalysis: reportData.imageAnalysis,
        expirationHours: reportData.expirationHours,
        userId: reportData.userId,
        status: 'pending'
      },
      message: reportData.isEmergency 
        ? 'Emergency report submitted successfully. Authorities have been notified.'
        : 'Report submitted successfully. We will review and take appropriate action.',
      timestamp: new Date().toISOString()
    }, { status: 201 });

  } catch (error) {
    console.error('Error processing report submission:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process report submission',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Unable to submit report at this time. Please try again later.',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    return NextResponse.json({
      success: true,
      message: 'Report submission API is operational',
      endpoints: {
        POST: '/api/report-issue',
        description: 'Submit a new issue report with image and metadata'
      },
      requiredFields: [
        'photo (base64 image)',
        'photoDetails (name, size, type, lastModified)',
        'location (string)',
        'description (string)',
        'isEmergency (boolean)',
        'deviceInfo (publicIP, userAgent, screenResolution, timezone, language, timestamp, deviceType)'
      ],
      optionalFields: [
        'emergencyType (MEDICAL | LAW_ENFORCEMENT | FIRE_HAZARD | ENVIRONMENTAL)',
        'imageAnalysis (AI analysis results)',
        'expirationHours (number)',
        'userId (string)'
      ],
      bucket: bucketName,
      collection: 'raised-issue',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'API test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 