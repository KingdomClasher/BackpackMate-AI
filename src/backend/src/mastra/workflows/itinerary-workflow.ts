import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { tripService } from '../../services/tripService';
import {
  transformAnswersToDatabase,
  AnswerSchema,
  ProposedItinerarySchema,
  TasksSchema,
  ItineraryDaySchema,
  ItineraryItemSchema,
  DEFAULT_GENERAL_TASKS,
  Answers
} from '../../schemas/trip';

// Utility function to create AI prompt from user answers
const createPromptFromAnswers = (answers: Answers): string => {
  const destinations = answers.destinations.join(', ');
  const budget = `${answers.currency} ${answers.budget}`;
  const transportation = answers.transportation.length > 0 ? answers.transportation.join(', ') : 'flexible';
  const activities = answers.things_to_do.length > 0 ? answers.things_to_do.join(', ') : 'general sightseeing';
  const foodPrefs = answers.food_dietary.length > 0 ? answers.food_dietary.join(', ') : 'no restrictions';
  const purpose = answers.purpose_of_trip.length > 0 ? answers.purpose_of_trip.join(', ') : 'leisure';

  return `Create a detailed travel itinerary for a ${purpose} trip with the following details:

TRIP DETAILS:
- Destinations: ${destinations}
- Travel dates: ${answers.dates}
- Budget: ${budget}
- Starting point: ${answers.starting_point || 'Not specified'}
- End point: ${answers.end_point || 'Same as start'}
- Flexible dates: ${answers.flexible_dates ? 'Yes' : 'No'}
- Preferred transportation: ${transportation}
- Interests/Activities: ${activities}
- Food preferences/dietary restrictions: ${foodPrefs}
- Traveler citizenship: ${answers.citizenship}

REQUIREMENTS:
- Create a day-by-day itinerary with 2-3 activities per day
- Include morning, afternoon, and evening activities
- Provide realistic time estimates for each activity
- Consider budget constraints and suggest budget-friendly options
- Include transportation between cities/locations
- Suggest specific restaurants, attractions, and accommodations
- Provide practical tips and notes for each day

FORMAT: Please provide both a markdown summary AND a detailed JSON structure.

MARKDOWN FORMAT:
# ${destinations} Itinerary
- Total estimated budget: $X (Breakdown: Accommodation $A, Transport $B, Food $C, Activities $D)

## Day 1 — [City/Location]
- **Morning (9:00-12:00):** Activity description
- **Afternoon (13:00-17:00):** Activity description
- **Evening (18:00-21:00):** Activity description
- **Notes:** Practical tips, costs, booking info

## Day 2 — [City/Location]
...continue for each day

JSON FORMAT (after markdown):
Provide a structured JSON with the following exact schema:
{
  "days": [
    {
      "id": "day-1",
      "date": "YYYY-MM-DD",
      "city": "City Name",
      "items": [
        {
          "id": "item-1-1",
          "timeStart": "HH:MM",
          "timeEnd": "HH:MM",
          "title": "Activity Title",
          "note": "Description and cost details"
        }
      ]
    }
  ],
  "generatedAt": "2024-01-01T00:00:00.000Z",
  "summary": "Brief summary of the itinerary"
}`;
};

// AI Task Generation Schema
const AIGeneratedTasksSchema = z.object({
  generalTasks: z.array(z.object({
    id: z.string(),
    text: z.string(),
    done: z.boolean().default(false),
  })),
  destinationSpecificTasks: z.array(z.object({
    location: z.string(),
    id: z.string(),
    text: z.string(),
    done: z.boolean().default(false),
  })),
});

