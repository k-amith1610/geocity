import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/fireBaseConfig';
import { configureSSLForDevelopment } from '@/lib/ssl-utils';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';

// Configure SSL for development
configureSSLForDevelopment();
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';

// User interface for authentication
interface AuthUser {
  name: string;
  email: string;
  password: string;
  address?: string;
  phoneNumber?: number;
  pointsEarned?: number;
  raisedIssues?: number;
}

interface LoginUser {
  email: string;
  password: string;
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

// POST - Register a new user with Firebase Auth
export async function POST(request: NextRequest) {
  try {
    const body: AuthUser = await request.json();

    // Validation
    if (!body.name || !body.email || !body.password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists in Firestore
    const usersRef = collection(db, 'user');
    const q = query(usersRef, where('email', '==', body.email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Create user with Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      body.email,
      body.password
    );

    const firebaseUser = userCredential.user;

    // Update Firebase user profile with display name
    await updateProfile(firebaseUser, {
      displayName: body.name
    });

    // Get ID token for the user
    const token = await firebaseUser.getIdToken();

    // Store additional user data in Firestore
    const userData = {
      name: body.name,
      email: body.email,
      address: body.address || '',
      phoneNumber: body.phoneNumber || 0,
      pointsEarned: body.pointsEarned || 0,
      raisedIssues: body.raisedIssues || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Use Firebase UID as document ID for consistency
    await setDoc(doc(db, 'user', firebaseUser.uid), userData);

    const response: AuthResponse = {
      user: {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        name: body.name,
        address: body.address || '',
        phoneNumber: body.phoneNumber || 0,
        pointsEarned: body.pointsEarned || 0,
        raisedIssues: body.raisedIssues || 0
      },
      token
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error: any) {
    console.error('Error registering user:', error);
    
    // Handle Firebase Auth specific errors
    if (error.code === 'auth/email-already-in-use') {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    } else if (error.code === 'auth/weak-password') {
      return NextResponse.json(
        { error: 'Password should be at least 6 characters' },
        { status: 400 }
      );
    } else if (error.code === 'auth/invalid-email') {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}

// PUT - Login user
export async function PUT(request: NextRequest) {
  try {
    const body: LoginUser = await request.json();

    // Validation
    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Retry mechanism for Firebase auth with better error handling
    let userCredential;
    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Firebase auth attempt ${attempt}/${maxRetries}`);
        
        // Sign in with Firebase Authentication
        userCredential = await signInWithEmailAndPassword(
          auth,
          body.email,
          body.password
        );
        
        // If successful, break out of retry loop
        break;
      } catch (error: any) {
        lastError = error;
        console.error(`Firebase auth attempt ${attempt} failed:`, error.code, error.message);
        
        // Don't retry for certain errors
        if (error.code === 'auth/user-not-found' || 
            error.code === 'auth/wrong-password' || 
            error.code === 'auth/invalid-email' ||
            error.code === 'auth/too-many-requests') {
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If all retries failed
    if (!userCredential) {
      throw lastError;
    }

    const firebaseUser = userCredential.user;

    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'user', firebaseUser.uid));
    
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

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

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error logging in user:', error);
    
    // Log detailed network error information
    if (error.code === 'auth/network-request-failed') {
      console.error('Firebase network error details:', {
        message: error.message,
        customData: error.customData,
        stack: error.stack
      });
      
      return NextResponse.json(
        { error: 'Network error - please check your internet connection and try again' },
        { status: 503 }
      );
    }
    
    // Handle Firebase Auth specific errors
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    } else if (error.code === 'auth/wrong-password') {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    } else if (error.code === 'auth/invalid-email') {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    } else if (error.code === 'auth/too-many-requests') {
      return NextResponse.json(
        { error: 'Too many failed login attempts. Please try again later.' },
        { status: 429 }
      );
    } else if (error.code === 'auth/network-request-failed') {
      console.error('Firebase network error details:', {
        message: error.message,
        customData: error.customData,
        stack: error.stack
      });
      return NextResponse.json(
        { error: 'Network error. Please check your internet connection and try again.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    );
  }
}

// DELETE - Logout user
export async function DELETE(request: NextRequest) {
  try {
    await signOut(auth);
    
    return NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error logging out user:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
} 