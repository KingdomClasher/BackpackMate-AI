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
