/**
 * SSL Certificate Utilities for Development
 * 
 * This module provides utilities to bypass SSL certificate validation
 * in development mode only. This should NEVER be used in production.
 */

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Configure SSL certificate bypass for development
 * This disables TLS certificate validation for external API calls
 */
export function configureSSLForDevelopment(): void {
  if (!isDevelopment) {
    console.log('SSL bypass disabled - not in development mode');
    return;
  }

  try {
    // Direct environment variable (most reliable)
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    console.log('SSL bypass configured using NODE_TLS_REJECT_UNAUTHORIZED');

    console.warn('⚠️  SSL certificate validation disabled for development');
    console.warn('⚠️  This should NEVER be used in production');
  } catch (error) {
    console.error('Failed to configure SSL bypass:', error);
  }
}

/**
 * Create a fetch wrapper that handles SSL issues in development
 */
export function createSecureFetch(): typeof fetch {
  if (!isDevelopment) {
    return fetch;
  }

  // Configure SSL bypass
  configureSSLForDevelopment();

  // Return a wrapped fetch that includes additional error handling
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      const response = await fetch(input, init);
      return response;
    } catch (error) {
      if (error instanceof Error && error.message.includes('certificate')) {
        console.warn('SSL certificate error detected, retrying with bypass...');
        // Force SSL bypass and retry
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
        return fetch(input, init);
      }
      throw error;
    }
  };
}

/**
 * Reset SSL configuration to secure defaults
 * Call this when switching to production
 */
export function resetSSLConfiguration(): void {
  if (isDevelopment) {
    delete process.env['NODE_TLS_REJECT_UNAUTHORIZED'];
    console.log('SSL configuration reset to secure defaults');
  }
}

/**
 * Check if SSL bypass is currently active
 */
export function isSSLBypassActive(): boolean {
  return isDevelopment && process.env['NODE_TLS_REJECT_UNAUTHORIZED'] === '0';
} 