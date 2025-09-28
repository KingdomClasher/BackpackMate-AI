import { z } from "zod";

export const QAKeySchema = z.enum([
  "destinations",
  "starting_point",
  "end_point",
  "dates",
  "flexible_dates",
  "preferences",
  "transportation",
  "things_to_do",
  "food_dietary",
  "citizenship",
  "budget",
  "currency",
  "purpose_of_trip",
]);

export type QAKey = z.infer<typeof QAKeySchema>;

// Individual field schemas for type safety
export const DestinationsSchema = z.array(z.string()).default([]);
export const TransportationSchema = z.array(z.string()).default([]);
export const ThingsToDoSchema = z.array(z.string()).default([]);
export const FoodDietarySchema = z.array(z.string()).default([]);
export const PurposeOfTripSchema = z.array(z.string()).default([]);

export const AnswerSchema = z.object({
  destinations: DestinationsSchema,
  starting_point: z.string().default(""),
  end_point: z.string().default(""),
  dates: z.string().default(""), // Will store date range as string for now
  flexible_dates: z.boolean().default(false),
  preferences: z.string().default(""), // Will store as string, can be parsed as JSON later
  transportation: TransportationSchema,
  things_to_do: ThingsToDoSchema,
  food_dietary: FoodDietarySchema,
  citizenship: z.string().default(""),
  budget: z.string().default("2000"), // Default budget
  currency: z.string().default("USD"),
  purpose_of_trip: PurposeOfTripSchema,
});

export type Answers = z.infer<typeof AnswerSchema>;

// Task schemas
export const ItineraryTaskSchema = z.object({
  id: z.string(),
  text: z.string(),
  done: z.boolean().default(false),
});
export type ItineraryTask = z.infer<typeof ItineraryTaskSchema>;

export const DestinationSpecificTaskSchema = z.object({
  location: z.string(),
  id: z.string(),
  text: z.string(),
  done: z.boolean().default(false),
});
export type DestinationSpecificTask = z.infer<typeof DestinationSpecificTaskSchema>;

export const ItineraryItemSchema = z.object({
  id: z.string(),
  timeStart: z.string(),
  timeEnd: z.string(),
  title: z.string(),
  note: z.string().optional(),
  tasks: z.array(z.string()).optional(),
});
export type ItineraryItem = z.infer<typeof ItineraryItemSchema>;

export const ItineraryDaySchema = z.object({
  id: z.string(),
  date: z.string(),
  city: z.string(),
  items: z.array(ItineraryItemSchema),
});
export type ItineraryDay = z.infer<typeof ItineraryDaySchema>;

export const ProposedItinerarySchema = z.object({
  days: z.array(ItineraryDaySchema),
  generatedAt: z.string(),
  summary: z.string(),
});
export type ProposedItinerary = z.infer<typeof ProposedItinerarySchema>;

export const TasksSchema = z.object({
  generalTasks: z.array(ItineraryTaskSchema),
  destinationSpecificTasks: z.array(DestinationSpecificTaskSchema),
});
export type Tasks = z.infer<typeof TasksSchema>;

