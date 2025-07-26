import { NextRequest, NextResponse } from 'next/server';

interface SimpleLoginRequest {
  email: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SimpleLoginRequest = await request.json();

    // Simple validation
    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // For testing purposes, accept any email/password combination
    // In production, this would validate against a database
    if (body.email && body.password) {
      return NextResponse.json({
        success: true,
        user: {
          uid: 'test-user-id',
          email: body.email,
          name: 'Test User',
          message: 'This is a test authentication bypassing Firebase'
        },
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );

  } catch (error: any) {
    console.error('Simple auth error:', error);
    
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
} 