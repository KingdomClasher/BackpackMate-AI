import { supabase, type Database } from './supabase';
import {
  TripDatabase,
  CreateTrip,
  UpdateTrip,
  CreateTripSchema,
  UpdateTripSchema,
  ProposedItinerary
} from '../schemas/trip';
import { v4 as uuidv4 } from 'uuid';

export class TripService {
  /**
   * Create a new trip in the database
   */
  async createTrip(tripData: CreateTrip): Promise<TripDatabase> {
    // Validate input data
    const validatedData = CreateTripSchema.parse(tripData);

    // Parse preferences from string to object if needed
    const preferences = (() => {
      if (typeof validatedData.preferences !== 'string') return validatedData.preferences;
      if (!validatedData.preferences) return {};
      try {
        return JSON.parse(validatedData.preferences);
      } catch {
        return validatedData.preferences;
      }
    })();

    // Convert budget from string to number
    const budget = typeof validatedData.budget === 'string'
      ? parseFloat(validatedData.budget)
      : validatedData.budget;

    // Convert purpose_of_trip from array to string if needed
    const purpose_of_trip = Array.isArray(validatedData.purpose_of_trip)
      ? validatedData.purpose_of_trip.join(', ')
      : validatedData.purpose_of_trip;

    const tripToInsert: Database['public']['Tables']['trip']['Insert'] = {
      id: uuidv4(),
      ...validatedData,
      preferences,
      budget,
      purpose_of_trip,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('trip')
      .insert([tripToInsert])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create trip: ${error.message}`);
    }

    return data as TripDatabase;
  }

  /**
   * Get a trip by ID
   */
  async getTripById(id: string): Promise<TripDatabase | null> {
    const { data, error } = await supabase
      .from('trip')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw new Error(`Failed to get trip: ${error.message}`);
    }

    return data as TripDatabase;
  }

  /**
   * Update a trip
   */
  async updateTrip(id: string, updates: UpdateTrip): Promise<TripDatabase> {
    // Validate input data
    const validatedUpdates = UpdateTripSchema.parse(updates);

    // Parse preferences from string to object if needed
    const preferences = (() => {
      if (!validatedUpdates.preferences || typeof validatedUpdates.preferences !== 'string') {
        return validatedUpdates.preferences;
      }
      try {
        return JSON.parse(validatedUpdates.preferences);
      } catch {
        return validatedUpdates.preferences;
      }
    })();

    // Convert budget from string to number if provided
    const budget = validatedUpdates.budget
      ? (typeof validatedUpdates.budget === 'string'
        ? parseFloat(validatedUpdates.budget)
        : validatedUpdates.budget)
      : undefined;

    // Convert purpose_of_trip from array to string if needed
    const purpose_of_trip = validatedUpdates.purpose_of_trip !== undefined
      ? (Array.isArray(validatedUpdates.purpose_of_trip)
        ? validatedUpdates.purpose_of_trip.join(', ')
        : validatedUpdates.purpose_of_trip)
      : undefined;

    const updateData: Database['public']['Tables']['trip']['Update'] = {
      ...validatedUpdates,
      preferences,
      budget,
      purpose_of_trip,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('trip')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update trip: ${error.message}`);
    }

    return data as TripDatabase;
  }

  /**
   * Get all trips (for fallback purposes)
   */
  async getAllTrips(): Promise<TripDatabase[]> {
    const { data, error } = await supabase
      .from('trip')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10); // Limit to most recent 10 trips

    if (error) {
      throw new Error(`Failed to get trips: ${error.message}`);
    }

    return data as TripDatabase[];
  }

  /**
   * Delete a trip
   */
  async deleteTrip(id: string): Promise<void> {
    const { error } = await supabase
      .from('trip')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete trip: ${error.message}`);
    }
  }
}

// Export a singleton instance
export const tripService = new TripService();
