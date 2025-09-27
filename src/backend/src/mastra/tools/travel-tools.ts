import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { generateText, generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';

/** ------------------------------------------------------------------
 * Seed notes (quick mock RAG). Expand anytime.
 * ------------------------------------------------------------------ */
const NOTES: Array<{ id: string; text: string }> = [
  { id: 'r1', text: 'Rede Expressos runs Lisbon→Porto buses ~hourly; fare ≈ €17; ≈3h.' },
  { id: 'r2', text: 'FlixBus sometimes cheaper off-season Lisbon↔Porto; slower on weekends.' },
  { id: 'h1', text: 'Sunset Hostel Lisbon: check-in 2pm; lockers; reception +351-000.' },
  { id: 'v1', text: 'US passport may need a visa/eTA for Morocco; always verify current rules.' },
];

/** ------------------------------------------------------------------
 * Shared schemas
 * ------------------------------------------------------------------ */
const HostelSchema = z.object({
  name: z.string(),
  approxPrice: z.number(),         // numeric (EUR preferred if available)
  currency: z.string(),            // e.g., "EUR", "USD"
  checkIn: z.string(),             // e.g., "14:00" or "3 PM"
  notes: z.string(),               // short blurb incl. area, vibe, and *source URL*
});
const HostelsOutputSchema = z.object({
  hostels: z.array(HostelSchema).min(1).max(5),
});

const RouteOption = z.object({
  provider: z.string(),         // "Rede Expressos", "CP Comboios", "FlixBus"...
  depart: z.string(),           // "09:20" (or "09:20 (approx)")
  arrive: z.string(),           // "12:10" (or "~12:15")
  durationHrs: z.number(),      // 2.8
  price: z.number(),            // number only
  currency: z.string(),         // "EUR", "USD", ...
});
const RouteOutput = z.object({
  options: z.array(RouteOption).min(1).max(5),
  note: z.string(),
});

/** ------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------ */
async function tavilySearch(query: string) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return null;

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      query,
      max_results: 6,
      include_raw_content: true,
      include_answer: false,
      search_depth: 'advanced',
    }),
  });
  if (!res.ok) return null;

  return (await res.json().catch(() => null)) as
    | { results?: Array<{ title: string; url: string; content?: string }> }
    | null;
}

function formatEvidence(
  label: string,
  results?: Array<{ title: string; url: string; content?: string }>
) {
  if (!results?.length) return `No direct web results for ${label}.`;
  return results
    .map(
      (r, i) => `[#${i + 1}] ${r.title}\nURL: ${r.url}\n${(r.content || '').slice(0, 900)}`
    )
    .join('\n\n');
}

function clampPrice(p?: number) {
  if (!Number.isFinite(p)) return undefined;
  if (p! <= 0 || p! > 1000) return undefined;
  return Math.round(p!);
}
function clampDurationHrs(h?: number) {
  if (!Number.isFinite(h)) return undefined;
  if (h! <= 0 || h! > 72) return undefined;
  return Math.round(h! * 10) / 10;
}

/** ------------------------------------------------------------------
 * Tools
 * ------------------------------------------------------------------ */

/** Mock RAG over local notes */
export const notesSearchTool = createTool({
  id: 'notes-search',
  description: 'Search internal backpacking notes (mock RAG).',
  inputSchema: z.object({ query: z.string().describe('free text query'), k: z.number().default(5) }),
  outputSchema: z.object({ hits: z.array(z.object({ id: z.string(), text: z.string() })) }),
  execute: async ({ context }) => {
    const q = (context.query || '').toLowerCase();
    const k = context.k ?? 5;
    const hits = NOTES.filter(n => n.text.toLowerCase().includes(q)).slice(0, k);
    return { hits };
  },
});

