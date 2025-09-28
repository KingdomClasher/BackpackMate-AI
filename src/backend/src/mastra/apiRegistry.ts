import { registerApiRoute } from "@mastra/core/server";
import { z } from "zod";
import { itineraryWorkflow } from './workflows/itinerary-workflow';
import type { Mastra } from '@mastra/core/mastra';
import { mastra } from './index';
import {
  AnswerSchema,
  Answers,
  ChatRequest,
  ChatRequestSchema,
  CreateTripSchema,
  UpdateTripSchema,
  createTripFromComponents,
  transformAnswersToDatabase
} from "../schemas/trip";
import { processAssistantMessage } from "../utils/assistant";
import { createSSEStream, streamJSONEvent } from "../utils/streamUtils";
import { tripService } from "../services/tripService";
import {
  generateTasksFromAnswers,
  generateAITasksFromAnswers,
  createItineraryFromDestinations,
  createPromptFromAnswers,
  itineraryWorkflow
} from "./workflows/itinerary-workflow";
import { travelAgent } from "./agents/travel-agent";
import { ProposedItinerarySchema } from "../schemas/trip";
import { regenerateTripContent, touchesBasicTripInfo } from "./utils/regenerateTripContent";

// Request/Response schemas for trip routes
const TripIdParamsSchema = z.object({
  id: z.string().uuid(),
});

// Original routes (keeping for backward compatibility)
const originalRoutes = [
  registerApiRoute("/chat/execute-function", {
    method: "POST",
    handler: async (context) => {
      try {
        const body = await context.req.json();
        const request = normalizeChatRequest(body);

        // Try to get trip ID from resourceId or from referer URL
        let tripId = request.resourceId;
        if (!tripId) {
          const referer = context.req.header('referer') || context.req.header('Referer');
          console.log('Chat request referer:', referer);
          if (referer) {
            // Try different UUID patterns
            let tripIdMatch = referer.match(/\/trip\/([a-f0-9-]{36})/i);
            if (!tripIdMatch) {
              // Try shorter UUID pattern without hyphens
              tripIdMatch = referer.match(/\/trip\/([a-f0-9]{32})/i);
            }
            if (!tripIdMatch) {
              // Try any alphanumeric ID pattern
              tripIdMatch = referer.match(/\/trip\/([a-zA-Z0-9-]+)/);
            }
            if (tripIdMatch) {
              tripId = tripIdMatch[1];
              console.log('Extracted tripId from referer:', tripId);
            } else {
              console.log('No trip ID pattern found in referer URL');
            }
          } else {
            console.log('No referer header found');
          }
        }

        // Temporary fallback: try to get the most recent trip if no tripId found
        if (!tripId) {
          console.log('No tripId found, attempting to get most recent trip as fallback');
          try {
            const allTrips = await tripService.getAllTrips();
            if (allTrips && allTrips.length > 0) {
              // Get the most recently created trip
              const mostRecentTrip = allTrips.sort((a, b) =>
                new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
              )[0];
              tripId = mostRecentTrip.id;
              console.log('Using most recent trip as fallback:', tripId);
            }
          } catch (error) {
            console.warn('Failed to get fallback trip:', error);
          }
        }

        const chatContext = tripId ? { tripId } : undefined;

        console.log('Chat request received:', {
          hasResourceId: !!request.resourceId,
          resourceId: request.resourceId,
          extractedTripId: tripId,
          messageCount: request.messages?.length
        });

        const response = await processAssistantMessage(request.messages, chatContext);
        return context.json(response);
      } catch (error) {
        console.error("Chat handler error", error);
        const message =
          error instanceof Error ? error.message : "Assistant could not process the request";
        return context.json({ error: message }, 500);
      }
    },
  }),
  registerApiRoute("/chat/execute-function/stream", {
    method: "POST",
    handler: async (context) => {
      try {
        const body = await context.req.json();
        const request = normalizeChatRequest(body);

        // Try to get trip ID from resourceId or from referer URL
        let tripId = request.resourceId;
        if (!tripId) {
          const referer = context.req.header('referer') || context.req.header('Referer');
          console.log('Chat stream request referer:', referer);
          if (referer) {
            // Try different UUID patterns
            let tripIdMatch = referer.match(/\/trip\/([a-f0-9-]{36})/i);
            if (!tripIdMatch) {
              // Try shorter UUID pattern without hyphens
              tripIdMatch = referer.match(/\/trip\/([a-f0-9]{32})/i);
            }
            if (!tripIdMatch) {
              // Try any alphanumeric ID pattern
              tripIdMatch = referer.match(/\/trip\/([a-zA-Z0-9-]+)/);
            }
            if (tripIdMatch) {
              tripId = tripIdMatch[1];
              console.log('Extracted tripId from referer:', tripId);
            } else {
              console.log('No trip ID pattern found in referer URL');
            }
          } else {
            console.log('No referer header found');
          }
        }

        // Temporary fallback: try to get the most recent trip if no tripId found
        if (!tripId) {
          console.log('No tripId found, attempting to get most recent trip as fallback');
          try {
            const allTrips = await tripService.getAllTrips();
            if (allTrips && allTrips.length > 0) {
              // Get the most recently created trip
              const mostRecentTrip = allTrips.sort((a, b) =>
                new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
              )[0];
              tripId = mostRecentTrip.id;
              console.log('Using most recent trip as fallback:', tripId);
            }
          } catch (error) {
            console.warn('Failed to get fallback trip:', error);
          }
        }

        const chatContext = tripId ? { tripId } : undefined;

        console.log('Chat stream request received:', {
          hasResourceId: !!request.resourceId,
          resourceId: request.resourceId,
          extractedTripId: tripId,
          messageCount: request.messages?.length
        });

        return createSSEStream(async (controller) => {
          streamJSONEvent(controller, {
            type: "progress_update",
            text: "Understanding request",
            state: "in_progress",
          });

          const response = await processAssistantMessage(request.messages, chatContext);

          const encoder = new TextEncoder();
          const escaped = response.content.replace(/\n/g, "\\n");
          controller.enqueue(encoder.encode(`data:${escaped}\n\n`));

          if (Array.isArray(response.object)) {
            response.object.forEach((obj) => streamJSONEvent(controller, obj));
          } else if (response.object) {
            streamJSONEvent(controller, response.object);
          }

          streamJSONEvent(controller, {
            type: "progress_update",
            text: "All set",
            state: "complete",
          });
        });
      } catch (error) {
        console.error("Chat stream error", error);
        const message =
          error instanceof Error ? error.message : "Assistant could not process the request";
        return context.json({ error: message }, 500);
      }
    },
  }),
];

