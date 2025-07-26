import { NextRequest, NextResponse } from 'next/server';

// Cron job trigger for emergency monitoring
export async function GET(request: NextRequest) {
  try {
    console.log('⏰ Cron job triggered for emergency monitoring...');
    
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';

    // Call the emergency monitor endpoint
    const response = await fetch(`${baseUrl}/api/emergency-monitor`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✅ Cron job executed successfully');
      return NextResponse.json({
        success: true,
        message: 'Cron job executed successfully',
        emergencyMonitorResult: result,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ Cron job failed:', result.error);
      return NextResponse.json({
        success: false,
        error: 'Cron job failed',
        details: result.error,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Cron job error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Cron job error',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST endpoint for manual trigger
export async function POST(request: NextRequest) {
  return GET(request);
} 