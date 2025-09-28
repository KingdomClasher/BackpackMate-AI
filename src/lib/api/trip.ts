import React from "react";
import { TripState, TripStateSchema, Answers } from "@/lib/types/trip";

// Backend trip data structure (from Supabase)
interface BackendTripData {
  id: string;
  destinations: string[];
  starting_point?: string | null;
  end_point?: string | null;
  start_date: string;
  end_date: string;
  flexible_dates: boolean;
  preferences: Record<string, unknown>;
  transportation?: string[] | null;
  things_to_do?: string[] | Record<string, unknown> | null;
  food_dietary?: string[] | null;
  citizenship: string;
  budget: number;
  currency?: string | null;
  purpose_of_trip?: string[] | string | null;
  itinerary?: Record<string, unknown> | null;
  tasks?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Transforms backend trip data to frontend TripState format
 */
function transformBackendToFrontend(backendData: BackendTripData): TripState {
  // Transform answers to match frontend format
  const answers: Answers = {
    destinations: backendData.destinations || [],
    starting_point: backendData.starting_point || "",
    end_point: backendData.end_point || "",
    dates: `${backendData.start_date} to ${backendData.end_date}`,
    flexible_dates: backendData.flexible_dates || false,
    preferences: typeof backendData.preferences === 'object' && backendData.preferences?.raw
      ? String(backendData.preferences.raw)
      : "",
    transportation: backendData.transportation || [],
    things_to_do: backendData.things_to_do ?
      (Array.isArray(backendData.things_to_do) ? backendData.things_to_do : []) : [],
    food_dietary: backendData.food_dietary || [],
    citizenship: backendData.citizenship || "",
    budget: backendData.budget?.toString() || "0",
    currency: backendData.currency || "USD",
    purpose_of_trip: (() => {
      if (!backendData.purpose_of_trip) return [];
      if (Array.isArray(backendData.purpose_of_trip)) return backendData.purpose_of_trip;
      if (typeof backendData.purpose_of_trip === 'string') {
        // Try to parse as JSON if it looks like JSON
        if (backendData.purpose_of_trip.startsWith('[') && backendData.purpose_of_trip.endsWith(']')) {
          try {
            const parsed = JSON.parse(backendData.purpose_of_trip);
            return Array.isArray(parsed) ? parsed : [backendData.purpose_of_trip];
          } catch {
            return [backendData.purpose_of_trip];
          }
        }
        return [backendData.purpose_of_trip];
      }
      return [];
    })(),
  };

  // Transform itinerary if it exists
  let proposedItinerary = null;
  if (backendData.itinerary && typeof backendData.itinerary === 'object') {
    // Try to parse itinerary structure - this might need adjustment based on actual backend format
    proposedItinerary = {
      days: [],
      generatedAt: backendData.created_at,
      summary: "Generated itinerary",
      ...(backendData.itinerary as any)
    };
  }

  // Transform tasks using the new format
  let tasks = undefined;
  if (backendData.tasks && typeof backendData.tasks === 'object') {
    const backendTasks = backendData.tasks as any;
    tasks = {
      generalTasks: backendTasks.generalTasks || [],
      destinationSpecificTasks: backendTasks.destinationSpecificTasks || [],
    };
  }

  return {
    answers,
    answeredKeys: Object.keys(answers) as any[],
    questionIndex: 0, // Not relevant for display
    proposedItinerary,
    approvedItinerary: null,
    tasks,
    dockOpen: false,
    createdAt: backendData.created_at,
    updatedAt: backendData.updated_at,
  };
}

export interface TripApiResponse {
  success: boolean;
  data?: TripState;
  error?: string;
}

export interface UpdateTaskResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Fetches a trip by ID from the backend
 */
export async function fetchTripById(id: string): Promise<TripApiResponse> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_PUBLIC_URL || 'http://localhost:4125';
    const response = await fetch(`${backendUrl}/trips/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `HTTP error! status: ${response.status}`,
      };
    }

    const responseData = await response.json();

    // Backend returns { success: true, data: TripState } or { success: false, error: string }
    if (!responseData.success) {
      return {
        success: false,
        error: responseData.error || 'Failed to fetch trip',
      };
    }

    // Transform backend data to frontend format
    const transformedData = transformBackendToFrontend(responseData.data);

    // Validate the transformed data against our schema
    const validatedData = TripStateSchema.parse(transformedData);

    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    console.error('Error fetching trip:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch trip',
    };
  }
}

interface UseTripDataReturn {
  data: TripState | null;
  loading: boolean;
  error: string | null;
  statusCode: number | null;
  refetch: () => void;
}

/**
 * Hook for fetching trip data with loading and error states
 * Includes automatic polling when itinerary or tasks are missing
 */
export function useTripData(id: string | null): UseTripDataReturn {
  const [data, setData] = React.useState<TripState | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [statusCode, setStatusCode] = React.useState<number | null>(null);

  const fetchData = React.useCallback(async (showLoading = true) => {
    if (!id) {
      setData(null);
      setError(null);
      setStatusCode(null);
      return;
    }

    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetchTripById(id);
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to fetch trip');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trip');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [id]);

  // Check if content is still being generated
  const isContentGenerating = React.useMemo(() => {
    if (!data) return false;
    return !data.proposedItinerary || !data.tasks;
  }, [data]);

  // Initial fetch
  React.useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Polling effect - poll every 5 seconds if content is still generating
  React.useEffect(() => {
    if (!isContentGenerating) return;

    console.log('Content still generating, starting polling...');
    const interval = setInterval(() => {
      console.log('Polling for trip updates...');
      fetchData(false); // Don't show loading spinner for polling
    }, 5000);

    return () => {
      console.log('Stopping polling');
      clearInterval(interval);
    };
  }, [isContentGenerating, fetchData]);

  const refetch = React.useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    statusCode,
    refetch,
  };
}

/**
 * Updates a task's completion status
 */
export async function updateTaskCompletion(
  tripId: string,
  taskId: string,
  done: boolean
): Promise<UpdateTaskResponse> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4125';
    const response = await fetch(`${backendUrl}/trips/${tripId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ done }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update task: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating task completion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update task completion',
    };
  }
}

