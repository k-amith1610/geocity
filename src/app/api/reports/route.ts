/*
import { NextRequest, NextResponse } from 'next/server';

interface DeviceInfo {
  publicIP: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  timestamp: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

interface ReportData {
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
  timestamp: string;
}

// In-memory storage for demo purposes
// In production, use a proper database
let reports: ReportData[] = [];

export async function POST(request: NextRequest) {
  try {
    const body: ReportData = await request.json();
    
    // Validate required fields
    if (!body.photo || !body.location) {
      return NextResponse.json(
        { status: 'error', message: 'Photo and location are required' },
        { status: 400 }
      );
    }

    // Basic fraud detection
    const fraudScore = calculateFraudScore(body);
    if (fraudScore > 0.8) {
      return NextResponse.json(
        { status: 'error', message: 'Report flagged for review' },
        { status: 400 }
      );
    }

    // Add timestamp if not provided
    const reportData: ReportData = {
      ...body,
      timestamp: body.timestamp || new Date().toISOString()
    };

    // Store report (in production, save to database)
    reports.push(reportData);

    // Log for debugging
    console.log('Report submitted:', {
      location: reportData.location,
      emergency: reportData.emergency,
      timestamp: reportData.timestamp,
      deviceInfo: {
        ip: reportData.deviceInfo.publicIP,
        deviceType: reportData.deviceInfo.deviceType,
        userAgent: reportData.deviceInfo.userAgent.substring(0, 100) + '...'
      }
    });

    return NextResponse.json({
      status: 'success',
      message: 'Report submitted successfully',
      data: {
        reportId: reports.length,
        timestamp: reportData.timestamp
      }
    });

  } catch (error) {
    console.error('Error submitting report:', error);
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Return all reports (in production, implement pagination and filtering)
    return NextResponse.json({
      status: 'success',
      data: {
        reports: reports.map((report, index) => ({
          id: index + 1,
          location: report.location,
          description: report.description,
          emergency: report.emergency,
          timestamp: report.timestamp,
          deviceInfo: {
            ip: report.deviceInfo.publicIP,
            deviceType: report.deviceInfo.deviceType
          }
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateFraudScore(report: ReportData): number {
  let score = 0;
  
  // Check for suspicious patterns
  if (report.deviceInfo.userAgent.includes('bot')) score += 0.5;
  if (report.deviceInfo.userAgent.includes('crawler')) score += 0.5;
  if (report.description && report.description.length < 10) score += 0.2;
  if (report.photoDetails.size > 10 * 1024 * 1024) score += 0.3; // > 10MB
  
  return Math.min(score, 1.0);
}
*/ 