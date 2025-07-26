import { NextRequest, NextResponse } from 'next/server';
import { updateExistingReportsWithCoordinates } from '@/lib/firestore-utils';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting coordinates migration...');
    
    const result = await updateExistingReportsWithCoordinates();
    
    console.log('✅ Migration completed successfully:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Coordinates migration completed successfully',
      data: result,
      timestamp: new Date().toISOString()
    }, { status: 200 });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      code: error instanceof Error ? (error as any).code : 'unknown'
    });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to migrate coordinates',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Migration failed. Please check the server logs for details.',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Coordinates migration API is operational',
    endpoint: '/api/migrate-coordinates',
    method: 'POST',
    description: 'Migrate existing reports to include coordinates for better map performance',
    timestamp: new Date().toISOString()
  });
} 