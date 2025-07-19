import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// In-memory chat memory (temporary, resets on server restart)
const chatMemory = new Map<string, any[]>();

// Static city incident data (can be fetched from Firestore later)
const INCIDENTS = [
  {
    id: 1,
    type: 'Traffic Jam',
    location: 'Banjara Hills Road No. 12',
    time: '2025-07-19T08:15:00Z',
    status: 'Ongoing',
    description: 'Heavy congestion due to stalled vehicle and peak hour rush.'
  },
  {
    id: 2,
    type: 'Power Outage',
    location: 'Madhapur Tech Hub',
    time: '2025-07-19T06:45:00Z',
    status: 'Ongoing',
    description: 'Transformer issue affecting major IT offices and residential blocks.'
  },
  {
    id: 3,
    type: 'Flooding',
    location: 'Begumpet underpass',
    time: '2025-07-18T22:30:00Z',
    status: 'Resolved',
    description: 'Waterlogged after overnight rains. Drained and reopened by GHMC.'
  },
  {
    id: 4,
    type: 'Fire Accident',
    location: 'Kukatpally Industrial Area',
    time: '2025-07-18T20:10:00Z',
    status: 'Resolved',
    description: 'Short circuit led to fire in a warehouse. No casualties reported.'
  },
  {
    id: 5,
    type: 'Water Supply Disruption',
    location: 'Secunderabad Cantonment',
    time: '2025-07-19T04:00:00Z',
    status: 'Ongoing',
    description: 'Pipeline maintenance causing low pressure in nearby areas.'
  }
];


// Format incidents for prompt
function formatIncidentData() {
  return INCIDENTS.map(i =>
    `- [${i.type}] at ${i.location} (${i.status}): ${i.description}`
  ).join('\n');
}

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
You are a helpful smart city AI assistant.
Use the incident data below to answer questions.

City Incident Data (as of June 1, 2024):
${formatIncidentData()}
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

    // Save updated memory
    chatMemory.set(sessionId, updatedMessages);

    return NextResponse.json({
      status: 'success',
      answer: assistantReply,
      messages: updatedMessages,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('OpenAI chat error:', error?.message || error);
    return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
  }
}
