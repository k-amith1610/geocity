import { NextRequest, NextResponse } from 'next/server';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';

// Configure custom fetch for Google AI API calls
if (typeof window === 'undefined') {
  const https = require('https');
  const nodeFetch = require('node-fetch').default;
  
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false
  });
  
  // Override fetch only for this module
  global.fetch = (url, options = {}) => {
    return nodeFetch(url, {
      ...options,
      agent: httpsAgent
    });
  };
}

// Initialize Genkit with Google AI
const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY!,
    }),
  ],
});

// AI Keywords Generation Prompt
const keywordsGenerationPrompt = ai.definePrompt({
  name: 'routeKeywordsGenerator',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: z.object({
    origin: z.string(),
    destination: z.string(),
  })},
  output: { schema: z.object({
    routes: z.array(z.string()),
    keywords: z.array(z.string()),
    maxPosts: z.number(),
  })},
  prompt: `You are an expert in route planning and social media analysis. Given a route from origin to destination, generate relevant keywords and route names for scraping social media data about traffic, incidents, and road conditions.

Origin: {{{origin}}}
Destination: {{{destination}}}

IMPORTANT INSTRUCTIONS:
1. For routes: Extract ONLY the main city/area names (not full addresses)
   - Example: "Hyderabad, Telangana 500081, India" → ["Hyderabad"]
   - Example: "Madhapur, HITEC City, Hyderabad" → ["Madhapur", "Hyderabad"]
   - Example: "Bandlaguda Jagir, Telangana" → ["Bandlaguda Jagir"]
   - Keep only the primary location names, not postal codes or full addresses

2. For keywords: Generate traffic and road condition related keywords
   - Focus on: traffic, accidents, roadblocks, construction, road closures
   - Include: fire accidents, vehicle breakdowns, weather impacts on roads
   - Use specific terms like: "traffic jam", "road accident", "construction work", "road closure"

3. maxPosts: Always return 10

Generate:
1. Routes array: Only city/area names from both origin and destination
2. Keywords array: Traffic and road condition related terms
3. maxPosts: Fixed at 10

Focus on keywords that would help identify:
- Traffic congestion and jams
- Road accidents and collisions
- Construction work and road maintenance
- Road closures and diversions
- Weather-related road issues
- Fire accidents and emergencies
- Vehicle breakdowns
- Public transport disruptions

Return only the JSON response with routes, keywords, and maxPosts.`
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { origin, destination } = body;

    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Origin and destination are required' },
        { status: 400 }
      );
    }

    // Generate keywords using AI
    const result = await keywordsGenerationPrompt({
      origin,
      destination,
    });

    if (!result.output) {
      throw new Error('No output from AI keywords generation');
    }

    const response = {
      success: true,
      data: result.output,
      timestamp: new Date().toISOString(),
      aiGenerated: true,
      model: 'Vertex AI Gemini 1.5 Flash',
      framework: 'Genkit AI Framework'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in AI keywords generation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate keywords',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testOrigin = searchParams.get('origin') || 'Hyderabad, India';
    const testDestination = searchParams.get('destination') || 'Mumbai, India';
    
    // Use the same logic as POST
    const result = await keywordsGenerationPrompt({
      origin: testOrigin,
      destination: testDestination,
    });

    if (!result.output) {
      throw new Error('No output from AI keywords generation');
    }

    const response = {
      success: true,
      test: true,
      data: result.output,
      timestamp: new Date().toISOString(),
      aiGenerated: true,
      model: 'Vertex AI Gemini 1.5 Flash',
      framework: 'Genkit AI Framework'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in AI keywords GET API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate keywords',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 