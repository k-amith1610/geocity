import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { vertexAI } from '@genkit-ai/vertexai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY!,
    }),
    vertexAI({
      projectId: process.env.GOOGLE_CLOUD_PROJECT!,
      location: 'us-central1',
    }),
  ],
  // Sets a default model for any simple `ai.generate()` calls.
  model: 'googleai/gemini-1.5-flash',
}); 