/** Route search with Tavily + LLM, plus graceful fallbacks */
export const routeSearchTool = createTool({
  id: 'route-search',
  description:
    'Find cheap intercity routes (bus/train) using web search + LLM synthesis. Non-authoritative; schedules/prices change.',
  inputSchema: z.object({
    from: z.string(),
    to: z.string(),
    date: z.string().optional(),       // YYYY-MM-DD or natural text
    budgetUSD: z.number().optional(),  // optional soft cap
  }),
  outputSchema: RouteOutput,
  execute: async ({ context }) => {
    const from = context.from?.trim();
    const to = context.to?.trim();
    const date = context.date?.trim();
    const budgetUSD = context.budgetUSD;

    if (!from || !to) {
      return {
        options: [
          { provider: 'Example Bus', depart: '09:00', arrive: '12:00', durationHrs: 3, price: 20, currency: 'EUR' },
        ],
        note: 'Missing origin/destination; returned a placeholder.',
      };
    }

    // 1) Tavily → LLM extraction
    try {
      const q = `${from} to ${to} cheapest bus or train price duration timetable ${date || ''} student ticket`;
      const search = await tavilySearch(q);

      if (search?.results?.length) {
        const evidence = formatEvidence(`${from}→${to}`, search.results);

        const { object } = await generateObject({
          model: openai('gpt-4o-mini'),
          schema: RouteOutput,
          system: `
You are a routing assistant. Synthesize up to 3 realistic intercity options (bus/train) from evidence.
- Prefer budget providers (FlixBus, Rede Expressos, ALSA) or national rail (CP, Renfe, etc.).
- Convert prices to EUR when possible and round.
- Use HH:MM local times; if unknown, add "(approx)".
- durationHrs: number; price: number.
- Keep "note" short; include “(Sources: #id, #id)”.`,
          prompt: `
FROM: ${from}
TO: ${to}
DATE (optional): ${date || 'unspecified'}
BUDGET (USD, optional): ${budgetUSD ?? 'unspecified'}

Evidence (may be partial/outdated):
${evidence}

Return JSON EXACTLY like:
{
  "options": [
    { "provider": "...", "depart": "09:20", "arrive": "12:10", "durationHrs": 2.8, "price": 17, "currency": "EUR" }
  ],
  "note": "Short remark with sources like (Sources: #1, #3)"
}`,
          maxTokens: 550,
        });

        if (object?.options?.length) {
          const options = object.options.slice(0, 3).map(o => ({
            ...o,
            price: clampPrice(o.price) ?? 25,
            durationHrs: clampDurationHrs(o.durationHrs) ?? 3.0,
            currency: o.currency || 'EUR',
            depart: o.depart || '09:00 (approx)',
            arrive: o.arrive || '12:00 (approx)',
          }));

          const filtered =
            typeof budgetUSD === 'number'
              ? options.filter(o => (o.currency === 'EUR' ? o.price <= Math.round(budgetUSD * 0.95) : true))
              : options;

          return {
            options: filtered.length ? filtered : options,
            note: object.note || `Synthesized from web snippets for ${from} → ${to}.`,
          };
        }
      }
    } catch {
      // fall through
    }

    // 2) LLM-only fallback
    try {
      const { object } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: RouteOutput,
        system: 'Return realistic cheap intercity options (bus/train) as structured JSON; prefer EUR; brief note.',
        prompt: `FROM: ${from}\nTO: ${to}\nDATE: ${date || 'unspecified'}\nBUDGET(USD): ${budgetUSD ?? 'unspecified'}\nReturn up to 3 plausible options.`,
        maxTokens: 400,
      });
      if (object?.options?.length) {
        const options = object.options.slice(0, 3).map(o => ({
          ...o,
          price: clampPrice(o.price) ?? 25,
          durationHrs: clampDurationHrs(o.durationHrs) ?? 3.0,
          currency: o.currency || 'EUR',
          depart: o.depart || '09:00 (approx)',
          arrive: o.arrive || '12:00 (approx)',
        }));
        return { options, note: object.note || `LLM-only estimate for ${from} → ${to}; verify exact times/prices.` };
      }
    } catch {
      // fall through
    }

    // 3) Mock fallback
    const fallback = [
      { provider: 'Rede Expressos', depart: '09:20', arrive: '12:10', durationHrs: 2.8, price: 17, currency: 'EUR' },
      { provider: 'FlixBus',       depart: '10:00', arrive: '13:20', durationHrs: 3.3, price: 15, currency: 'EUR' },
    ];
    return { options: fallback, note: `Mock fallback for ${from} → ${to}.` };
  },
});

