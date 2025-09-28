import {
  ProposedItinerary,
  ProposedItinerarySchema,
  TripDatabase,
  UpdateTrip,
  Answers,
  Tasks,
  parseDateRangeFromAnswers,
} from "../../schemas/trip";
import { tripService } from "../../services/tripService";
import {
  createItineraryFromDestinations,
  createPromptFromAnswers,
  generateAITasksFromAnswers,
  generateTasksFromAnswers,
} from "../workflows/itinerary-workflow";
import { travelAgent } from "../agents/travel-agent";
import { runWithTripContext } from "./tripExecutionContext";

const BASIC_INFO_FIELDS = new Set<keyof UpdateTrip | string>([
  "destinations",
  "start_date",
  "end_date",
  "budget",
  "currency",
  "purpose_of_trip",
  "transportation",
  "things_to_do",
  "starting_point",
  "end_point",
  "flexible_dates",
  "preferences",
  "citizenship",
]);

export function touchesBasicTripInfo(updates: UpdateTrip): boolean {
  return Object.keys(updates).some((key) => BASIC_INFO_FIELDS.has(key));
}

function normalizeArray(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map(String).filter(Boolean);
  }
  if (typeof input === "string") {
    if (input.trim().startsWith("[") && input.trim().endsWith("]")) {
      try {
        const parsed = JSON.parse(input);
        return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [input];
      } catch {
        return [input];
      }
    }
    return [input];
  }
  if (typeof input === "object") {
    return Object.values(input as Record<string, unknown>)
      .map((value) => (value == null ? "" : String(value)))
      .filter(Boolean);
  }
  return [];
}

function tripToAnswers(trip: TripDatabase): Answers {
  const start = trip.start_date ?? "";
  const end = trip.end_date ?? "";
  const dateRange = start && end ? `${start} to ${end}` : start || end || "";

  return {
    destinations: Array.isArray(trip.destinations) ? trip.destinations : normalizeArray(trip.destinations),
    starting_point: trip.starting_point ?? "",
    end_point: trip.end_point ?? "",
    dates: dateRange,
    flexible_dates: trip.flexible_dates ?? false,
    preferences:
      typeof trip.preferences === "string"
        ? trip.preferences
        : JSON.stringify(trip.preferences ?? {}),
    transportation: normalizeArray(trip.transportation),
    things_to_do: normalizeArray(trip.things_to_do),
    food_dietary: normalizeArray(trip.food_dietary),
    citizenship: trip.citizenship ?? "",
    budget:
      typeof trip.budget === "number"
        ? trip.budget.toString()
        : trip.budget ?? "2000",
    currency: trip.currency ?? "USD",
    purpose_of_trip: normalizeArray(trip.purpose_of_trip),
  };
}

function alignItineraryToDates(itinerary: ProposedItinerary, answers: Answers): ProposedItinerary {
  const { start_date, end_date } = parseDateRangeFromAnswers(answers.dates);
  if (!start_date) {
    return itinerary;
  }

  const baseDate = new Date(start_date);
  if (Number.isNaN(baseDate.getTime())) {
    return itinerary;
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const desiredDays = end_date
    ? Math.max(1, Math.round((new Date(end_date).getTime() - baseDate.getTime()) / msPerDay) + 1)
    : itinerary.days?.length ?? 1;

  let days = itinerary.days ?? [];

  if (desiredDays && days.length !== desiredDays) {
    if (days.length > desiredDays) {
      days = days.slice(0, desiredDays);
    } else {
      const fallbackDays = createItineraryFromDestinations(answers.destinations, answers, desiredDays).days;
      days = [...days, ...fallbackDays.slice(days.length, desiredDays)];
    }
  }

  return {
    ...itinerary,
    days: days.map((day, index) => {
      const normalizedDate = new Date(baseDate.getTime() + index * msPerDay);
      return {
        ...day,
        date: normalizedDate.toISOString().split('T')[0],
      };
    }),
  };
}

async function generateItinerary(answers: Answers): Promise<ProposedItinerary> {
  const prompt = createPromptFromAnswers(answers);
  const response = await travelAgent.generateVNext(
    [
      {
        role: "system",
        content:
          "You are a travel planning expert. Generate a detailed day-by-day itinerary based on the user preferences. Each day should include specific activities with descriptions, locations, and estimated costs.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    {
      output: ProposedItinerarySchema,
    }
  );

  const baseItinerary = response.object ?? createItineraryFromDestinations(answers.destinations, answers);
  return alignItineraryToDates(baseItinerary, answers);
}

async function generateTasks(answers: Answers): Promise<Tasks> {
  try {
    return await generateAITasksFromAnswers(answers, travelAgent);
  } catch (error) {
    console.warn("AI task generation failed, falling back to rule-based tasks", error);
    return generateTasksFromAnswers(answers);
  }
}

export async function regenerateTripContent(
  tripId: string,
  baseTrip?: TripDatabase
): Promise<TripDatabase> {
  return runWithTripContext({ tripId }, async () => {
    const sourceTrip = baseTrip ?? (await tripService.getTripById(tripId));
    if (!sourceTrip) {
      throw new Error(`Trip ${tripId} not found`);
    }

    console.log(`[regen] Starting itinerary/tasks regeneration for trip ${tripId}`);
    const answers = tripToAnswers(sourceTrip);

    let itinerary: ProposedItinerary;
    let tasks;

    try {
      itinerary = await generateItinerary(answers);
      console.log(
        `[regen] Generated itinerary with ${itinerary.days?.length ?? 0} days for trip ${tripId}`
      );
  } catch (error) {
    console.error(`Failed to generate AI itinerary for trip ${tripId}:`, error);
    itinerary = alignItineraryToDates(createItineraryFromDestinations(answers.destinations, answers), answers);
  }

    try {
      tasks = await generateTasks(answers);
      console.log(
        `[regen] Generated ${tasks.generalTasks.length} general and ${tasks.destinationSpecificTasks.length} destination-specific tasks for trip ${tripId}`
      );
    } catch (error) {
      console.error(`Failed to generate tasks for trip ${tripId}:`, error);
      tasks = generateTasksFromAnswers(answers);
    }

    await tripService.updateTrip(tripId, {
      itinerary,
      tasks,
    });

    const refreshed = await tripService.getTripById(tripId);
    if (!refreshed) {
      throw new Error(`Trip ${tripId} unavailable after regeneration`);
    }

    console.log(`[regen] Completed regeneration for trip ${tripId}`);
    return refreshed;
  });
}
