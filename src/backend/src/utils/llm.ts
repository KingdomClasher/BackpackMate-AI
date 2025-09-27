import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { ChatMessage } from "../schemas/trip";

const SYSTEM_PROMPT = `You are BackpackMate, a warm and practical travel copilot.
- You specialise in itineraries, logistics, and keeping travellers on track.
- Keep answers concise but actionable (1-2 short paragraphs or bullet lists).
- Offer next steps or suggestions when the user seems unsure.
- Respect that actual state changes happen in the UI; suggest, but don’t assume changes are made.
- When unsure, ask a clarifying question instead of guessing.
`;

const FALLBACK_RESPONSE =
  "Got it! Let me know if you'd like help adding tasks or tweaking the itinerary.";

let cachedClient: OpenAI | null = null;

const getClient = () => {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  cachedClient = new OpenAI({ apiKey });
  return cachedClient;
};

interface LLMResult {
  reply: string;
  directives: unknown[];
}

export async function callAssistantLLM(messages: ChatMessage[]): Promise<LLMResult> {
  const client = getClient();
  if (!client) {
    return { reply: FALLBACK_RESPONSE, directives: [] };
  }

  const formatted: ChatCompletionMessageParam[] = messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...formatted,
      ],
      temperature: 0.6,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "assistantHandlers",
          schema: {
            type: "object",
            properties: {
              reply: { type: "string" },
              directives: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                  },
                  required: ["type"],
                  additionalProperties: true,
                },
                default: [],
              },
            },
            required: ["reply"],
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      return { reply: FALLBACK_RESPONSE, directives: [] };
    }

    const parsed = JSON.parse(content) as { reply: string; directives?: unknown[] };
    return {
      reply: parsed.reply?.trim() || FALLBACK_RESPONSE,
      directives: Array.isArray(parsed.directives) ? parsed.directives : [],
    };
  } catch (error) {
    console.error("Assistant LLM call failed", error);
    return { reply: FALLBACK_RESPONSE, directives: [] };
  }
}