/**
 * Regenerates tasks for a trip using AI
 */
export async function regenerateTasks(tripId: string): Promise<UpdateTaskResponse> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4125';
    const response = await fetch(`${backendUrl}/trips/${tripId}/tasks/regenerate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to regenerate tasks: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error regenerating tasks:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to regenerate tasks',
    };
  }
}

/**
 * Updates trip details
 */
export async function updateTrip(tripId: string, updates: Partial<Answers>): Promise<UpdateTaskResponse> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4125';

    // Transform frontend format to backend format
    const backendUpdates: any = {};

    if (updates.destinations) backendUpdates.destinations = updates.destinations;
    if (updates.starting_point !== undefined) backendUpdates.starting_point = updates.starting_point;
    if (updates.end_point !== undefined) backendUpdates.end_point = updates.end_point;
    if (updates.dates) {
      // Parse dates string into start_date and end_date
      const dateRangeMatch = updates.dates.match(/(\d{4}-\d{2}-\d{2}).*?(\d{4}-\d{2}-\d{2})/);
      if (dateRangeMatch) {
        backendUpdates.start_date = dateRangeMatch[1];
        backendUpdates.end_date = dateRangeMatch[2];
      } else {
        const singleDate = updates.dates.match(/\d{4}-\d{2}-\d{2}/)?.[0];
        const fallbackDate = singleDate || new Date().toISOString().split('T')[0];
        backendUpdates.start_date = fallbackDate;
        backendUpdates.end_date = fallbackDate;
      }
    }
    if (updates.flexible_dates !== undefined) backendUpdates.flexible_dates = updates.flexible_dates;
    if (updates.preferences !== undefined) backendUpdates.preferences = updates.preferences;
    if (updates.transportation) backendUpdates.transportation = updates.transportation;
    if (updates.things_to_do) backendUpdates.things_to_do = updates.things_to_do;
    if (updates.food_dietary) backendUpdates.food_dietary = updates.food_dietary;
    if (updates.citizenship !== undefined) backendUpdates.citizenship = updates.citizenship;
    if (updates.budget !== undefined) backendUpdates.budget = updates.budget;
    if (updates.currency !== undefined) backendUpdates.currency = updates.currency;
    if (updates.purpose_of_trip) backendUpdates.purpose_of_trip = updates.purpose_of_trip;

    const response = await fetch(`${backendUrl}/trips/${tripId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendUpdates),
    });

    if (!response.ok) {
      throw new Error(`Failed to update trip: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating trip:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update trip',
    };
  }
}
