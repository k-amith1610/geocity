import { NextRequest, NextResponse } from 'next/server';
import fetch from 'node-fetch';
import https from 'https';

export async function GET(request: NextRequest) {
  try {
    // Create HTTPS agent that ignores SSL certificate issues
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });

    // Test basic network connectivity with SSL bypass
    const testResponse = await fetch('https://httpbin.org/get', {
      agent: httpsAgent
    });
    const testData = await testResponse.json();
    
    return NextResponse.json({
      status: 'success',
      network: 'working',
      testData: testData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Network test failed:', error);
    
    return NextResponse.json({
      status: 'failed',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 