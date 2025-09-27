import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { createTool } from '@mastra/core/tools';

const planInput = z.object({
  prompt: z.string().describe('Trip request, e.g., "7 days Spain -> Portugal -> Morocco, $700 budget"')
});
const planOutput = z.object({
  itinerary: z.string()
  // keep as markdown for speed; JSON optional
});
const planItinerary = createStep({
  id: "plan-itinerary",
  description: "Creates a simple backpacking plan with daily activities and rough budget.",
  inputSchema: planInput,
  outputSchema: planOutput,
  execute: async ({ inputData, mastra }) => {
    if (!inputData) throw new Error("Missing input");
    const agent = mastra?.getAgent("travelAgent");
    if (!agent) throw new Error("Travel agent not found");
    const prompt = `
You are BackpackMate. Plan an itinerary from the user prompt below.
Constraints: student budget, public transport, 2-3 activities per day, show rough budget split (lodging/transport/food).
Use tools when needed and cite any notes you used.

USER PROMPT:
${inputData.prompt}

FORMAT (markdown):
# Itinerary
- Total budget: $X (Lodging: $A, Transport: $B, Food: $C)

## Day 1 \u2014 [City]
- Morning: ...
- Afternoon: ...
- Evening: ...
- Notes: ...

## Day 2 \u2014 ...
(keep concise)
`;
    const stream = await agent.stream([{ role: "user", content: prompt }]);
    let text = "";
    for await (const chunk of stream.textStream) {
      process.stdout.write(chunk);
      text += chunk;
    }
    return { itinerary: text };
  }
});
const itineraryWorkflow = createWorkflow({
  id: "itinerary-workflow",
  inputSchema: planInput,
  outputSchema: planOutput
}).then(planItinerary);
itineraryWorkflow.commit();

const NOTES = [
  { id: "r1", text: "Rede Expressos runs Lisbon\u2192Porto buses ~hourly; fare \u2248 \u20AC17; \u22483h." },
  { id: "r2", text: "FlixBus sometimes cheaper off-season Lisbon\u2194Porto; slower on weekends." },
  { id: "h1", text: "Sunset Hostel Lisbon: check-in 2pm; lockers; reception +351-000." },
  { id: "v1", text: "US passport may need a visa/eTA for Morocco; always verify current rules." }
];
const notesSearchTool = createTool({
  id: "notes-search",
  description: "Search internal backpacking notes (mock RAG).",
  inputSchema: z.object({ query: z.string().describe("free text query"), k: z.number().default(5) }),
  outputSchema: z.object({
    hits: z.array(z.object({ id: z.string(), text: z.string() }))
  }),
  execute: async ({ context }) => {
    const q = (context.query || "").toLowerCase();
    const k = context.k ?? 5;
    const hits = NOTES.filter((n) => n.text.toLowerCase().includes(q)).slice(0, k);
    return { hits };
  }
});
const routeSearchTool = createTool({
  id: "route-search",
  description: "Find a cheap intercity route (mock).",
  inputSchema: z.object({
    from: z.string(),
    to: z.string(),
    date: z.string().optional(),
    budgetUSD: z.number().optional()
  }),
  outputSchema: z.object({
    options: z.array(
      z.object({
        provider: z.string(),
        depart: z.string(),
        arrive: z.string(),
        durationHrs: z.number(),
        price: z.number(),
        currency: z.string()
      })
    ),
    note: z.string()
  }),
  execute: async ({ context }) => {
    const { from, to } = context;
    const options = [
      { provider: "Rede Expressos", depart: "09:20", arrive: "12:10", durationHrs: 2.8, price: 17, currency: "EUR" },
      { provider: "FlixBus", depart: "10:00", arrive: "13:20", durationHrs: 3.3, price: 15, currency: "EUR" }
    ];
    return {
      options,
      note: `Mock data for ${from} \u2192 ${to}. Replace with real API later.`
    };
  }
});
const hostelSuggestTool = createTool({
  id: "hostel-suggest",
  description: "Suggest a budget hostel (mock).",
  inputSchema: z.object({ city: z.string() }),
  outputSchema: z.object({
    hostels: z.array(
      z.object({
        name: z.string(),
        approxPrice: z.number(),
        currency: z.string(),
        checkIn: z.string(),
        notes: z.string()
      })
    )
  }),
  execute: async ({ context }) => {
    return {
      hostels: [
        {
          name: "Sunset Hostel Lisbon",
          approxPrice: 22,
          currency: "EUR",
          checkIn: "14:00",
          notes: "Lockers; late check-in possible; +351-000."
        }
      ]
    };
  }
});
const visaCheckTool = createTool({
  id: "visa-check",
  description: "Check if nationality may need a visa (mock\u2014non authoritative).",
  inputSchema: z.object({ nationality: z.string(), destination: z.string() }),
  outputSchema: z.object({
    result: z.string(),
    disclaimer: z.string()
  }),
  execute: async ({ context }) => {
    const { nationality, destination } = context;
    const needs = destination.toLowerCase() === "morocco" ? "may need" : "likely visa-free (check)";
    return {
      result: `${nationality} travelers ${needs} a visa for ${destination}.`,
      disclaimer: "Mock check. Always verify official entry rules (airline/consulate)."
    };
  }
});

const travelAgent = new Agent({
  name: "BackpackMate Agent",
  instructions: `
You are BackpackMate \u2014 an assistant for multi-country backpacking.
- Produce concise, actionable answers grounded in tools.
- When asked about routes, hostels, visas, or tips, CALL THE TOOLS.
- If unsure, say so and suggest how to verify.
- Prefer budgets for student travelers.
- When planning, structure days with city, 2\u20133 activities, and rough costs.
  `,
  model: openai("gpt-4o-mini"),
  tools: { routeSearchTool, hostelSuggestTool, visaCheckTool, notesSearchTool },
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db"
      // same as scaffold
    })
  })
});

const mastra = new Mastra({
  workflows: {
    itineraryWorkflow
  },
  agents: {
    travelAgent
  },
  storage: new LibSQLStore({
    url: ":memory:"
    // for hackathon speed; swap to file:../mastra.db if you want persistence
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info"
  })
});

export { mastra };
