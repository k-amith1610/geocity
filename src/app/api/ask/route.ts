import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// In-memory chat memory (temporary, resets on server restart)
const chatMemory = new Map<string, any[]>();

export async function POST(request: NextRequest) {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ status: 'error', message: 'Missing OpenAI API key' }, { status: 500 });
    }

    const body = await request.json();
    const { query, sessionId = 'default' } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ status: 'error', message: 'Missing or invalid query' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    // Load previous messages for this session
    const previousMessages = chatMemory.get(sessionId) || [];

    const systemPrompt = `
You are a helpful smart city AI assistant. You can help users with:
- General city information and navigation
- Weather and traffic conditions
- Emergency services and safety information
- Public transportation and routes
- City services and utilities

Please provide accurate and helpful information based on your knowledge. If you need real-time data, suggest that the user check the appropriate city services or use the app's real-time features.
`;

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...previousMessages,
      { role: 'user', content: query }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: fullMessages,
      temperature: 0.7
    });

    const assistantReply = completion.choices?.[0]?.message?.content || 'No response generated';

    const updatedMessages = [
      ...previousMessages,
      { role: 'user', content: query },
      { role: 'assistant', content: assistantReply }
    ];

    // Update chat memory
    chatMemory.set(sessionId, updatedMessages);

    return NextResponse.json({
      status: 'success',
      message: 'Response generated successfully',
      data: {
        response: assistantReply,
        sessionId
      }
    });

  } catch (error) {
    console.error('Error generating response:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
