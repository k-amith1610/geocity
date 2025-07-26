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

**Style Requirements:**l
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
    console.log('🔍 Starting image analysis...');
    
    // Step 1: Verify image authenticity
    const verificationResult = await verifyImage(input);
    console.log('✅ Image verification completed:', verificationResult.authenticity);

    // Step 2: Analyze content and emergency level
    const contentResult = await contentAnalysisPrompt({
      imageDataUri: input.imageDataUri,
    });
    console.log('✅ Content analysis completed:', {
      emergencyLevel: contentResult.output?.emergencyLevel,
      category: contentResult.output?.category
    });

    // Step 3: Generate human-readable description
    const humanReadableResult = await humanReadablePrompt({
      technicalDescription: contentResult.output?.description || 'Image content analysis',
      emergencyLevel: contentResult.output?.emergencyLevel || 'NONE',
      category: contentResult.output?.category || 'SAFE',
    });
    console.log('✅ Human-readable description generated');

    // Combine all results
    const result: AnalyzeImageOutput = {
      authenticity: verificationResult.authenticity,
      description: contentResult.output?.description || 'Unable to analyze image content',
      humanReadableDescription: humanReadableResult.output?.humanReadableDescription || 'Image analysis unavailable',
      emergencyLevel: contentResult.output?.emergencyLevel || 'NONE',
      category: contentResult.output?.category || 'SAFE',
      reasoning: verificationResult.reasoning,
      confidence: verificationResult.confidence,
    };

    console.log('🎉 Image analysis completed successfully');
    return result;

  } catch (error) {
    console.error('❌ Error in image analysis:', error);
    
    // Return a comprehensive fallback response
    return {
      authenticity: 'UNCERTAIN',
      description: 'Unable to analyze image due to technical issues. Please review manually.',
      humanReadableDescription: 'Image analysis service is temporarily unavailable. The report has been submitted for manual review.',
      emergencyLevel: 'NONE',
      category: 'SAFE',
      reasoning: 'Analysis failed due to technical issues with the AI service.',
      confidence: 0,
    };
  }
} 