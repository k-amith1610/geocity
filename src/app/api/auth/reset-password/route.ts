import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/fireBaseConfig';
import { sendPasswordResetEmail } from 'firebase/auth';

// POST - Send password reset email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validation
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Send password reset email using Firebase Auth
    await sendPasswordResetEmail(auth, email);

    return NextResponse.json(
      { message: 'Password reset email sent successfully' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Error sending password reset email:', error);
    
    // Handle Firebase Auth specific errors
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'No user found with this email address' },
        { status: 404 }
      );
    } else if (error.code === 'auth/invalid-email') {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    } else if (error.code === 'auth/too-many-requests') {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send password reset email' },
      { status: 500 }
    );
  }
} 