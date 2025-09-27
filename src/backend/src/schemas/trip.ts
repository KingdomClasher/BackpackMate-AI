import { z } from "zod";

export const QAKeySchema = z.enum([
  "dates",
  "destinations",
  "preferences",
  "budget",
  "citizenship",
]);

export type QAKey = z.infer<typeof QAKeySchema>;

export const AnswersSchema = z.object({
  dates: z.string().min(1),
  destinations: z.string().min(1),
  preferences: z.string().default(""),
  budget: z.string().default(""),
  citizenship: z.string().default(""),
});

export type Answers = z.infer<typeof AnswersSchema>;

// Database schema for Supabase trips table
export const TripDatabaseSchema = z.object({
  id: z.string().uuid(),
  destinations: z.array(z.string()),
  starting_point: z.string().nullable().optional(),
  end_point: z.string().nullable().optional(),
  start_date: z.string(),
  end_date: z.string(),
  flexible_dates: z.boolean().default(false),
  preferences: z.record(z.unknown()),
  transportation: z.array(z.string()).nullable().optional(),
  things_to_do: z.record(z.unknown()).nullable().optional(),
  food_dietary: z.array(z.string()).nullable().optional(),
  citizenship: z.string(),
  budget: z.number().int(),
  currency: z.string().nullable().optional(),
  purpose_of_trip: z.string().nullable().optional(),
  itinerary: z.record(z.unknown()).nullable().optional(),
  tasks: z.record(z.unknown()).nullable().optional(),
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

// Utility function to transform frontend answers to database format
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
    destinations: answers.destinations.split(',').map(d => d.trim()).filter(Boolean),
    start_date,
    end_date,
    preferences: {
      raw: answers.preferences,
      parsed: {} // Can be enhanced later with structured preferences
    },
    citizenship: answers.citizenship,
    budget: parseInt(answers.budget.replace(/[^0-9]/g, '')) || 0,
    currency: 'USD', // Default, could be extracted from budget string
    flexible_dates: false, // Default, could be inferred from answers
  };
};

export const ItineraryTaskSchema = z.object({
  id: z.string(),
  text: z.string(),
  done: z.boolean().default(false),
});
export type ItineraryTask = z.infer<typeof ItineraryTaskSchema>;

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

export const DestinationTasksSchema = z.record(
  z.string(),
  z.array(ItineraryTaskSchema)
);
export type DestinationTasks = z.infer<typeof DestinationTasksSchema>;

export const ProposalResponseSchema = z.object({
  itinerary: ProposedItinerarySchema,
  generalTasks: z.array(ItineraryTaskSchema),
  destinationTasks: DestinationTasksSchema,
});
export type ProposalResponse = z.infer<typeof ProposalResponseSchema>;

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
