# BackpackMate AI — Cedar + Mastra Travel Companion

BackpackMate AI is a demo travel planner built for HackGT. It combines a Cedar-OS frontend with a Mastra backend to deliver an AI-assisted itinerary experience:

- Guided onboarding that asks one question at a time (with follow-up guardrails) and generates a proposed itinerary.
- Main shell with split-view itinerary (accordion + inline calendar), task hub, and a right-side Cedar assistant dock.
- Assistant commands (add destination task, general Q&A) flowing through a Mastra endpoint that emits Cedar-compatible responses.

## Requirements

- Node.js 20+
- npm 10+

## Installation

1. Install frontend dependencies:

   ```bash
   npm install
   ```

2. Install backend workspace dependencies:

   ```bash
   cd src/backend
   npm install
   cd ../.. # return to project root
   ```

## Environment Variables

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_MASTRA_URL=http://localhost:4111
```

(Optional) When deploying, point `NEXT_PUBLIC_MASTRA_URL` at your Mastra Cloud deployment.

## Running the app locally

Open two terminals and run:

1. **Mastra backend** (port 4111 by default):

   ```bash
   cd src/backend
   npm run dev
   ```

2. **Next.js frontend** (port 3000):

   ```bash
   npm run dev
   ```

Visit [http://localhost:3000](http://localhost:3000) to use the app. The frontend expects the backend at `NEXT_PUBLIC_MASTRA_URL`.

## Scripts

- `npm run dev` – start Next.js development server
- `npm run lint` – run ESLint checks
- `npm run build` – production build validation
- `cd src/backend && npm run dev` – run Mastra server locally
- `cd src/backend && npx tsc -p tsconfig.json` – type-check backend

## Backend endpoints

| Method | Endpoint                               | Description                                 |
| ------ | -------------------------------------- | ------------------------------------------- |
| POST   | `/onboarding/itinerary-proposal`       | Generates itinerary + tasks from answers    |
| POST   | `/chat/execute-function`               | Processes assistant message (non-streaming) |
| POST   | `/chat/execute-function/stream`        | SSE streaming variant for assistant         |

The backend responses follow Cedar’s `LLMResponse` contract, returning `message`, `progress_update`, and `setState` objects to mutate frontend state via registered setters.

## Project structure highlights

```
src/
├── app/
│   ├── cedar-os/…                # Cedar UI components (side-panel chat, etc.)
│   ├── layout.tsx                # CedarCopilot + TripProvider wiring
│   └── page.tsx                  # Main app entry (AppShell)
├── components/
│   ├── onboarding/…             # Onboarding flow + proposal preview
│   ├── shell/…                  # Itinerary tab, tasks tab, assistant dock
│   └── tasks/TaskModal.tsx      # Item task modal with Cedar hand-off
├── lib/
│   ├── state/tripReducer.ts     # Trip reducer + actions
│   └── types/trip.ts            # Trip domain types & schemas
└── backend/
    └── src/
        ├── mastra/apiRegistry.ts   # REST routes wired into Mastra
        ├── schemas/trip.ts         # Shared backend schemas
        └── utils/…                 # Itinerary generator & assistant handlers
```

## Notes

- The current assistant logic is rule-based (regex) for hackathon speed, sending Cedar `setState` updates (e.g., destination task additions). It can be swapped for a full Mastra agent + LLM when ready.
- When you regenerate an itinerary, general/destination tasks are refreshed from the backend proposal response.
- State is persisted to `localStorage` (`backpackmate-trip-state-v1`) so refreshing the page keeps your progress.

## Deployment

- Frontend: deploy the Next.js app (e.g., Vercel, Netlify) and expose `NEXT_PUBLIC_MASTRA_URL` pointing to your backend.
- Backend: deploy the Mastra server (Mastra Cloud or self-hosted). Any Mastra-compatible runtime that runs `npm run start` in `src/backend` will work.
