import { supabase, type Database } from './supabase';
import {
  TripDatabase,
  CreateTrip,
  UpdateTrip,
  CreateTripSchema,
  UpdateTripSchema,
  ProposedItinerary,
  DestinationTasks,
  ItineraryTask
} from '../schemas/trip';
import { v4 as uuidv4 } from 'uuid';

export class TripService {
  /**
   * Create a new trip in the database
   */
  async createTrip(tripData: CreateTrip): Promise<TripDatabase> {
    // Validate input data
    const validatedData = CreateTripSchema.parse(tripData);

    const tripToInsert: Database['public']['Tables']['trip']['Insert'] = {
      id: uuidv4(),
      ...validatedData,
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

    const updateData: Database['public']['Tables']['trip']['Update'] = {
      ...validatedUpdates,
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
