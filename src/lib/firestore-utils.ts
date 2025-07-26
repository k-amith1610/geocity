/**
 * Firestore Utilities for handling offline warnings and connection issues
 */

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