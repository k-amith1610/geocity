import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Test API endpoint
    const response = {
      status: 'success',
      message: 'GEOCITY API is running successfully!',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Internal server error' 
      }, 
      { status: 500 }
    );
  }
} 