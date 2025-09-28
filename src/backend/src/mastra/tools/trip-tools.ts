import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { tripService } from '../../services/tripService';
import {
  CreateTripSchema,
  UpdateTripSchema,
  createTripFromComponents,
  AnswerSchema
} from '../../schemas/trip';
import { regenerateTripContent, touchesBasicTripInfo } from '../utils/regenerateTripContent';

// Tool to create a new trip
export const createTripTool = createTool({
  id: 'create-trip',
  description: 'Create a new trip in the database',
  inputSchema: CreateTripSchema,
  execute: async ({ context }) => {
    try {
      const trip = await tripService.createTrip(context);
      return {
        success: true,
        message: `Trip created successfully with ID: ${trip.id}`,
        tripId: trip.id,
        trip: trip,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create trip',
      };
    }
  },
});

// Tool to create trip from onboarding answers
export const createTripFromAnswersTool = createTool({
  id: 'create-trip-from-answers',
  description: 'Create a trip from user onboarding answers',
  inputSchema: AnswerSchema,
  execute: async ({ context }) => {
    try {
      // Create placeholder itinerary and tasks for now
      // TODO: This tool will be updated to accept actual itinerary and tasks
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
      const tripData = createTripFromComponents(context, placeholderItinerary, placeholderTasks);
      const trip = await tripService.createTrip(tripData);
      return {
        success: true,
        message: `Trip created from answers with ID: ${trip.id}`,
        tripId: trip.id,
        trip: trip,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create trip from answers',
      };
    }
  },
});

// Tool to get trip by ID
export const getTripTool = createTool({
  id: 'get-trip',
  description: 'Retrieve a trip by its ID',
  inputSchema: z.object({
    tripId: z.string().uuid().describe('The ID of the trip to retrieve'),
  }),
  execute: async ({ context }) => {
    try {
      const trip = await tripService.getTripById(context.tripId);
      if (!trip) {
        return {
          success: false,
          error: 'Trip not found',
        };
      }
      return {
        success: true,
        message: `Trip retrieved successfully`,
        trip: trip,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve trip',
      };
    }
  },
});

// Tool to update trip
export const updateTripTool = createTool({
  id: 'update-trip',
  description: 'Update an existing trip with new information',
  inputSchema: z.object({
    tripId: z.string().uuid().describe('The ID of the trip to update'),
    updates: UpdateTripSchema.describe('The updates to apply to the trip'),
  }),
  execute: async ({ context }) => {
    try {
      const needsRegeneration = touchesBasicTripInfo(context.updates);
      const trip = await tripService.updateTrip(context.tripId, context.updates);

      if (!needsRegeneration) {
        return {
          success: true,
          message: `Trip updated successfully`,
          trip,
          regenerated: false,
        };
      }

      const regeneratedTrip = await regenerateTripContent(context.tripId, trip);

      return {
        success: true,
        message: `Trip updated and itinerary/tasks regenerated`,
        trip: regeneratedTrip,
        regenerated: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update trip',
      };
    }
  },
});


