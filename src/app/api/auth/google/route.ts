import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/fireBaseConfig';
import { configureSSLForDevelopment } from '@/lib/ssl-utils';
import { 
  signInWithCredential,
  GoogleAuthProvider,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';

// Configure SSL for development
configureSSLForDevelopment();

interface GoogleAuthRequest {
  idToken: string;
}

interface AuthResponse {
  user: {
    uid: string;
    email: string;
    name?: string;
    address?: string;
    phoneNumber?: number;
    pointsEarned?: number;
    raisedIssues?: number;
  };
  token?: string;
}

// POST - Google Authentication
export async function POST(request: NextRequest) {
  try {
    const body: GoogleAuthRequest = await request.json();

    // Validation
    if (!body.idToken) {
      return NextResponse.json(
        { error: 'Google ID token is required' },
        { status: 400 }
      );
    }

    // Create credential from Google ID token
    const credential = GoogleAuthProvider.credential(body.idToken);
    
    // Sign in with credential
    const userCredential = await signInWithCredential(auth, credential);
    const firebaseUser = userCredential.user;

    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'user', firebaseUser.uid));
    
    let userData;
    let isNewUser = false;

    if (!userDoc.exists()) {
      // New user - create user data in Firestore
      isNewUser = true;
      userData = {
        name: firebaseUser.displayName || 'User',
        email: firebaseUser.email!,
        address: '',
        phoneNumber: 0,
        pointsEarned: 0,
        raisedIssues: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: 'google'
      };

      // Store user data in Firestore
      await setDoc(doc(db, 'user', firebaseUser.uid), userData);
    } else {
      // Existing user - get data from Firestore
      userData = userDoc.data();
      
      // Update last login time
      await setDoc(doc(db, 'user', firebaseUser.uid), {
        ...userData,
        updatedAt: new Date(),
        lastLoginAt: new Date()
      }, { merge: true });
    }

    // Get ID token for the user
    const token = await firebaseUser.getIdToken();

    const response: AuthResponse = {
      user: {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        name: userData.name,
        address: userData.address,
        phoneNumber: userData.phoneNumber,
        pointsEarned: userData.pointsEarned,
        raisedIssues: userData.raisedIssues
      },
      token
    };

    return NextResponse.json(response, { 
      status: isNewUser ? 201 : 200 
    });

  } catch (error: any) {
    console.error('Error with Google authentication:', error);
    
    // Handle Firebase Auth specific errors
    if (error.code === 'auth/invalid-credential') {
      return NextResponse.json(
        { error: 'Invalid Google credentials' },
        { status: 401 }
      );
    } else if (error.code === 'auth/account-exists-with-different-credential') {
      return NextResponse.json(
        { error: 'An account already exists with the same email address but different sign-in credentials' },
        { status: 409 }
      );
    } else if (error.code === 'auth/network-request-failed') {
      return NextResponse.json(
        { error: 'Network error - please check your internet connection and try again' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Google authentication failed' },
      { status: 500 }
    );
  }
} 