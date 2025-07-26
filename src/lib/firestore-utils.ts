/**
 * Firestore Utilities for handling offline warnings and connection issues
 */

import { db } from './fireBaseConfig';
import { collection, getDocs, updateDoc, doc, query, where, Firestore } from 'firebase/firestore';

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Configure Firestore to handle offline warnings gracefully
 */
export function configureFirestoreOfflineHandling(): void {
  if (!isDevelopment) {
    return;
  }

  // Add global error handler for Firestore offline warnings
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      if (event.error && event.error.message && 
          event.error.message.includes('Firestore') && 
          event.error.message.includes('offline')) {
        console.warn('Firestore offline warning suppressed in development');
        event.preventDefault();
      }
    });
  }
}

/**
 * Retry function for Firestore operations
 */
export async function retryFirestoreOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (error instanceof Error && 
          (error.message.includes('offline') || 
           error.message.includes('network') ||
           error.message.includes('timeout'))) {
        
        console.warn(`Firestore operation failed (attempt ${attempt}/${maxRetries}):`, error.message);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
          continue;
        }
      }
      
      // If it's not a network/offline error, don't retry
      throw error;
    }
  }
  
  throw lastError!;
}

/**
 * Initialize Firestore with offline handling
 */
export function initializeFirestoreWithOfflineHandling(): void {
  if (isDevelopment) {
    configureFirestoreOfflineHandling();
    console.log('Firestore offline handling configured for development');
  }
} 

// Function to geocode location string to coordinates
export async function geocodeLocation(locationString: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // Use Google Maps Geocoding API
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ Google Maps API key not found, skipping geocoding');
      return null;
    }

    console.log(`📍 Starting geocoding for location: "${locationString}"`);
    
    const encodedLocation = encodeURIComponent(locationString);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedLocation}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      const coordinates = { lat, lng };
      console.log(`✅ Successfully geocoded "${locationString}" to coordinates:`, coordinates);
      return coordinates;
    } else {
      console.warn(`⚠️ Geocoding failed for "${locationString}": ${data.status} - ${data.error_message || 'Unknown error'}`);
      
      // Try with region bias for India
      if (data.status === 'ZERO_RESULTS') {
        console.log(`🔄 Retrying geocoding with India region bias for: "${locationString}"`);
        const retryUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedLocation}&region=in&key=${apiKey}`;
        const retryResponse = await fetch(retryUrl);
        const retryData = await retryResponse.json();
        
        if (retryData.status === 'OK' && retryData.results && retryData.results.length > 0) {
          const { lat, lng } = retryData.results[0].geometry.location;
          const coordinates = { lat, lng };
          console.log(`✅ Successfully geocoded with region bias "${locationString}" to coordinates:`, coordinates);
          return coordinates;
        }
      }
      
      return null;
    }
  } catch (error) {
    console.error('❌ Geocoding error:', error);
    return null;
  }
}

// Function to update existing reports with coordinates
export async function updateExistingReportsWithCoordinates() {
  try {
    console.log('🔄 Starting migration to add coordinates to existing reports...');
    
    const reportsRef = collection(db, 'raised-issue');
    const q = query(reportsRef, where('coordinates', '==', undefined));
    const snapshot = await getDocs(q);
    
    console.log(`📋 Found ${snapshot.docs.length} reports without coordinates`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const docSnapshot of snapshot.docs) {
      try {
        const reportData = docSnapshot.data();
        const location = reportData.location;
        
        if (location && typeof location === 'string') {
          console.log(`📍 Processing report ${docSnapshot.id} with location: "${location}"`);
          
          const coordinates = await geocodeLocation(location);
          
          if (coordinates) {
            await updateDoc(doc(db, 'raised-issue', docSnapshot.id), {
              coordinates: {
                lat: coordinates.lat,
                lng: coordinates.lng,
                address: location
              }
            });
            
            console.log(`✅ Updated report ${docSnapshot.id} with coordinates`);
            updatedCount++;
            
            // Add a small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          } else {
            console.warn(`⚠️ Could not geocode location for report ${docSnapshot.id}: "${location}"`);
            errorCount++;
          }
        } else {
          console.warn(`⚠️ Report ${docSnapshot.id} has invalid location:`, location);
          errorCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating report ${docSnapshot.id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`✅ Migration completed: ${updatedCount} reports updated, ${errorCount} errors`);
    return { updatedCount, errorCount };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Function to get coordinates for a single report
export async function getCoordinatesForReport(reportId: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const reportDoc = await getDocs(query(collection(db, 'raised-issue'), where('__name__', '==', reportId)));
    
    if (!reportDoc.empty) {
      const reportData = reportDoc.docs[0].data();
      const location = reportData.location;
      
      if (location && typeof location === 'string') {
        return await geocodeLocation(location);
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting coordinates for report:', error);
    return null;
  }
} 