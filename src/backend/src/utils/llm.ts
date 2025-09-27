import OpenAI from "openai";
import { ChatMessage } from "../schemas/trip";

const SYSTEM_PROMPT = `You are BackpackMate, a helpful travel planning copilot.
- Be concise, friendly, and practical.
- Reference the current trip context when possible.
- Offer next steps or suggestions if the user seems unsure.
- You can suggest tasks or itinerary tweaks, but actual changes happen only when explicitly asked (the frontend will trigger setters).
- If you need more info, ask a short clarifying question.
`;

const FALLBACK_RESPONSE =
  "Got it! Let me know if you'd like me to add tasks, adjust the schedule, or dive deeper.";

let openaiClient: OpenAI | null = null;

const getClient = () => {
  if (openaiClient) return openaiClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
};

export async function generateAssistantReply(messages: ChatMessage[]): Promise<string> {
  const client = getClient();
  if (!client) {
    return FALLBACK_RESPONSE;
  }

  try {
    const formatted = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...formatted,
      ],
    });

    return (
      completion.choices?.[0]?.message?.content?.trim() ?? FALLBACK_RESPONSE
    );
  } catch (error) {
    console.error("LLM response failed", error);
    return FALLBACK_RESPONSE;
  }
}
