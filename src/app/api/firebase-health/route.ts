import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/fireBaseConfig';

export async function GET(request: NextRequest) {
  try {
    // Test Firebase Auth connectivity
    const authTest = await auth.authStateReady();
    
    // Test Firestore connectivity
    const firestoreTest = await db.app.options;
    
    return NextResponse.json({
      status: 'healthy',
      firebase: {
        auth: 'connected',
        firestore: 'connected',
        projectId: firestoreTest.projectId
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Firebase health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 