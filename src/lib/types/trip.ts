import { z } from "zod";

export const QAKeySchema = z.enum([
  "dates",
  "destinations",
  "preferences",
  "budget",
  "citizenship",
]);

export type QAKey = z.infer<typeof QAKeySchema>;

export const AnswerSchema = z.record(QAKeySchema, z.string().default(""));
export type Answers = z.infer<typeof AnswerSchema>;

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

export const ProposalResponseSchema = z.object({
  itinerary: ProposedItinerarySchema,
  generalTasks: z.array(ItineraryTaskSchema).optional(),
  destinationTasks: DestinationTasksSchema.optional(),
});
export type ProposalResponse = z.infer<typeof ProposalResponseSchema>;

export const TripStateSchema = z.object({
  answers: AnswerSchema,
  answeredKeys: z.array(QAKeySchema),
  questionIndex: z.number().min(0),
  proposedItinerary: ProposedItinerarySchema.nullable(),
  approvedItinerary: z.array(ItineraryDaySchema).nullable(),
  generalTasks: z.array(ItineraryTaskSchema),
  destinationTasks: DestinationTasksSchema,
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
  lastSavedAt: z.string().optional(),
});

export type TripState = z.infer<typeof TripStateSchema>;

export type TripAction =
  | { type: "SET_ANSWER"; key: QAKey; value: string }
  | { type: "SET_PROPOSED_ITINERARY"; value: ProposedItinerary | null }
  | { type: "APPROVE_ITINERARY" }
  | { type: "ADVANCE_QUESTION" }
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
  { id: "dates", question: "When are you traveling?" },
  { id: "destinations", question: "Which destinations are on your list?" },
  { id: "preferences", question: "Describe your travel style and must-do experiences." },
  { id: "budget", question: "What budget range are you working with?" },
  { id: "citizenship", question: "What passport will you use for this trip?" },
];

export const DEFAULT_GENERAL_TASKS: ItineraryTask[] = [
  { id: "passport-check", text: "Confirm passport validity (6 months)", done: false },
  { id: "travel-insurance", text: "Purchase travel insurance", done: false },
  { id: "vaccines", text: "Review vaccine requirements", done: false },
  { id: "visa-check", text: "Check visa requirements", done: false },
];

export const createInitialTripState = (): TripState =>
  TripStateSchema.parse({
    answers: AnswerSchema.parse({
      dates: "",
      destinations: "",
      preferences: "",
      budget: "",
      citizenship: "",
    }),
    answeredKeys: [],
    questionIndex: 0,
    proposedItinerary: null,
    approvedItinerary: null,
    generalTasks: DEFAULT_GENERAL_TASKS,
    destinationTasks: {},
    dockOpen: false,
    pendingMessage: undefined,
    activeModal: null,
    calendarSelection: null,
    lastSavedAt: undefined,
  });
