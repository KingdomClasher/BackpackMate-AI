import { registerApiRoute } from "@mastra/core/server";
import { z } from "zod";
import { itineraryWorkflow } from './workflows/itinerary-workflow';
import type { Mastra } from '@mastra/core/mastra';
import { mastra } from './index';
import {
  AnswerSchema,
  ChatRequest,
  ChatRequestSchema,
  CreateTripSchema,
  UpdateTripSchema,
  createTripFromComponents
} from "../schemas/trip";
import { processAssistantMessage } from "../utils/assistant";
import { createSSEStream, streamJSONEvent } from "../utils/streamUtils";
import { tripService } from "../services/tripService";
import { generateIcsFromTrip } from "../utils/ics";


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
        const response = await processAssistantMessage(request.messages);
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
        return createSSEStream(async (controller) => {
          streamJSONEvent(controller, {
            type: "progress_update",
            text: "Understanding request",
            state: "in_progress",
          });

          const response = await processAssistantMessage(request.messages);

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

        // For now, create placeholder itinerary and tasks
        // TODO: This endpoint will be updated to generate actual itinerary and tasks
        const placeholderItinerary = {
          days: [],
          generatedAt: new Date().toISOString(),
          summary: "Placeholder itinerary - to be generated",
        };

        const placeholderTasks = {
          generalTasks: [],
          destinationSpecificTasks: [],
        };

        // Use the centralized function to create trip
        const tripData = createTripFromComponents(answers, placeholderItinerary, placeholderTasks);
        const trip = await tripService.createTrip(tripData);

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

        const trip = await tripService.updateTrip(id, updates);

        return context.json({
          success: true,
          data: trip,
        });
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
];

// Combine all routes
export const apiRoutes = [
  ...originalRoutes,
  ...tripRoutes,
];
