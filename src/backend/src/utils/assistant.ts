import { v4 as uuidv4 } from "uuid";
import { ChatMessage, CedarLLMResponse } from "../schemas/trip";
import { callAssistantLLM } from "./llm";
import { travelAgent } from "../mastra/agents/travel-agent";
import { runWithTripContext } from "../mastra/utils/tripExecutionContext";
import { tripService } from "../services/tripService";

const timePattern = /(\d{1,2}:\d{2})\s*(?:[-–to]+)\s*(\d{1,2}:\d{2})/i;

const cleanCity = (input: string) => input.trim().replace(/\.$/, "");

const buildSetState = (
  stateKey: string,
  setterKey: string,
  args: Record<string, unknown>
) => ({
  type: "setState",
  stateKey,
  setterKey,
  args,
});

type CommandResult = {
  response: string;
  directives?: unknown[];
};

const handleAddTask = (message: string): CommandResult | null => {
  const match = message.match(/add (?:a )?task (?:called )?([\w\s]+?)(?: for| in) ([\w\s]+)/i);
  if (!match) return null;
  const [, taskTextRaw, cityRaw] = match;
  const city = cleanCity(cityRaw);
  const id = `${city.toLowerCase().replace(/\s+/g, "-")}-task-${uuidv4().slice(0, 8)}`;
  const taskText = taskTextRaw.trim();

  return {
    response: `Added “${taskText}” to your ${city} checklist.`,
    directives: [
      buildSetState("destinationTasks", "addDestinationTask", {
        city,
        task: { id, text: taskText, done: false },
      }),
    ],
  };
};

const handleToggleTask = (message: string): CommandResult | null => {
  const match = message.match(/mark (.+?) (?:as )?(done|complete|completed)/i);
  if (!match) return null;
  const [, taskText] = match;

  return {
    response: `Great! Be sure to tick “${taskText.trim()}” off in your checklist.`,
  };
};

const handleAddCalendarItem = (message: string): CommandResult | null => {
  const match = message.match(/add (.+?) in ([\w\s]+) (?:on ([\w\s-]+) )?(\d{1,2}:\d{2}[-–to]+\d{1,2}:\d{2})/i);
  if (!match) return null;
  const [, titleRaw, cityRaw, dateRaw, timeRange] = match;
  const city = cleanCity(cityRaw);
  const title = titleRaw.trim();
  const timeMatch = timePattern.exec(timeRange);
  const timeStart = timeMatch ? timeMatch[1] : "19:00";
  const timeEnd = timeMatch ? timeMatch[2] : "21:00";

  return {
    response: `Planned “${title}” in ${city} from ${timeStart} to ${timeEnd}.`
      + (dateRaw ? ` Target date: ${dateRaw.trim()}.` : "")
      + " Jump into the itinerary tab if you'd like to drop it onto the calendar.",
  };
};

export const processAssistantMessage = async (
  messages: ChatMessage[],
  context?: { tripId?: string }
): Promise<CedarLLMResponse> => {
  console.log('processAssistantMessage called with context:', context);

  const latestUser = [...messages].reverse().find((msg) => msg.role === "user");
  if (!latestUser) {
    return { content: "How can I help with your trip?" };
  }

  try {
    // Inject trip context if available
    let contextualMessages: ChatMessage[] = [...messages];
    if (context?.tripId) {
      console.log('Assistant: Loading trip context for tripId:', context.tripId);
      try {
        const trip = await tripService.getTripById(context.tripId);
        if (trip) {
          console.log('Assistant: Successfully loaded trip:', { id: trip.id, destinations: trip.destinations });
          // Add trip context as a system message
          const tripContextMessage: ChatMessage = {
            role: 'system',
            content: `You are helping with a specific trip. Here are the current trip details:

TRIP ID: ${trip.id} (IMPORTANT: Use this exact ID when calling any trip-related tools)
DESTINATIONS: ${trip.destinations?.join(', ') || 'None'}
DATES: ${trip.start_date} to ${trip.end_date}
BUDGET: ${trip.currency} ${trip.budget}
PURPOSE: ${Array.isArray(trip.purpose_of_trip) ? trip.purpose_of_trip.join(', ') : trip.purpose_of_trip || 'Not specified'}
ITINERARY: ${trip.itinerary ? 'Generated' : 'Not yet generated'}
TASKS: ${trip.tasks ? 'Generated' : 'Not yet generated'}

CRITICAL INSTRUCTIONS:
- This trip has ID: ${trip.id}
- When using ANY trip-related tools, you MUST use the exact tripId: "${trip.id}"
- For adding destinations: use updateTripTool with tripId "${trip.id}" and update destinations array
- For adding tasks: use addTaskTool with tripId "${trip.id}"
- For getting trip info: use getTripTool with tripId "${trip.id}"
- DO NOT use placeholder values like "uuid" - always use the actual ID: "${trip.id}"`
          };

          // Insert context message after any existing system messages
          const systemMessageCount = contextualMessages.filter((m: ChatMessage) => m.role === 'system').length;
          contextualMessages.splice(systemMessageCount, 0, tripContextMessage);
        } else {
          console.warn('Assistant: Trip not found for tripId:', context.tripId);
        }
      } catch (error) {
        console.warn('Assistant: Failed to load trip context:', error);
      }
    }

    // Use travel agent to process the message with full context and tools
    console.log('Processing chat with context:', { tripId: context?.tripId, messageCount: contextualMessages.length });

    // Convert messages to the format expected by generateVNext
    const agentMessages = contextualMessages.map((msg: ChatMessage) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    // Use streamVNext method (required for v2 models like gpt-4o-mini)
    const runAgent = () => travelAgent.streamVNext(agentMessages as any);
    const stream = context?.tripId
      ? await runWithTripContext({ tripId: context.tripId }, runAgent)
      : await runAgent();

    let text = '';
    let toolResults: any[] = [];

    for await (const chunk of stream.textStream) {
      text += chunk;
    }

    console.log('Agent response:', { hasText: !!text, toolResults: toolResults.length });

    return {
      content: text || "I'm here to help with your trip!",
      object: toolResults.length ? toolResults : undefined,
    };
  } catch (error) {
    console.error('Travel agent processing error:', error);

    // Fallback to basic processing
    const commandHandlers: ((message: string) => CommandResult | null)[] = [
      handleAddTask,
      handleToggleTask,
      handleAddCalendarItem,
    ];
    const directives: unknown[] = [];

    for (const handler of commandHandlers) {
      const result = handler(latestUser.content);
      if (!result) continue;
      if (result.directives) {
        directives.push(...result.directives);
      }
      return {
        content: result.response,
        object: directives.length ? directives : undefined,
      };
    }

    const { reply, directives: llmDirectives } = await callAssistantLLM(messages);

    return {
      content: reply,
      object: llmDirectives.length ? llmDirectives : directives.length ? directives : undefined,
    };
  }
};