/** Hostel suggestions with Tavily + LLM, with fallbacks */
export const hostelSuggestTool = createTool({
  id: 'hostel-suggest',
  description:
    'Suggest budget hostels using web search + LLM synthesis. Non-authoritative; prices/availability change.',
  inputSchema: z.object({ city: z.string() }),
  outputSchema: HostelsOutputSchema,
  execute: async ({ context }) => {
    const city = context.city?.trim();
    if (!city) {
      return {
        hostels: [
          { name: 'Example Hostel', approxPrice: 20, currency: 'EUR', checkIn: '14:00', notes: 'Central; lockers; mock.' },
        ],
      };
    }

    // 1) Tavily → LLM
    try {
      const q = `${city} best budget hostels price per night check-in time lockers breakfast neighborhood hostelworld booking review`;
      const search = await tavilySearch(q);

      if (search?.results?.length) {
        const evidence = formatEvidence(city, search.results);
        const { object } = await generateObject({
          model: openai('gpt-4o-mini'),
          schema: HostelsOutputSchema,
          system: `
You are a travel assistant extracting budget hostels.
- Return ~3 options.
- Prices in EUR; "approxPrice" numeric; "checkIn" short time; "notes" includes a source URL.
- If unknown, use typical values and mark "typical" or "est."`,
          prompt: `City: ${city}\n\nEvidence:\n${evidence}\n\nReturn JSON matching the schema.`,
          maxTokens: 450,
        });

        if (object?.hostels?.length) {
          const sanitized = object.hostels
            .map(h => ({
              ...h,
              approxPrice:
                Number.isFinite(h.approxPrice) && h.approxPrice > 5 && h.approxPrice < 200
                  ? Math.round(h.approxPrice)
                  : 25,
              currency: h.currency || 'EUR',
              checkIn: h.checkIn || '15:00 (typical)',
            }))
            .slice(0, 3);

          return { hostels: sanitized };
        }
      }
    } catch {
      // fall through
    }

    // 2) LLM-only fallback
    try {
      const { object } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: HostelsOutputSchema,
        system: 'Return 3 budget hostels with dorm prices in EUR and concise notes (JSON only).',
        prompt: `City: ${city}. Return 3 hostels with approx nightly dorm price, check-in time (typical if unknown), and notes.`,
        maxTokens: 350,
      });

      if (object?.hostels?.length) {
        const sanitized = object.hostels
          .map(h => ({
            ...h,
            approxPrice:
              Number.isFinite(h.approxPrice) && h.approxPrice > 5 && h.approxPrice < 200
                ? Math.round(h.approxPrice)
                : 25,
            currency: h.currency || 'EUR',
            checkIn: h.checkIn || '15:00 (typical)',
          }))
          .slice(0, 3);
        return { hostels: sanitized };
      }
    } catch {
      // fall through
    }

    // 3) Mock fallback
    return {
      hostels: [
        { name: `${city} Central Hostel (mock)`, approxPrice: 22, currency: 'EUR', checkIn: '14:00', notes: 'Near center; lockers; (no source)' },
      ],
    };
  },
});

/** Visa checker with Tavily + LLM (cautious, non-authoritative) */
export const visaCheckTool = createTool({
  id: 'visa-check',
  description:
    'Check if a nationality may need a visa for a destination (quick web search + LLM). Not authoritative.',
  inputSchema: z.object({
    nationality: z.string().describe('Country name or demonym, e.g., "United States", "Indian"'),
    destination: z.string().describe('Destination country/territory, e.g., "Morocco"'),
  }),
  outputSchema: z.object({
    result: z.string(),
    disclaimer: z.string(),
  }),
  execute: async ({ context }) => {
    const { nationality, destination } = context;
    const q = `${nationality} citizens visa requirements for ${destination} entry requirements`;

    // 1) Web search + synthesize
    try {
      const searchData = await tavilySearch(q);
      if (searchData?.results?.length) {
        const evidence = formatEvidence(`${nationality}→${destination}`, searchData.results);
        const { text } = await generateText({
          model: openai('gpt-4o-mini'),
          system: `Summarize likely visa requirement in ONE short sentence. If unclear, say "Unclear; likely X—verify." Avoid legal advice.`,
          prompt: `Do ${nationality} citizens need a visa for ${destination}?\n\nSnippets:\n${evidence}\n\nReturn one sentence + include "(Sources: #id, #id)" if possible.`,
          maxTokens: 120,
        });

        const resultLine = text?.trim() || `Preliminary result for ${nationality} → ${destination}.`;
        return {
          result: resultLine,
          disclaimer:
            'Non-authoritative summary from quick web search. Always verify with airline Timatic, official government/consulate, or your carrier before travel.',
        };
      }
    } catch {
      // fall through
    }

    // 2) LLM-only fallback
    try {
      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        system: `Provide a cautious single-sentence estimate; avoid definitive claims.`,
        prompt: `Do ${nationality} citizens need a visa for ${destination}? One sentence, cautious wording.`,
        maxTokens: 60,
      });
      return {
        result: text.trim(),
        disclaimer: 'Model-only estimate without live sources. Verify with official entry rules (airline Timatic or consulate).',
      };
    } catch {
      // fall through
    }

    // 3) Heuristic last-ditch
    const guess = destination.toLowerCase() === 'morocco'
      ? 'may need a visa or e-visa'
      : 'may be visa-free for short stays (subject to nationality)';
    return {
      result: `${nationality} travelers ${guess} for ${destination}.`,
      disclaimer: 'Heuristic fallback. Please verify with official sources before travel.',
    };
  },
});