const PromptFallbackSchema = z.object({
  prompt: z.string(),
  systemPrompt: z.string().optional(),
  resourceId: z.string().optional(),
  threadId: z.string().optional(),
});

const normalizeChatRequest = (payload: unknown): ChatRequest => {
  const parsed = ChatRequestSchema.safeParse(payload);
  if (parsed.success) {
    return parsed.data;
  }

  const fallback = PromptFallbackSchema.safeParse(payload);
  if (fallback.success) {
    const { prompt, systemPrompt, resourceId, threadId } = fallback.data;
    const messages = [
      ...(systemPrompt
        ? [{ role: "system" as const, content: systemPrompt }]
        : []),
      { role: "user" as const, content: prompt },
    ];
    return { messages, resourceId, threadId };
  }

  throw parsed.error;
};

// Background AI generation function
const generateContentInBackground = async (tripId: string, answers: Answers) => {
  console.log('Starting background AI generation for trip:', tripId);

  let workflowResult;
  try {
    console.log('Executing AI-powered itinerary workflow...');

    // Generate AI content using the travel agent directly
    try {
      console.log('Attempting AI generation using travel agent...');

      // Generate comprehensive prompt from answers
      const prompt = createPromptFromAnswers(answers);
      console.log('Generated prompt:', prompt.substring(0, 200) + '...');

      // Generate AI response using structured output
      const response = await travelAgent.generateVNext([
        {
          role: 'system',
          content: 'You are a travel planning expert. Generate a detailed day-by-day itinerary based on the user preferences. Each day should include specific activities with descriptions, locations, and estimated costs.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        output: ProposedItinerarySchema
      });

      const structuredItinerary = response.object;
      console.log('AI structured itinerary generated:', structuredItinerary.days.length, 'days');

      // Generate AI-powered tasks from answers
      const tasks = await generateAITasksFromAnswers(answers, travelAgent);
      console.log('AI tasks generated:', tasks.generalTasks.length, 'general,', tasks.destinationSpecificTasks.length, 'destination-specific');

      workflowResult = {
        structuredItinerary,
        tasks,
        aiResponse: 'AI-generated structured itinerary',
      };
      console.log('AI generation completed successfully');
    } catch (aiError) {
      console.warn('AI workflow execution failed, falling back to structured generation:', aiError);

      // Fallback to structured generation if AI fails
      console.log('Using structured fallback generation...');
      const structuredItinerary = createItineraryFromDestinations(answers.destinations, answers);
      // Try AI task generation even if itinerary generation failed
      let tasks;
      try {
        tasks = await generateAITasksFromAnswers(answers, travelAgent);
        console.log('AI tasks generated in fallback:', tasks.generalTasks.length, 'general,', tasks.destinationSpecificTasks.length, 'destination-specific');
      } catch (taskError) {
        console.warn('AI task generation failed in fallback, using rule-based tasks:', taskError);
        tasks = generateTasksFromAnswers(answers);
      }

      workflowResult = {
        structuredItinerary,
        tasks,
      };
      console.log('Structured fallback generation completed');
    }
  } catch (workflowError) {
    console.error('Workflow execution failed:', workflowError);

    // Fallback to basic itinerary and tasks if AI generation fails
    console.log('Using fallback itinerary and tasks');
    // Try AI task generation as last resort
    let fallbackTasks;
    try {
      fallbackTasks = await generateAITasksFromAnswers(answers, travelAgent);
      console.log('AI tasks generated in final fallback:', fallbackTasks.generalTasks.length, 'general,', fallbackTasks.destinationSpecificTasks.length, 'destination-specific');
    } catch (finalTaskError) {
      console.warn('Final AI task generation failed, using rule-based tasks:', finalTaskError);
      fallbackTasks = generateTasksFromAnswers(answers);
    }

    workflowResult = {
      structuredItinerary: createItineraryFromDestinations(answers.destinations, answers),
      tasks: fallbackTasks,
    };
  }

  // Update the trip with generated content
  try {
    await tripService.updateTrip(tripId, {
      itinerary: workflowResult.structuredItinerary,
      tasks: workflowResult.tasks,
    });
    console.log('Trip updated with AI-generated content:', tripId);
  } catch (updateError) {
    console.error('Failed to update trip with generated content:', tripId, updateError);
  }
};

// Test route for AI agent
const testAIRoute = registerApiRoute("/test-ai", {
  method: "POST",
  handler: async (context) => {
    try {
      console.log('Testing AI agent...');

      const response = await travelAgent.generate([
        {
          role: 'user',
          content: 'Say hello and tell me you are working properly.'
        }
      ]);

      console.log('AI response:', response.text);

      return context.json({
        success: true,
        message: response.text,
      });
    } catch (error) {
      console.error('AI test error:', error);
      return context.json({
        success: false,
        error: error instanceof Error ? error.message : 'AI test failed',
      }, 500);
    }
  },
});

// Trip routes
const tripRoutes = [
  // Create a new trip
  registerApiRoute("/trips", {
    method: "POST",
    handler: async (context) => {
      try {
        const body = await context.req.json();
        const tripData = CreateTripSchema.parse(body);


        const trip = await tripService.createTrip(tripData);

        return context.json({
          success: true,
          data: trip,
        }, 201);
      } catch (error) {
        console.error("Create trip error:", error);
        const message = error instanceof Error ? error.message : "Failed to create trip";
        return context.json({
          success: false,
          error: message
        }, 400);
      }
    },
  }),

  // Create trip from onboarding answers
  registerApiRoute("/trips/from-answers", {
    method: "POST",
    handler: async (context) => {
      try {
        const body = await context.req.json();
        const answers = AnswerSchema.parse(body);

        console.log('Creating trip from answers for destinations:', answers.destinations);

        // Create trip immediately without AI generation
        const tripData = transformAnswersToDatabase(
          answers,
        );

        const trip = await tripService.createTrip(tripData);
        console.log('Trip created successfully with ID:', trip.id);

        // Start AI generation in background (don't await)
        generateContentInBackground(trip.id, answers).catch(error => {
          console.error('Background AI generation failed for trip:', trip.id, error);
        });

        // const prompt =
        //   `Plan a student-budget backpacking itinerary.\n` +
        //   `Dates: ${answers.dates}\n` +
        //   `Destinations: ${answers.destinations}\n` +
        //   `Preferences: ${answers.preferences || 'none'}\n` +
        //   `Budget: ${answers.budget || 'unspecified'}\n` +
        //   `Citizenship: ${answers.citizenship || 'unspecified'}`;


        // const agent = mastra?.getAgent('travelAgent');
        // const stream = await agent.stream([{ role: 'user', content: prompt }]);
        // let text = '';
        // for await (const chunk of stream.textStream) {
        //   process.stdout.write(chunk);
        //   text += chunk;
        // }
        // const itinerary = text.trim();
        // await tripService.updateTrip(trip.id, {
        //   itinerary: { markdown: itinerary, generatedAt: new Date().toISOString() },
        // });
        // console.log(itinerary);

        return context.json({
          success: true,
          data: trip,
        }, 201);
      } catch (error) {
        console.error("Create trip from answers error:", error);
        const message = error instanceof Error ? error.message : "Failed to create trip from answers";
        return context.json({
          success: false,
          error: message
        }, 400);
      }
    },
  }),

  // Get trip by ID
  registerApiRoute("/trips/:id", {
    method: "GET",
    handler: async (context) => {
      try {
        const { id } = TripIdParamsSchema.parse({ id: context.req.param('id') });
        const trip = await tripService.getTripById(id);

        if (!trip) {
          return context.json({
            success: false,
            error: "Trip not found",
          }, 404);
        }

        return context.json({
          success: true,
          data: trip,
        });
      } catch (error) {
        console.error("Get trip error:", error);
        const message = error instanceof Error ? error.message : "Failed to get trip";
        return context.json({
          success: false,
          error: message
        }, 400);
      }
    },
  }),

  // Downloadable ICS for a trip itinerary
  registerApiRoute("/trips/:id/ics", {
    method: "GET",
    handler: async (context) => {
      try {
        const { id } = TripIdParamsSchema.parse({ id: context.req.param('id') });
        const trip = await tripService.getTripById(id);
        if (!trip) {
          return context.json({ success: false, error: 'Trip not found' }, 404);
        }

        const { filename, content } = generateIcsFromTrip(trip);

        // Return as downloadable attachment with text/calendar MIME type
        return context.text(content, 200, {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        });
      } catch (error) {
        console.error('Generate ICS error:', error);
        const message = error instanceof Error ? error.message : 'Failed to generate ICS';
        return context.json({ success: false, error: message }, 400);
      }
    },
  }),

  // Update trip
  registerApiRoute("/trips/:id", {
    method: "PUT",
    handler: async (context) => {
      try {
        const { id } = TripIdParamsSchema.parse({ id: context.req.param('id') });
        const body = await context.req.json();
        const updates = UpdateTripSchema.parse(body);
        const needsRegeneration = touchesBasicTripInfo(updates);

        const trip = await tripService.updateTrip(id, updates);

        if (!needsRegeneration) {
          return context.json({
            success: true,
            data: trip,
            regenerated: false,
            message: "Trip updated successfully",
          });
        }

        try {
          const regeneratedTrip = await regenerateTripContent(id, trip);
          return context.json({
            success: true,
            data: regeneratedTrip,
            regenerated: true,
            message: "Trip updated and itinerary/tasks regenerated",
          });
        } catch (regenError) {
          console.error("Regeneration after update failed:", regenError);
          const message =
            regenError instanceof Error
              ? regenError.message
              : "Failed to regenerate itinerary and tasks after update";
          return context.json(
            {
              success: false,
              error: message,
            },
            500
          );
        }
      } catch (error) {
        console.error("Update trip error:", error);
        const message = error instanceof Error ? error.message : "Failed to update trip";
        return context.json({
          success: false,
          error: message
        }, 400);
      }
    },
  }),

  // Delete trip
  registerApiRoute("/trips/:id", {
    method: "DELETE",
    handler: async (context) => {
      try {
        const { id } = TripIdParamsSchema.parse({ id: context.req.param('id') });

        await tripService.deleteTrip(id);

        return context.json({
          success: true,
          message: "Trip deleted successfully",
        });
      } catch (error) {
        console.error("Delete trip error:", error);
        const message = error instanceof Error ? error.message : "Failed to delete trip";
        return context.json({
          success: false,
          error: message
        }, 400);
      }
    },
  }),

  // Update task completion status
  registerApiRoute("/trips/:id/tasks/:taskId", {
    method: "PATCH",
    handler: async (context) => {
      try {
        const { id } = TripIdParamsSchema.parse({ id: context.req.param('id') });
        const taskId = context.req.param('taskId');
        const body = await context.req.json();
        const { done } = z.object({ done: z.boolean() }).parse(body);

        // Get the current trip
        const trip = await tripService.getTripById(id);
        if (!trip) {
          return context.json({
            success: false,
            error: "Trip not found",
          }, 404);
        }

        // Update the task completion status
        let updatedTasks = trip.tasks;
        if (updatedTasks && typeof updatedTasks === 'object') {
          const tasks = updatedTasks as any;

          // Update in generalTasks
          if (tasks.generalTasks) {
            tasks.generalTasks = tasks.generalTasks.map((task: any) =>
              task.id === taskId ? { ...task, done } : task
            );
          }

          // Update in destinationSpecificTasks
          if (tasks.destinationSpecificTasks) {
            tasks.destinationSpecificTasks = tasks.destinationSpecificTasks.map((task: any) =>
              task.id === taskId ? { ...task, done } : task
            );
          }
        }

        // Update the trip with the modified tasks
        const updatedTrip = await tripService.updateTrip(id, { tasks: updatedTasks });

        return context.json({
          success: true,
          data: updatedTrip,
        });
      } catch (error) {
        console.error("Update task error:", error);
        const message = error instanceof Error ? error.message : "Failed to update task";
        return context.json({
          success: false,
          error: message
        }, 400);
      }
    },
  }),

  // Regenerate tasks with AI for an existing trip
  registerApiRoute("/trips/:id/tasks/regenerate", {
    method: "POST",
    handler: async (context) => {
      try {
        const { id } = TripIdParamsSchema.parse({ id: context.req.param('id') });

        // Get the current trip
        const trip = await tripService.getTripById(id);
        if (!trip) {
          return context.json({
            success: false,
            error: "Trip not found",
          }, 404);
        }

        console.log('Regenerating tasks for trip:', id);

        // Create answers object from trip data for AI task generation
        const answers = {
          destinations: trip.destinations || [],
          starting_point: trip.starting_point || "",
          end_point: trip.end_point || "",
          dates: `${trip.start_date} to ${trip.end_date}`,
          flexible_dates: trip.flexible_dates || false,
          preferences: trip.preferences || "",
          transportation: trip.transportation || [],
          things_to_do: trip.things_to_do || [],
          food_dietary: trip.food_dietary || [],
          citizenship: trip.citizenship || "",
          budget: trip.budget || "2000",
          currency: trip.currency || "USD",
          purpose_of_trip: trip.purpose_of_trip || [],
        };

        // Generate new AI-powered tasks
        let newTasks;
        try {
          newTasks = await generateAITasksFromAnswers(answers, travelAgent);
          console.log('AI tasks regenerated:', newTasks.generalTasks.length, 'general,', newTasks.destinationSpecificTasks.length, 'destination-specific');
        } catch (aiError) {
          console.warn('AI task regeneration failed, using rule-based generation:', aiError);
          newTasks = generateTasksFromAnswers(answers);
        }

        // Update the trip with new tasks
        const updatedTrip = await tripService.updateTrip(id, { tasks: newTasks });

        return context.json({
          success: true,
          data: updatedTrip,
          message: "Tasks successfully regenerated with AI",
        });
      } catch (error) {
        console.error("Regenerate tasks error:", error);
        const message = error instanceof Error ? error.message : "Failed to regenerate tasks";
        return context.json({
          success: false,
          error: message
        }, 400);
      }
    },
  }),

  // Regenerate both itinerary and tasks
  registerApiRoute("/trips/:id/regenerate", {
    method: "POST",
    handler: async (context) => {
      try {
        const { id } = TripIdParamsSchema.parse({ id: context.req.param('id') });

        // Get the current trip
        const trip = await tripService.getTripById(id);
        if (!trip) {
          return context.json({
            success: false,
            error: "Trip not found",
          }, 404);
        }

        console.log('Regenerating itinerary and tasks for trip:', id);

        // Create answers object from trip data for AI generation
        const answers = {
          destinations: trip.destinations || [],
          starting_point: trip.starting_point || "",
          end_point: trip.end_point || "",
          dates: `${trip.start_date} to ${trip.end_date}`,
          flexible_dates: trip.flexible_dates || false,
          preferences: JSON.stringify(trip.preferences || {}),
          transportation: trip.transportation || [],
          things_to_do: Array.isArray(trip.things_to_do) ? trip.things_to_do : Object.values(trip.things_to_do || {}).map(String),
          food_dietary: trip.food_dietary || [],
          citizenship: trip.citizenship,
          budget: trip.budget.toString(),
          currency: trip.currency || 'USD',
          purpose_of_trip: Array.isArray(trip.purpose_of_trip) ? trip.purpose_of_trip : [trip.purpose_of_trip || ''].filter(Boolean),
        };

        // Generate AI content using the travel agent directly (same as generateContentInBackground)
        console.log('Attempting AI generation using travel agent...');

        // Generate comprehensive prompt from answers
        const prompt = createPromptFromAnswers(answers);
        console.log('Generated prompt:', prompt.substring(0, 200) + '...');

        // Generate AI response using structured output
        const response = await travelAgent.generateVNext([
          {
            role: 'system',
            content: 'You are a travel planning expert. Generate a detailed day-by-day itinerary based on the user preferences. Each day should include specific activities with descriptions, locations, and estimated costs.'
          },
          {
            role: 'user',
            content: prompt
          }
        ], {
          output: ProposedItinerarySchema
        });

        const structuredItinerary = response.object;
        console.log('AI structured itinerary generated:', structuredItinerary.days.length, 'days');

        // Generate AI-powered tasks from answers
        const tasks = await generateAITasksFromAnswers(answers, travelAgent);
        console.log('AI tasks generated:', tasks.generalTasks.length, 'general,', tasks.destinationSpecificTasks.length, 'destination-specific');

        // Update the trip with new itinerary and tasks
        const updatedTrip = await tripService.updateTrip(id, {
          itinerary: structuredItinerary,
          tasks: tasks,
        });

        return context.json({
          success: true,
          data: updatedTrip,
          message: "Trip itinerary and tasks successfully regenerated with AI",
        });
      } catch (error) {
        console.error("Full regeneration error:", error);
        const message = error instanceof Error ? error.message : "Failed to regenerate trip content";
        return context.json({
          success: false,
          error: message
        }, 500);
      }
    },
  }),
];

// Combine all routes
export const apiRoutes = [
  ...originalRoutes,
  testAIRoute,
  ...tripRoutes,
];
