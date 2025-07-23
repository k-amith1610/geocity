import { z } from 'zod';
import { ai } from '../genkit';
import { verifyImage, type VerifyImageOutput } from './verify-image-flow';

// Input schema for the image analysis
const AnalyzeImageInputSchema = z.object({
  imageDataUri: z.string().describe('Base64 encoded image data URI'),
});

// Output schema for the image analysis
const AnalyzeImageOutputSchema = z.object({
  authenticity: z.enum(['REAL', 'AI_GENERATED', 'UNCERTAIN']).describe('Assessment of image authenticity'),
  description: z.string().describe('Professional description of what is happening in the image'),
  humanReadableDescription: z.string().describe('Human-readable news report style description of the incident'),
  emergencyLevel: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).describe('Emergency level assessment'),
  category: z.enum(['SAFE', 'WARNING', 'DANGER']).describe('Category classification'),
  reasoning: z.string().describe('Brief explanation for the authenticity assessment'),
  confidence: z.number().min(0).max(100).describe('Confidence level in the assessment (0-100)'),
});

export type AnalyzeImageInput = z.infer<typeof AnalyzeImageInputSchema>;
export type AnalyzeImageOutput = z.infer<typeof AnalyzeImageOutputSchema>;

// The prompt for content analysis and emergency assessment
const contentAnalysisPrompt = ai.definePrompt({
  name: 'contentAnalysis',
  input: { schema: z.object({ imageDataUri: z.string() }) },
  output: { 
    schema: z.object({
      description: z.string().describe('Professional description of what is happening in the image'),
      emergencyLevel: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).describe('Emergency level assessment'),
      category: z.enum(['SAFE', 'WARNING', 'DANGER']).describe('Category classification'),
    })
  },
  prompt: `You are an expert emergency assessment specialist. Your task is to analyze the content of the provided image for a citizen report system.

**Content Analysis Tasks:**
1. **Content Description**: Provide a professional, detailed description of what is happening in the image
2. **Emergency Assessment**: Evaluate if the content represents an emergency situation
3. **Category Classification**: Classify the content as safe, warning, or danger

**Emergency Assessment Guidelines:**
- **CRITICAL**: Life-threatening situations, fires, serious accidents, crimes in progress, medical emergencies requiring immediate response
- **HIGH**: Dangerous conditions, accidents, medical emergencies, structural damage, hazardous materials
- **MEDIUM**: Minor incidents, safety hazards, infrastructure issues, traffic problems
- **LOW**: Minor problems, maintenance issues, general concerns, non-urgent repairs
- **NONE**: Safe conditions, positive news, general information, routine activities

**Category Guidelines:**
- **DANGER**: Immediate threats, safety hazards, emergency situations requiring immediate attention
- **WARNING**: Potential risks, minor hazards, attention needed but not urgent
- **SAFE**: No immediate concerns, positive information, general updates, routine activities

**Analysis Focus:**
- Identify the main subject or event in the image
- Assess the severity and urgency of the situation
- Consider the potential impact on public safety
- Evaluate if immediate action is required

Photo: {{media url=imageDataUri}}

Provide your analysis focusing on the content and emergency assessment.`,
});

// The prompt for converting technical description to human-readable news format
const humanReadablePrompt = ai.definePrompt({
  name: 'humanReadableDescription',
  input: { 
    schema: z.object({ 
      technicalDescription: z.string().describe('Technical description of the image content'),
      emergencyLevel: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).describe('Emergency level of the incident'),
      category: z.enum(['SAFE', 'WARNING', 'DANGER']).describe('Category of the incident')
    }) 
  },
  output: { 
    schema: z.object({
      humanReadableDescription: z.string().describe('Human-readable news report style description')
    })
  },
  prompt: `You are an expert journalist and news writer. Your task is to convert a technical incident description into a clear, human-readable news report format.

**Writing Guidelines:**
- Write in a clear, professional news report style
- Use active voice and present tense
- Make it engaging and easy to understand for the general public
- Include relevant details about the incident, location, and potential impact
- Maintain accuracy while making it accessible
- Keep it concise but informative (2-3 sentences)
- Avoid technical jargon unless necessary

**Style Requirements:**
- Start with the main incident/event
- Include key details about what happened
- Mention any visible damage, injuries, or hazards
- Add context about the situation if relevant
- End with any immediate implications or concerns

**Input:**
Technical Description: {{technicalDescription}}
Emergency Level: {{emergencyLevel}}
Category: {{category}}

Convert this into a human-readable news report style description that citizens can easily understand.`,
});

export async function analyzeReportImage(input: AnalyzeImageInput): Promise<AnalyzeImageOutput> {
  try {
    // Step 1: Verify image authenticity using the dedicated verification flow
    const verificationResult: VerifyImageOutput = await verifyImage({ imageDataUri: input.imageDataUri });
    
    // Step 2: Analyze content and emergency level
    const { output: contentAnalysis } = await contentAnalysisPrompt({ imageDataUri: input.imageDataUri });
    
    if (!contentAnalysis) {
      throw new Error('No output from content analysis');
    }
    
    // Step 3: Convert technical description to human-readable news format
    const { output: humanReadableResult } = await humanReadablePrompt({
      technicalDescription: contentAnalysis.description,
      emergencyLevel: contentAnalysis.emergencyLevel,
      category: contentAnalysis.category
    });
    
    if (!humanReadableResult) {
      throw new Error('No output from human-readable conversion');
    }
    
    // Combine the results
    const result: AnalyzeImageOutput = {
      authenticity: verificationResult.authenticity,
      description: contentAnalysis.description,
      humanReadableDescription: humanReadableResult.humanReadableDescription,
      emergencyLevel: contentAnalysis.emergencyLevel,
      category: contentAnalysis.category,
      reasoning: verificationResult.reasoning,
      confidence: verificationResult.confidence,
    };
    
    return result;
  } catch (error) {
    console.error('Error in image analysis:', error);
    
    // Return a fallback response if AI analysis fails
    return {
      authenticity: 'UNCERTAIN',
      description: 'Image analysis could not be completed. Please ensure the image is clear, properly uploaded, and try again.',
      humanReadableDescription: 'Unable to generate a readable report. Please try again with a clearer image.',
      emergencyLevel: 'NONE',
      category: 'SAFE',
      reasoning: 'Analysis failed due to technical issues. Please try again with a different image or check your connection.',
      confidence: 0,
    };
  }
} 