// Database schema for Supabase trips table
export const TripDatabaseSchema = z.object({
  id: z.string().uuid(),
  destinations: z.array(z.string()),
  starting_point: z.string().nullable().optional(),
  end_point: z.string().nullable().optional(),
  start_date: z.string(),
  end_date: z.string(),
  flexible_dates: z.boolean().default(false),
  preferences: z.string().default(""), // Changed to string to match frontend
  transportation: z.array(z.string()).nullable().optional(),
  things_to_do: z.array(z.string()).nullable().optional(), // Changed to array to match frontend
  food_dietary: z.array(z.string()).nullable().optional(),
  citizenship: z.string(),
  budget: z.string().default("2000"), // Changed to string to match frontend
  currency: z.string().nullable().optional(),
  purpose_of_trip: z.array(z.string()).nullable().optional(), // Changed to array to match frontend
  itinerary: ProposedItinerarySchema.nullable().optional(), // Use ProposedItinerarySchema
  tasks: TasksSchema.nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type TripDatabase = z.infer<typeof TripDatabaseSchema>;

// Schema for creating a new trip (without auto-generated fields)
export const CreateTripSchema = TripDatabaseSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial({
  starting_point: true,
  end_point: true,
  transportation: true,
  things_to_do: true,
  food_dietary: true,
  currency: true,
  purpose_of_trip: true,
  itinerary: true,
  tasks: true,
});

export type CreateTrip = z.infer<typeof CreateTripSchema>;

// Schema for updating a trip
export const UpdateTripSchema = CreateTripSchema.partial();
export type UpdateTrip = z.infer<typeof UpdateTripSchema>;

// Legacy utility function for backward compatibility
export const transformAnswersToDatabase = (answers: Answers): CreateTrip => {
  // Parse dates string into start_date and end_date
  const parseDateRange = (dateString: string) => {
    // Handle various date formats like "2024-01-15 to 2024-01-25"
    const dateRangeMatch = dateString.match(/(\d{4}-\d{2}-\d{2}).*?(\d{4}-\d{2}-\d{2})/);
    if (dateRangeMatch) {
      return {
        start_date: dateRangeMatch[1],
        end_date: dateRangeMatch[2],
      };
    }
    // Fallback - assume single date for now
    const singleDate = dateString.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    const fallbackDate = singleDate || new Date().toISOString().split('T')[0];
    return {
      start_date: fallbackDate,
      end_date: fallbackDate,
    };
  };

  const { start_date, end_date } = parseDateRange(answers.dates);

  return {
    destinations: answers.destinations,
    starting_point: answers.starting_point || null,
    end_point: answers.end_point || null,
    start_date,
    end_date,
    flexible_dates: answers.flexible_dates,
    preferences: answers.preferences,
    transportation: answers.transportation.length > 0 ? answers.transportation : null,
    things_to_do: answers.things_to_do.length > 0 ? answers.things_to_do : null,
    food_dietary: answers.food_dietary.length > 0 ? answers.food_dietary : null,
    citizenship: answers.citizenship,
    budget: answers.budget,
    currency: answers.currency || null,
    purpose_of_trip: answers.purpose_of_trip.length > 0 ? answers.purpose_of_trip : null,
    itinerary: null,
    tasks: null,
  };
};

// Utility function to create a complete trip from answers, itinerary, and tasks
export const createTripFromComponents = (
  answers: Answers,
  itinerary: ProposedItinerary,
  tasks: Tasks
): CreateTrip => {
  // Parse dates string into start_date and end_date
  const parseDateRange = (dateString: string) => {
    // Handle various date formats like "2024-01-15 to 2024-01-25"
    const dateRangeMatch = dateString.match(/(\d{4}-\d{2}-\d{2}).*?(\d{4}-\d{2}-\d{2})/);
    if (dateRangeMatch) {
      return {
        start_date: dateRangeMatch[1],
        end_date: dateRangeMatch[2],
      };
    }
    // Fallback - assume single date for now
    const singleDate = dateString.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    const fallbackDate = singleDate || new Date().toISOString().split('T')[0];
    return {
      start_date: fallbackDate,
      end_date: fallbackDate,
    };
  };

  const { start_date, end_date } = parseDateRange(answers.dates);

  return {
    destinations: answers.destinations,
    starting_point: answers.starting_point || null,
    end_point: answers.end_point || null,
    start_date,
    end_date,
    flexible_dates: answers.flexible_dates,
    preferences: answers.preferences, // Now stored as string to match frontend
    transportation: answers.transportation.length > 0 ? answers.transportation : null,
    things_to_do: answers.things_to_do.length > 0 ? answers.things_to_do : null, // Now array to match frontend
    food_dietary: answers.food_dietary.length > 0 ? answers.food_dietary : null,
    citizenship: answers.citizenship,
    budget: answers.budget, // Now stored as string to match frontend
    currency: answers.currency || null,
    purpose_of_trip: answers.purpose_of_trip.length > 0 ? answers.purpose_of_trip : null, // Now array to match frontend
    itinerary: itinerary,
    tasks: tasks,
  };
};

export const CORE_QUESTIONS: { id: QAKey; question: string }[] = [
  { id: "destinations", question: "Which destinations would you like to visit?" },
  { id: "starting_point", question: "Where will you be starting your trip from?" },
  { id: "end_point", question: "Where would you like to end your trip?" },
  { id: "dates", question: "When are you planning to travel?" },
  { id: "flexible_dates", question: "Are you flexible with your travel dates?" },
  { id: "preferences", question: "Describe your travel style and preferences." },
  { id: "transportation", question: "What modes of transportation do you prefer?" },
  { id: "things_to_do", question: "What activities or attractions interest you most?" },
  { id: "food_dietary", question: "Do you have any dietary restrictions or food preferences?" },
  { id: "citizenship", question: "What is your citizenship/nationality?" },
  { id: "currency", question: "What currency would you like to use for budgeting?" },
  { id: "budget", question: "What is your approximate budget for this trip?" },
  { id: "purpose_of_trip", question: "What is the main purpose of your trip?" },
];

export const DEFAULT_GENERAL_TASKS: ItineraryTask[] = [
  { id: "passport-check", text: "Confirm passport validity (at least 6 months before expiration)", done: false },
  { id: "travel-insurance", text: "Purchase international travel insurance", done: false },
  { id: "vaccines", text: "Review vaccine requirements", done: false },
  { id: "visa-check", text: "Check visa requirements", done: false },
];

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema),
  threadId: z.string().optional(),
  resourceId: z.string().optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export interface CedarLLMResponse {
  content: string;
  object?: unknown;
  metadata?: Record<string, unknown>;
}
