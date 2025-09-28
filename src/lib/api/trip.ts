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
  things_to_do?: Record<string, unknown> | null;
  food_dietary?: string[] | null;
  citizenship: string;
  budget: number;
  currency?: string | null;
  purpose_of_trip?: string | null;
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
    purpose_of_trip: backendData.purpose_of_trip ? [backendData.purpose_of_trip] : [],
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
    const backendUrl = process.env.NEXT_PUBLIC_PUBLIC_URL || 'http://localhost:4112';
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
 */
export function useTripData(id: string | null): UseTripDataReturn {
  const [data, setData] = React.useState<TripState | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [statusCode, setStatusCode] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!id) {
      setData(null);
      setError(null);
      setStatusCode(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetchTripById(id)
      .then((response) => {
        if (response.success && response.data) {
          setData(response.data);
        } else {
          setError(response.error || 'Failed to fetch trip');
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch trip');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const refetch = React.useCallback(() => {
    if (id) {
      setLoading(true);
      setError(null);

      fetchTripById(id)
        .then((response) => {
          if (response.success && response.data) {
            setData(response.data);
          } else {
            setError(response.error || 'Failed to fetch trip');
          }
        })
        .catch((err) => {
          setError(err.message || 'Failed to fetch trip');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id]);

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
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4112';
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
