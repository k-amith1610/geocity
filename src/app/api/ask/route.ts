import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Mocked city incident data (can later be replaced with Firestore)
const INCIDENTS = [
  {
    id: 1,
    type: 'Traffic Accident',
    location: '5th Avenue & Main St',
    time: '2024-06-01T08:30:00Z',
    status: 'Resolved',
    description: 'Minor collision, no injuries reported.'
  },
  {
    id: 2,
    type: 'Power Outage',
    location: 'Downtown District',
    time: '2024-06-01T09:15:00Z',
    status: 'Ongoing',
    description: 'Widespread outage affecting 200+ homes.'
  },
  {
    id: 3,
    type: 'Water Leak',
    location: 'Maple Street',
    time: '2024-06-01T07:50:00Z',
    status: 'Resolved',
    description: 'Burst pipe repaired by city maintenance.'
  }
];

// Convert incident list to a readable Gemini context string
function formatIncidentData(incidents: typeof INCIDENTS): string {
  return incidents.map(incident => {
    return `- [${incident.type}] at ${incident.location} (${incident.status}): ${incident.description}`;
  }).join('\n');
}

// Gemini config
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ status: 'error', message: 'Missing Gemini API key.' }, { status: 500 });
    }

    const body = await request.json();
    const userQuery = body.query;

    if (!userQuery || typeof userQuery !== 'string') {
      return NextResponse.json({ status: 'error', message: 'Missing or invalid "query" in request.' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const incidentSummary = formatIncidentData(INCIDENTS);
    const prompt = `
You are a smart city AI assistant. Help users understand real-time incidents based on the data provided.

Incident Data (as of June 1, 2024):
${incidentSummary}

User question: "${userQuery}"

Respond concisely with relevant incident insights.
`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE }
      ]
    });

    const answer = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || 'No answer generated.';
    return NextResponse.json({
      status: 'success',
      answer,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Gemini Q&A error:', error?.message || error);
    return NextResponse.json({ status: 'error', message: 'Internal server error.' }, { status: 500 });
  }
}