// Utility function to create AI prompt for task generation
const createTaskPromptFromAnswers = (answers: Answers): string => {
  const destinations = answers.destinations.join(', ');
  const budget = `${answers.currency} ${answers.budget}`;
  const transportation = answers.transportation.length > 0 ? answers.transportation.join(', ') : 'flexible';
  const activities = answers.things_to_do.length > 0 ? answers.things_to_do.join(', ') : 'general sightseeing';
  const foodPrefs = answers.food_dietary.length > 0 ? answers.food_dietary.join(', ') : 'no restrictions';
  const purpose = answers.purpose_of_trip.length > 0 ? answers.purpose_of_trip.join(', ') : 'leisure';

  return `Generate a comprehensive list of travel preparation tasks for a ${purpose} trip with the following details:

TRIP DETAILS:
- Destinations: ${destinations}
- Travel dates: ${answers.dates}
- Budget: ${budget}
- Starting point: ${answers.starting_point || 'Not specified'}
- End point: ${answers.end_point || 'Same as start'}
- Flexible dates: ${answers.flexible_dates ? 'Yes' : 'No'}
- Preferred transportation: ${transportation}
- Interests/Activities: ${activities}
- Food preferences/dietary restrictions: ${foodPrefs}
- Traveler citizenship: ${answers.citizenship}

REQUIREMENTS:
- Generate both general travel preparation tasks and destination-specific tasks
- General tasks should include essential preparation like passport validity, travel insurance, vaccinations, visa requirements
- Add budget-specific tasks (e.g., hostel research for budget travelers, luxury bookings for higher budgets)
- Add transportation-specific tasks (e.g., flight booking, rail passes, car rentals)
- Add activity-specific tasks based on interests (e.g., museum tickets, hiking permits, restaurant reservations)
- Destination-specific tasks should be tailored to each location's unique requirements
- Consider local customs, entry requirements, transportation options, and popular attractions
- Each task should be actionable and specific
- Use unique IDs for each task (kebab-case format)

FORMAT: Provide a structured JSON response with the following schema:
{
  "generalTasks": [
    {
      "id": "unique-task-id",
      "text": "Specific task description",
      "done": false
    }
  ],
  "destinationSpecificTasks": [
    {
      "location": "City/Country Name",
      "id": "unique-task-id-for-location",
      "text": "Location-specific task description",
      "done": false
    }
  ]
}`;
};

