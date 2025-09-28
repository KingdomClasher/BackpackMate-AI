import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { tripService } from '../../services/tripService';
import {
  CreateTripSchema,
  UpdateTripSchema,
  createTripFromComponents,
  AnswerSchema
} from '../../schemas/trip';

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
      const trip = await tripService.updateTrip(context.tripId, context.updates);
      return {
        success: true,
        message: `Trip updated successfully`,
        trip: trip,
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
