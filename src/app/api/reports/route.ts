import { NextRequest, NextResponse } from 'next/server';

interface ReportData {
  photo: string; // Base64 encoded image
  location: string;
  description: string;
  emergency: boolean;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ReportData = await request.json();
    
    // Validate required fields
    if (!body.photo || !body.location) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Photo and location are required' 
        }, 
        { status: 400 }
      );
    }

    // Here you would typically:
    // 1. Save the report to database
    // 2. Process the image
    // 3. Send notifications
    // 4. Log the report

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    const response = {
      status: 'success',
      message: 'Report submitted successfully',
      reportId: `REP-${Date.now()}`,
      timestamp: new Date().toISOString(),
      data: {
        location: body.location,
        description: body.description,
        hasPhoto: !!body.photo
      }
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Report submission error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to submit report' 
      }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get reports (for admin/dashboard)
    const response = {
      status: 'success',
      message: 'Reports retrieved successfully',
      count: 0,
      reports: []
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Get reports error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to retrieve reports' 
      }, 
      { status: 500 }
    );
  }
} 