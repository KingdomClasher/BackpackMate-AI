import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

/** --- Tiny in-memory "notes" corpus you can expand quickly --- **/
const NOTES: Array<{ id: string; text: string }> = [
  { id: 'r1', text: 'Rede Expressos runs Lisbon→Porto buses ~hourly; fare ≈ €17; ≈3h.' },
  { id: 'r2', text: 'FlixBus sometimes cheaper off-season Lisbon↔Porto; slower on weekends.' },
  { id: 'h1', text: 'Sunset Hostel Lisbon: check-in 2pm; lockers; reception +351-000.' },
  { id: 'v1', text: 'US passport may need a visa/eTA for Morocco; always verify current rules.' },
];

/** Simple substring search over NOTES (fast & no extra deps) */
export const notesSearchTool = createTool({
  id: 'notes-search',
  description: 'Search internal backpacking notes (mock RAG).',
  inputSchema: z.object({ query: z.string().describe('free text query'), k: z.number().default(5) }),
  outputSchema: z.object({
    hits: z.array(z.object({ id: z.string(), text: z.string() })),
  }),
  execute: async ({ context }) => {
    const q = (context.query || '').toLowerCase();
    const k = context.k ?? 5;
    const hits = NOTES.filter(n => n.text.toLowerCase().includes(q)).slice(0, k);
    return { hits };
  },
});

/** Mock route search (replace with real API later) */
export const routeSearchTool = createTool({
  id: 'route-search',
  description: 'Find a cheap intercity route (mock).',
  inputSchema: z.object({
    from: z.string(),
    to: z.string(),
    date: z.string().optional(),
    budgetUSD: z.number().optional(),
  }),
  outputSchema: z.object({
    options: z.array(
      z.object({
        provider: z.string(),
        depart: z.string(),
        arrive: z.string(),
        durationHrs: z.number(),
        price: z.number(),
        currency: z.string(),
      }),
    ),
    note: z.string(),
  }),
  execute: async ({ context }) => {
    const { from, to } = context;
    // tiny mocked matrix
    const options = [
      { provider: 'Rede Expressos', depart: '09:20', arrive: '12:10', durationHrs: 2.8, price: 17, currency: 'EUR' },
      { provider: 'FlixBus',       depart: '10:00', arrive: '13:20', durationHrs: 3.3, price: 15, currency: 'EUR' },
    ];
    return {
      options,
      note: `Mock data for ${from} → ${to}. Replace with real API later.`,
    };
  },
});

/** Mock hostel suggestions */
export const hostelSuggestTool = createTool({
  id: 'hostel-suggest',
  description: 'Suggest a budget hostel (mock).',
  inputSchema: z.object({ city: z.string() }),
  outputSchema: z.object({
    hostels: z.array(
      z.object({
        name: z.string(),
        approxPrice: z.number(),
        currency: z.string(),
        checkIn: z.string(),
        notes: z.string(),
      }),
    ),
  }),
  execute: async ({ context }) => {
    return {
      hostels: [
        {
          name: 'Sunset Hostel Lisbon',
          approxPrice: 22,
          currency: 'EUR',
          checkIn: '14:00',
          notes: 'Lockers; late check-in possible; +351-000.',
        },
      ],
    };
  },
});

/** Mock visa checker */
async function searchVisaOnWeb(query: string) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      query,
      max_results: 5,
      include_answer: false,
      include_raw_content: true
    })
  });

  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data as {
    results?: Array<{ title: string; url: string; content: string }>;
  } | null;
}

export const visaCheckTool = createTool({
  id: 'visa-check',
  description: 'Check if a nationality may need a visa for a destination. Uses web search when available; not authoritative.',
  inputSchema: z.object({
    nationality: z.string().describe('ISO country name or common demonym, e.g., "United States", "Indian"'),
    destination: z.string().describe('Destination country/territory, e.g., "Morocco"'),
  }),
  outputSchema: z.object({
    result: z.string(),
    disclaimer: z.string(),
  }),

  execute: async ({ context }) => {
    const { nationality, destination } = context;
    const q = `${nationality} citizens visa requirements for ${destination} entry requirements`;

    // 1) Try web search + LLM synthesis
    try {
      const searchData = await searchVisaOnWeb(q);

      if (searchData?.results && searchData.results.length > 0) {
        // Build a compact evidence pack for the model
        const evidence = searchData.results
          .map((r, i) => `[#${i + 1}] ${r.title}\nURL: ${r.url}\n${(r.content || '').slice(0, 600)}`)
          .join('\n\n');

        const { text } = await generateText({
          model: openai('gpt-4o-mini'),
          system: `You help travelers understand visa requirements at a high level.
- Read the evidence (may be partial/outdated).
- Output a single short sentence covering likely requirement (visa-free, e-visa, visa on arrival, or visa required), plus a hint on stay limits if present.
- Be conservative if evidence conflicts or is unclear.
- DO NOT give legal advice.`,
          prompt: `User: Do ${nationality} citizens need a visa for ${destination}?
Evidence (snippets):
${evidence}

Answer template (one line):
"<concise requirement>. (Sources: #id, #id)."

If unclear, say "Unclear from quick search; likely X but verify."`,
          maxTokens: 120,
        });

        // Try to pull source ids for transparency (optional)
        const hasSources = searchData.results.slice(0, 2).map((_, i) => `#${i + 1}`).join(', ');
        const result = text?.trim() || `Preliminary result for ${nationality} → ${destination}. See sources: ${hasSources}`;

        return {
          result,
          disclaimer:
            'Non-authoritative summary from quick web search. Always verify with airline (Timatic), official gov/consulate, or your carrier before travel.',
        };
      }
    } catch (e) {
      // Fall through to LLM-only path
    }

    // 2) LLM-only fallback (no web)
    try {
      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        system: `Give a cautious, likely answer in one sentence without pretending to be authoritative. Avoid definitive claims.`,
        prompt: `Do ${nationality} citizens need a visa for ${destination}? Keep it to one sentence, cautious wording.`,
        maxTokens: 60,
      });

      return {
        result: text.trim(),
        disclaimer:
          'Model-only estimate without live sources. Verify with official entry rules (airline Timatic or consulate).',
      };
    } catch {}

    // 3) Heuristic last-ditch (never crash)
    const guess =
      destination.toLowerCase() === 'morocco'
        ? 'may need a visa or e-visa'
        : 'may be visa-free for short stays (subject to nationality)';

    return {
      result: `${nationality} travelers ${guess} for ${destination}.`,
      disclaimer:
        'Heuristic fallback. Please verify with official sources before travel.',
    };
  },
});

