import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { tripService } from '../../services/tripService';
import { transformAnswersToDatabase, AnswerSchema } from '../../schemas/trip';

const planInput = z.object({
  prompt: z.string().describe('Trip request, e.g., "7 days Spain -> Portugal -> Morocco, $700 budget"'),
  answers: AnswerSchema.optional().describe('Optional onboarding answers to create a trip'),
  tripId: z.string().uuid().optional().describe('Optional existing trip ID to update'),
});

const planOutput = z.object({
  itinerary: z.string(), // keep as markdown for speed; JSON optional
  tripId: z.string().uuid().optional().describe('ID of the created/updated trip'),
  trip: z.record(z.unknown()).optional().describe('The trip data if saved to database'),
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

    // Optionally save to database if answers or tripId provided
    let tripId: string | undefined;
    let trip: any;

    if (inputData.answers) {
      // Create new trip from answers
      const tripData = transformAnswersToDatabase(inputData.answers);
      trip = await tripService.createTrip(tripData);
      tripId = trip.id;

      // Save the generated itinerary
      trip = await tripService.updateTrip(trip.id, {
        itinerary: { markdown: text, generatedAt: new Date().toISOString() } as any,
      });
    } else if (inputData.tripId) {
      // Update existing trip with itinerary
      tripId = inputData.tripId;
      trip = await tripService.updateTrip(inputData.tripId, {
        itinerary: { markdown: text, generatedAt: new Date().toISOString() } as any,
      });
    }

    return {
      itinerary: text,
      tripId,
      trip,
    };
  },
});

const itineraryWorkflow = createWorkflow({
  id: 'itinerary-workflow',
  inputSchema: planInput,
  outputSchema: planOutput,
}).then(planItinerary);

itineraryWorkflow.commit();

export { itineraryWorkflow };
