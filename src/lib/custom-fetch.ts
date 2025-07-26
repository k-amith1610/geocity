import { https } from 'https';

// Custom fetch with SSL configuration
export const customFetch = async (url: string, options: RequestInit = {}) => {
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false, // This bypasses SSL certificate verification
    secureProtocol: 'TLSv1_2_method'
  });

  // Use node-fetch or native fetch with custom agent
  const response = await fetch(url, {
    ...options,
    // @ts-ignore - Node.js specific option
    agent: httpsAgent
  });

  return response;
}; 