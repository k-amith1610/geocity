'use server';

import { analyzeReportImage, type AnalyzeImageOutput } from '@/ai/flows/analyze-report-image-flow';
import { verifyImage, type VerifyImageOutput } from '@/ai/flows/verify-image-flow';

// Server action for image analysis that the frontend component will call
export async function analyzeReportImageAction(
  imageDataUri: string,
): Promise<{ data: AnalyzeImageOutput | null; error: string | null }> {
  try {
    // The action calls the Genkit flow with the provided image
    const result = await analyzeReportImage({ 
      imageDataUri 
    });
    return { data: result, error: null };
  } catch (error) {
    // Handle errors gracefully
    console.error('Error analyzing report image:', error);
    return { 
      data: null, 
      error: 'Failed to analyze image. Please try again.' 
    };
  }
}

// Server action for image verification (following documentation pattern)
export async function verifyImageAction(
  imageDataUri: string,
): Promise<{ data: VerifyImageOutput | null; error: string | null }> {
  try {
    // The action calls the Genkit flow with the provided image
    const result = await verifyImage({ 
      imageDataUri 
    });
    return { data: result, error: null };
  } catch (error) {
    // Handle errors gracefully
    console.error('Error verifying image:', error);
    return { 
      data: null, 
      error: 'Failed to verify image. Please try again.' 
    };
  }
} 