// AI-powered task generation function
const generateAITasksFromAnswers = async (answers: Answers, agent: any): Promise<{ generalTasks: any[], destinationSpecificTasks: any[] }> => {
  try {
    console.log('Generating AI-powered tasks...');

    const prompt = createTaskPromptFromAnswers(answers);
    console.log('Generated task prompt:', prompt.substring(0, 200) + '...');

    // Generate AI response using structured output
    const response = await agent.generateVNext([
      {
        role: 'system',
        content: 'You are a travel planning expert specializing in creating comprehensive travel preparation task lists. Generate detailed, actionable tasks based on the trip details provided. Be specific and consider all aspects of travel planning including documentation, health, logistics, and local requirements.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      output: AIGeneratedTasksSchema
    });

    const aiTasks = response.object;
    console.log('AI tasks generated:', aiTasks.generalTasks.length, 'general,', aiTasks.destinationSpecificTasks.length, 'destination-specific');

    return {
      generalTasks: aiTasks.generalTasks,
      destinationSpecificTasks: aiTasks.destinationSpecificTasks,
    };
  } catch (error) {
    console.warn('AI task generation failed, falling back to rule-based generation:', error);
    return generateTasksFromAnswers(answers);
  }
};

// Utility function to generate tasks from answers (fallback/legacy)
const generateTasksFromAnswers = (answers: Answers) => {
  // Start with default general tasks
  const generalTasks = [...DEFAULT_GENERAL_TASKS];

  // Add budget-specific tasks
  if (parseInt(answers.budget) < 1000) {
    generalTasks.push({
      id: 'budget-hostels',
      text: 'Research and book budget accommodations (hostels, guesthouses)',
      done: false,
    });
  }

  // Add visa-related tasks based on citizenship and destinations
  if (answers.citizenship && answers.destinations.length > 0) {
    generalTasks.push({
      id: 'visa-requirements',
      text: `Check visa requirements for ${answers.citizenship} citizens traveling to ${answers.destinations.join(', ')}`,
      done: false,
    });
  }

  // Add transportation-specific tasks
  if (answers.transportation.includes('flight')) {
    generalTasks.push({
      id: 'flight-booking',
      text: 'Book flights and check baggage policies',
      done: false,
    });
  }

  // Generate destination-specific tasks
  const destinationSpecificTasks = answers.destinations.flatMap(destination => {
    const citySlug = destination.toLowerCase().replace(/\s+/g, '-');
    return [
      {
        location: destination,
        id: `${citySlug}-accommodation`,
        text: `Book accommodation in ${destination}`,
        done: false,
      },
      {
        location: destination,
        id: `${citySlug}-transport`,
        text: `Research local transportation options in ${destination}`,
        done: false,
      },
      {
        location: destination,
        id: `${citySlug}-attractions`,
        text: `Book tickets for major attractions in ${destination}`,
        done: false,
      },
      {
        location: destination,
        id: `${citySlug}-restaurants`,
        text: `Research and make restaurant reservations in ${destination}`,
        done: false,
      },
    ];
  });

  return {
    generalTasks,
    destinationSpecificTasks,
  };
};

// Utility function to parse markdown response and extract JSON
const parseItineraryResponse = (response: string) => {
  try {
    // Look for JSON in the response (usually at the end)
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/i) ||
      response.match(/\{[\s\S]*"days"[\s\S]*\}/);

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsedJson = JSON.parse(jsonStr);

      // Validate and structure the itinerary
      if (parsedJson.days && Array.isArray(parsedJson.days)) {
        return {
          days: parsedJson.days.map((day: any, index: number) => ({
            id: day.id || `day-${index + 1}`,
            date: day.date || new Date().toISOString().split('T')[0],
            city: day.city || 'Unknown',
            items: (day.items || []).map((item: any, itemIndex: number) => ({
              id: item.id || `item-${index}-${itemIndex}`,
              timeStart: item.timeStart || '09:00',
              timeEnd: item.timeEnd || '10:00',
              title: item.title || 'Activity',
              note: item.note || '',
              tasks: item.tasks || [],
            })),
          })),
          generatedAt: new Date().toISOString(),
          summary: parsedJson.summary || 'Generated itinerary',
        };
      }
    }

    // Fallback: create basic structure from destinations
    return createFallbackItinerary(response);
  } catch (error) {
    console.warn('Failed to parse JSON from itinerary response:', error);
    return createFallbackItinerary(response);
  }
};

// Fallback itinerary creation from markdown content
const createFallbackItinerary = (markdownContent: string) => {
  return {
    days: [
      {
        id: 'day-1',
        date: new Date().toISOString().split('T')[0],
        city: 'Destination',
        items: [
          {
            id: 'item-1-1',
            timeStart: '09:00',
            timeEnd: '12:00',
            title: 'Morning exploration',
            note: 'Explore the city and get oriented',
            tasks: [],
          },
          {
            id: 'item-1-2',
            timeStart: '13:00',
            timeEnd: '17:00',
            title: 'Afternoon activities',
            note: 'Visit main attractions',
            tasks: [],
          },
          {
            id: 'item-1-3',
            timeStart: '18:00',
            timeEnd: '21:00',
            title: 'Evening dining',
            note: 'Try local cuisine',
            tasks: [],
          },
        ],
      },
    ],
    generatedAt: new Date().toISOString(),
    summary: 'Basic itinerary generated from AI response',
  };
};

// Create itinerary from destinations array
const createItineraryFromDestinations = (destinations: string[]) => {
  return {
    days: destinations.map((destination, index) => ({
      id: `day-${index + 1}`,
      date: new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      city: destination,
      items: [
        {
          id: `item-${index + 1}-1`,
          timeStart: '09:00',
          timeEnd: '12:00',
          title: `Morning exploration in ${destination}`,
          note: 'Explore the city and get oriented',
          tasks: [],
        },
        {
          id: `item-${index + 1}-2`,
          timeStart: '13:00',
          timeEnd: '17:00',
          title: `Afternoon activities in ${destination}`,
          note: 'Visit main attractions',
          tasks: [],
        },
        {
          id: `item-${index + 1}-3`,
          timeStart: '18:00',
          timeEnd: '21:00',
          title: `Evening dining in ${destination}`,
          note: 'Try local cuisine',
          tasks: [],
        },
      ],
    })),
    generatedAt: new Date().toISOString(),
    summary: 'Structured itinerary generated from user preferences',
  };
};

