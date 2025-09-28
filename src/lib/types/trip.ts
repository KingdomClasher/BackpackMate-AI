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

export const TasksSchema = z.object({
  generalTasks: z.array(ItineraryTaskSchema),
  destinationSpecificTasks: z.array(DestinationSpecificTaskSchema),
});
export type Tasks = z.infer<typeof TasksSchema>;

// Keep the old schema for backward compatibility
export const DestinationTasksSchema = z.record(
  z.string(),
  z.array(ItineraryTaskSchema)
);
export type DestinationTasks = z.infer<typeof DestinationTasksSchema>;

export const ProposedItinerarySchema = z.object({
  days: z.array(ItineraryDaySchema),
  generatedAt: z.string(),
  summary: z.string(),
});
export type ProposedItinerary = z.infer<typeof ProposedItinerarySchema>;


export const TripStateSchema = z.object({
  answers: AnswerSchema,
  answeredKeys: z.array(QAKeySchema),
  questionIndex: z.number().min(0),
  proposedItinerary: ProposedItinerarySchema.nullable(),
  approvedItinerary: z.array(ItineraryDaySchema).nullable(),
  // New tasks format
  tasks: TasksSchema.optional(),
  dockOpen: z.boolean(),
  pendingMessage: z.string().optional(),
  activeModal: z
    .object({ dayId: z.string(), itemId: z.string() })
    .nullable()
    .optional(),
  calendarSelection: z
    .object({ date: z.string(), city: z.string() })
    .nullable()
    .optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type TripState = z.infer<typeof TripStateSchema>;

export type TripAction =
  | { type: "SET_ANSWER"; key: QAKey; value: string | string[] | boolean }
  | { type: "SET_PROPOSED_ITINERARY"; value: ProposedItinerary | null }
  | { type: "APPROVE_ITINERARY" }
  | { type: "ADVANCE_QUESTION" }
  | { type: "GO_BACK_QUESTION" }
  | { type: "SET_GENERAL_TASKS"; value: ItineraryTask[] }
  | { type: "TOGGLE_GENERAL_TASK"; id: string }
  | { type: "TOGGLE_DESTINATION_TASK"; city: string; id: string }
  | { type: "ADD_DESTINATION_TASK"; city: string; task: ItineraryTask }
  | { type: "SET_DESTINATION_TASKS"; value: DestinationTasks }
  | { type: "OPEN_MODAL"; payload: { dayId: string; itemId: string } }
  | { type: "CLOSE_MODAL" }
  | { type: "SET_DOCK_OPEN"; value: boolean }
  | { type: "SET_PENDING_MESSAGE"; value: string | undefined }
  | { type: "SET_CALENDAR_SELECTION"; value: TripState["calendarSelection"] }
  | { type: "UPDATE_APPROVED_ITINERARY"; value: ItineraryDay[] }
  | { type: "HYDRATE"; value: TripState }
  | { type: "RESET" };

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

export const createInitialTripState = (): TripState =>
  TripStateSchema.parse({
    answers: AnswerSchema.parse({
      destinations: [],
      starting_point: "",
      end_point: "",
      dates: "",
      flexible_dates: false,
      preferences: "",
      transportation: [],
      things_to_do: [],
      food_dietary: [],
      citizenship: "",
      budget: "2000",
      currency: "USD",
      purpose_of_trip: [],
    }),
    answeredKeys: [],
    questionIndex: 0,
    proposedItinerary: null,
    approvedItinerary: null,
    // New tasks format
    tasks: {
      generalTasks: DEFAULT_GENERAL_TASKS,
      destinationSpecificTasks: [],
    },
    dockOpen: false,
    pendingMessage: undefined,
    activeModal: null,
    calendarSelection: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
