// Import the functions you need from the SDKs you need
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { getDatabase, Database } from "firebase/database";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let realtimeDb: Database;

try {
  // Validate Firebase config
  const requiredKeys = [
    'apiKey',
    'authDomain', 
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
    'databaseURL'
  ];
  
  const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);
  if (missingKeys.length > 0) {
    console.error('Missing Firebase configuration keys:', missingKeys);
    throw new Error('Incomplete Firebase configuration');
  }

  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  realtimeDb = getDatabase(app);
  
  console.log('Firebase initialized successfully');
  console.log('Firestore Database:', db);
  console.log('Realtime Database:', realtimeDb);
  console.log('Authentication:', auth);
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}

export { db, auth, realtimeDb };