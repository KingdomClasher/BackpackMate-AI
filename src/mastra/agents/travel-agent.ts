import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import {
  routeSearchTool,
  hostelSuggestTool,
  visaCheckTool,
  notesSearchTool,
} from '../tools/travel-tools';

export const travelAgent = new Agent({
  name: 'BackpackMate Agent',
  instructions: `
You are BackpackMate — an assistant for multi-country backpacking.
- Produce concise, actionable answers grounded in tools.
- When asked about routes, hostels, visas, or tips, CALL THE TOOLS.
- If unsure, say so and suggest how to verify.
- Prefer budgets for student travelers.
- When planning, structure days with city, 2–3 activities, and rough costs.
  `,
  model: openai('gpt-4o-mini'),
  tools: { routeSearchTool, hostelSuggestTool, visaCheckTool, notesSearchTool },
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // same as scaffold
    }),
  }),
});