const planInput = z.object({
  prompt: z.string().describe('Trip request, e.g., "7 days Spain -> Portugal -> Morocco, $700 budget"'),
  answers: AnswerSchema.optional().describe('Optional onboarding answers to create a trip'),
  tripId: z.string().uuid().optional().describe('Optional existing trip ID to update'),
});

const planOutput = z.object({
  itinerary: z.string(), // markdown format for human readability
  structuredItinerary: ProposedItinerarySchema, // JSON format for app usage
  tasks: TasksSchema, // structured tasks
  tripId: z.string().uuid().optional().describe('ID of the created/updated trip'),
  trip: z.record(z.unknown()).optional().describe('The trip data if saved to database'),
});

const planItinerary = createStep({
  id: 'plan-itinerary',
  description: 'Creates a comprehensive travel itinerary with structured data and tasks.',
  inputSchema: planInput,
  outputSchema: planOutput,
  execute: async ({ inputData, mastra }) => {
    if (!inputData) throw new Error('Missing input');

    const agent = mastra?.getAgent('travelAgent');
    if (!agent) throw new Error('Travel agent not found');

    // Generate comprehensive prompt from answers if available
    const prompt = inputData.answers
      ? createPromptFromAnswers(inputData.answers)
      : inputData.prompt;

    console.log('Generating itinerary with prompt:', prompt.substring(0, 200) + '...');

    // Generate AI response
    const stream = await agent.stream([{ role: 'user', content: prompt }]);

    let text = '';
    for await (const chunk of stream.textStream) {
      process.stdout.write(chunk);
      text += chunk;
    }

    console.log('AI response generated, length:', text.length);

    // Parse the response to extract structured itinerary
    let structuredItinerary = parseItineraryResponse(text);

    // Ensure required fields are present
    if (!structuredItinerary.generatedAt) {
      structuredItinerary.generatedAt = new Date().toISOString();
    }
    if (!structuredItinerary.summary) {
      structuredItinerary.summary = inputData.answers
        ? `AI-generated itinerary for ${inputData.answers.destinations.join(', ')}`
        : 'AI-generated travel itinerary';
    }

    console.log('Structured itinerary parsed:', structuredItinerary.days.length, 'days');

    // Generate tasks from answers using AI
    const tasks = inputData.answers
      ? await generateAITasksFromAnswers(inputData.answers, agent)
      : {
        generalTasks: [...DEFAULT_GENERAL_TASKS],
        destinationSpecificTasks: [],
      };

    console.log('Tasks generated:', tasks.generalTasks.length, 'general,', tasks.destinationSpecificTasks.length, 'destination-specific');

    // Handle database operations if needed
    let tripId: string | undefined;
    let trip: any;

    if (inputData.answers) {
      // This workflow step doesn't create the trip - that's handled by the API endpoint
      // Just return the generated content
      console.log('Workflow completed successfully');
    } else if (inputData.tripId) {
      // Update existing trip with generated content
      tripId = inputData.tripId;
      trip = await tripService.updateTrip(inputData.tripId, {
        itinerary: structuredItinerary,
        tasks: tasks,
      });
      console.log('Updated existing trip:', tripId);
    }

    return {
      itinerary: text,
      structuredItinerary,
      tasks,
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


export {
  itineraryWorkflow,
  createPromptFromAnswers,
  generateTasksFromAnswers,
  generateAITasksFromAnswers,
  createTaskPromptFromAnswers,
  parseItineraryResponse,
  createFallbackItinerary,
  createItineraryFromDestinations
};
