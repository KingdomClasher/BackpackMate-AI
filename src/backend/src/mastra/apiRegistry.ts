import { registerApiRoute } from "@mastra/core/server";
import { z } from "zod";
import { AnswersSchema, ChatRequest, ChatRequestSchema, ProposalResponseSchema } from "../schemas/trip";
import { generateItineraryProposal } from "../utils/itineraryGenerator";
import { processAssistantMessage } from "../utils/assistant";
import { createSSEStream, streamJSONEvent } from "../utils/streamUtils";

const ProposalRequestSchema = z.object({
  answers: AnswersSchema,
});

export const apiRoutes = [
  registerApiRoute("/onboarding/itinerary-proposal", {
    method: "POST",
    handler: async (context) => {
      try {
        const body = await context.req.json();
        const { answers } = ProposalRequestSchema.parse(body);
        const proposal = generateItineraryProposal(answers);
        return context.json(ProposalResponseSchema.parse(proposal));
      } catch (error) {
        console.error("Itinerary proposal failed", error);
        const message =
          error instanceof Error ? error.message : "Unable to generate itinerary";
        return context.json({ error: message }, 500);
      }
    },
  }),
  registerApiRoute("/chat/execute-function", {
    method: "POST",
    handler: async (context) => {
      try {
        const body = await context.req.json();
        const request = normalizeChatRequest(body);
        const response = await processAssistantMessage(request.messages);
        return context.json(response);
      } catch (error) {
        console.error("Chat handler error", error);
        const message =
          error instanceof Error ? error.message : "Assistant could not process the request";
        return context.json({ error: message }, 500);
      }
    },
  }),
  registerApiRoute("/chat/execute-function/stream", {
    method: "POST",
    handler: async (context) => {
      try {
        const body = await context.req.json();
        const request = normalizeChatRequest(body);
        return createSSEStream(async (controller) => {
          streamJSONEvent(controller, {
            type: "progress_update",
            text: "Understanding request",
            state: "in_progress",
          });

          const response = await processAssistantMessage(request.messages);

          streamJSONEvent(controller, {
            type: "message",
            role: "assistant",
            content: response.content,
          });

          if (Array.isArray(response.object)) {
            response.object.forEach((obj) => streamJSONEvent(controller, obj));
          } else if (response.object) {
            streamJSONEvent(controller, response.object);
          }

          streamJSONEvent(controller, {
            type: "progress_update",
            text: "All set",
            state: "complete",
          });
        });
      } catch (error) {
        console.error("Chat stream error", error);
        const message =
          error instanceof Error ? error.message : "Assistant could not process the request";
        return context.json({ error: message }, 500);
      }
    },
  }),
];

const PromptFallbackSchema = z.object({
  prompt: z.string(),
  systemPrompt: z.string().optional(),
  resourceId: z.string().optional(),
  threadId: z.string().optional(),
});

const normalizeChatRequest = (payload: unknown): ChatRequest => {
  const parsed = ChatRequestSchema.safeParse(payload);
  if (parsed.success) {
    return parsed.data;
  }

  const fallback = PromptFallbackSchema.safeParse(payload);
  if (fallback.success) {
    const { prompt, systemPrompt, resourceId, threadId } = fallback.data;
    const messages = [
      ...(systemPrompt
        ? [{ role: "system" as const, content: systemPrompt }]
        : []),
      { role: "user" as const, content: prompt },
    ];
    return { messages, resourceId, threadId };
  }

  throw parsed.error;
};
