import { v4 as uuidv4 } from "uuid";
import { ChatMessage, CedarLLMResponse } from "../schemas/trip";
import { generateAssistantReply } from "./llm";

const timePattern = /(\d{1,2}:\d{2})\s*(?:[-–to]+)\s*(\d{1,2}:\d{2})/i;

const cleanCity = (input: string) => input.trim().replace(/\.$/, "");

interface ParsedCommand {
  response: string;
  objects?: unknown[];
}

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

const handleAddTask = (message: string): ParsedCommand | null => {
  const match = message.match(/add (?:a )?task (?:called )?([\w\s]+?)(?: for| in) ([\w\s]+)/i);
  if (!match) return null;
  const [, taskTextRaw, cityRaw] = match;
  const city = cleanCity(cityRaw);
  const id = `${city.toLowerCase().replace(/\s+/g, "-")}-task-${uuidv4().slice(0, 8)}`;
  const taskText = taskTextRaw.trim();

  return {
    response: `Added “${taskText}” to your ${city} checklist.`,
    objects: [
      buildSetState("destinationTasks", "addDestinationTask", {
        city,
        task: { id, text: taskText, done: false },
      }),
    ],
  };
};

const handleToggleTask = (message: string): ParsedCommand | null => {
  const match = message.match(/mark (.+?) (?:as )?(done|complete|completed)/i);
  if (!match) return null;
  const [, taskText] = match;

  return {
    response: `Great! Be sure to tick “${taskText.trim()}” off in your checklist.`,
  };
};

const handleAddCalendarItem = (message: string): ParsedCommand | null => {
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
  messages: ChatMessage[]
): Promise<CedarLLMResponse> => {
  const latestUser = [...messages].reverse().find((msg) => msg.role === "user");
  if (!latestUser) {
    return { content: "How can I help with your trip?" };
  }

  const commandHandlers = [
    handleAddTask,
    handleToggleTask,
    handleAddCalendarItem,
  ];

  for (const handler of commandHandlers) {
    const result = handler(latestUser.content);
    if (result) {
      return {
        content: result.response,
        object: result.objects,
      };
    }
  }

  const aiReply = await generateAssistantReply(messages);
  return {
    content: aiReply,
  };
};
