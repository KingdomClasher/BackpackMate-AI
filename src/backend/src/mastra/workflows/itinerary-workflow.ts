import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const planInput = z.object({
  prompt: z.string().describe('Trip request, e.g., "7 days Spain -> Portugal -> Morocco, $700 budget"'),
});

const planOutput = z.object({
  itinerary: z.string(), // keep as markdown for speed; JSON optional
});

const planItinerary = createStep({
  id: 'plan-itinerary',
  description: 'Creates a simple backpacking plan with daily activities and rough budget.',
  inputSchema: planInput,
  outputSchema: planOutput,
  execute: async ({ inputData, mastra }) => {
    if (!inputData) throw new Error('Missing input');

    const agent = mastra?.getAgent('travelAgent');
    if (!agent) throw new Error('Travel agent not found');

    const prompt = `
You are BackpackMate. Plan an itinerary from the user prompt below.
Constraints: student budget, public transport, 2-3 activities per day, show rough budget split (lodging/transport/food).
Use tools when needed and cite any notes you used.

USER PROMPT:
${inputData.prompt}

FORMAT (markdown):
# Itinerary
- Total budget: $X (Lodging: $A, Transport: $B, Food: $C)

## Day 1 — [City]
- Morning: ...
- Afternoon: ...
- Evening: ...
- Notes: ...

## Day 2 — ...
(keep concise)
`;

    const stream = await agent.stream([{ role: 'user', content: prompt }]);

    let text = '';
    for await (const chunk of stream.textStream) {
      process.stdout.write(chunk);
      text += chunk;
    }
    return { itinerary: text };
  },
});

const itineraryWorkflow = createWorkflow({
  id: 'itinerary-workflow',
  inputSchema: planInput,
  outputSchema: planOutput,
}).then(planItinerary);

itineraryWorkflow.commit();

export { itineraryWorkflow };
