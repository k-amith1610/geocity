import { NextRequest, NextResponse } from 'next/server';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { vertexAI } from '@genkit-ai/vertexai';
import { z } from 'zod';

// Initialize Genkit with Google AI and Vertex AI
const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY!,
    }),
    vertexAI({
      projectId: process.env.GOOGLE_CLOUD_PROJECT!,
      location: 'us-central1',
    }),
  ],
});

// AI Chat prompt for context-aware responses
const aiChatPrompt = ai.definePrompt({
  name: 'aiChatAssistant',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: z.object({
    userMessage: z.string(),
    contextType: z.enum(['weather', 'social']),
    contextData: z.any()
  })},
  output: { schema: z.object({
    response: z.string()
  })},
  prompt: `You are an intelligent AI assistant helping users understand route and location data. You have access to specific data and should provide helpful, accurate responses based on that data.

Context Type: {{{contextType}}}
User Question: {{{userMessage}}}

Available Data:
{{{contextData}}}

Instructions:
1. Analyze the user's question carefully
2. Use ONLY the provided data to answer - don't make assumptions
3. If the data doesn't contain information needed to answer, say so clearly
4. Provide actionable insights and recommendations when possible
5. Be professional, helpful, and concise
6. For weather data: focus on environmental risks, health advisories, and travel recommendations
7. For social media data: focus on traffic patterns, incidents, and community insights

Respond in a helpful, conversational tone while being informative and accurate.`
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context } = body;

    if (!message || !context) {
      return NextResponse.json(
        { error: 'Message and context are required' },
        { status: 400 }
      );
    }

    console.log('Processing AI chat request:', { message, contextType: context.type });

    try {
      // Generate AI response with context
      const result = await aiChatPrompt({
        userMessage: message,
        contextType: context.type,
        contextData: JSON.stringify(context.data, null, 2)
      });

      if (!result.output) {
        throw new Error('No response from AI chat');
      }

      return NextResponse.json({
        response: result.output.response,
        timestamp: new Date().toISOString()
      });

    } catch (aiError) {
      console.error('AI chat failed:', aiError);
      
      // Check if it's a quota error
      const isQuotaError = aiError instanceof Error && 
        (aiError.message.includes('429') || 
         aiError.message.includes('quota') || 
         aiError.message.includes('Too Many Requests'));
      
      if (isQuotaError) {
        return NextResponse.json(
          { 
            error: 'AI chat temporarily unavailable',
            details: 'API quota exceeded. Please try again later.',
            response: 'I apologize, but I\'m temporarily unable to process your request due to high usage. Please try again in a few minutes.',
            timestamp: new Date().toISOString()
          },
          { status: 429 }
        );
      }
      
      // For other AI errors, return a generic error
      return NextResponse.json(
        { 
          error: 'Failed to process chat request',
          details: 'Unable to generate response at this time.',
          response: 'I apologize, but I\'m having trouble processing your request right now. Please try again later.',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in AI chat API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error',
        response: 'I apologize, but there was an error processing your request. Please try again.',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 