// Tool to delete trip
export const deleteTripTool = createTool({
  id: 'delete-trip',
  description: 'Delete a trip from the database',
  inputSchema: z.object({
    tripId: z.string().uuid().describe('The ID of the trip to delete'),
  }),
  execute: async ({ context }) => {
    try {
      await tripService.deleteTrip(context.tripId);
      return {
        success: true,
        message: `Trip ${context.tripId} deleted successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete trip',
      };
    }
  },
});

// Tool to add a new task to a trip
export const addTaskTool = createTool({
  id: 'add-task',
  description: 'Add a new task to a trip',
  inputSchema: z.object({
    tripId: z.string().uuid().describe('The ID of the trip to add the task to'),
    taskText: z.string().describe('The text description of the task'),
    taskType: z.enum(['general', 'destination']).describe('Whether this is a general or destination-specific task'),
    location: z.string().optional().describe('The location for destination-specific tasks'),
  }),
  execute: async ({ context }) => {
    try {
      const trip = await tripService.getTripById(context.tripId);
      if (!trip) {
        return { success: false, error: 'Trip not found' };
      }

      const tasks = trip.tasks || { generalTasks: [], destinationSpecificTasks: [] };
      const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      if (context.taskType === 'general') {
        tasks.generalTasks.push({
          id: taskId,
          text: context.taskText,
          done: false,
        });
      } else {
        tasks.destinationSpecificTasks.push({
          id: taskId,
          location: context.location || 'Unknown',
          text: context.taskText,
          done: false,
        });
      }

      await tripService.updateTrip(context.tripId, { tasks });

      return {
        success: true,
        message: `Added task "${context.taskText}" to your ${context.taskType} tasks`,
        taskId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add task',
      };
    }
  },
});

// Tool to update task completion status
export const updateTaskStatusTool = createTool({
  id: 'update-task-status',
  description: 'Mark a task as completed or incomplete',
  inputSchema: z.object({
    tripId: z.string().uuid().describe('The ID of the trip'),
    taskId: z.string().describe('The ID of the task to update'),
    done: z.boolean().describe('Whether the task is completed'),
  }),
  execute: async ({ context }) => {
    try {
      const trip = await tripService.getTripById(context.tripId);
      if (!trip) {
        return { success: false, error: 'Trip not found' };
      }

      const tasks = trip.tasks || { generalTasks: [], destinationSpecificTasks: [] };
      let taskFound = false;
      let taskText = '';

      // Update in generalTasks
      tasks.generalTasks = tasks.generalTasks.map((task: any) => {
        if (task.id === context.taskId) {
          taskFound = true;
          taskText = task.text;
          return { ...task, done: context.done };
        }
        return task;
      });

      // Update in destinationSpecificTasks
      tasks.destinationSpecificTasks = tasks.destinationSpecificTasks.map((task: any) => {
        if (task.id === context.taskId) {
          taskFound = true;
          taskText = task.text;
          return { ...task, done: context.done };
        }
        return task;
      });

      if (!taskFound) {
        return { success: false, error: 'Task not found' };
      }

      await tripService.updateTrip(context.tripId, { tasks });

      return {
        success: true,
        message: `Marked "${taskText}" as ${context.done ? 'completed' : 'incomplete'}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update task status',
      };
    }
  },
});

// Tool to regenerate trip content with AI
export const regenerateContentTool = createTool({
  id: 'regenerate-content',
  description: 'Regenerate trip itinerary and/or tasks using AI',
  inputSchema: z.object({
    tripId: z.string().uuid().describe('The ID of the trip'),
    contentType: z.enum(['tasks', 'itinerary', 'both']).describe('What content to regenerate'),
  }),
  execute: async ({ context }) => {
    try {
      const { tripId, contentType } = context;

      // Import the tripService here to avoid circular dependencies
      const { tripService } = await import('../../services/tripService');

      if (contentType === 'tasks') {
        // Call the tasks regeneration logic directly
        const trip = await tripService.getTripById(tripId);
        if (!trip) {
          return {
            success: false,
            error: 'Trip not found',
          };
        }

        // Create answers object for task regeneration
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

        // Generate new tasks
        const { generateAITasksFromAnswers } = await import('../workflows/itinerary-workflow');
        const { travelAgent } = await import('../agents/travel-agent');

        const newTasks = await generateAITasksFromAnswers(answers, travelAgent);
        await tripService.updateTrip(tripId, { tasks: newTasks });

        return {
          success: true,
          message: `Successfully regenerated ${newTasks.generalTasks.length} general tasks and ${newTasks.destinationSpecificTasks.length} destination-specific tasks for your trip.`,
        };
      } else if (contentType === 'both') {
        // Call the full regeneration logic
        const trip = await tripService.getTripById(tripId);
        if (!trip) {
          return {
            success: false,
            error: 'Trip not found',
          };
        }

        // Create answers object for full regeneration
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

        // Generate AI content using the travel agent directly
        const { createPromptFromAnswers } = await import('../workflows/itinerary-workflow');
        const { travelAgent } = await import('../agents/travel-agent');
        const { ProposedItinerarySchema } = await import('../../schemas/trip');

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
        const { generateAITasksFromAnswers } = await import('../workflows/itinerary-workflow');
        const tasks = await generateAITasksFromAnswers(answers, travelAgent);
        console.log('AI tasks generated:', tasks.generalTasks.length, 'general,', tasks.destinationSpecificTasks.length, 'destination-specific');

        // Update the trip
        await tripService.updateTrip(tripId, {
          itinerary: structuredItinerary,
          tasks: tasks,
        });

        return {
          success: true,
          message: `Successfully regenerated your complete trip itinerary and ${tasks.generalTasks.length + tasks.destinationSpecificTasks.length} tasks.`,
        };
      }

      return {
        success: false,
        error: `Content type '${contentType}' is not supported yet.`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to regenerate content',
      };
    }
  },
});
