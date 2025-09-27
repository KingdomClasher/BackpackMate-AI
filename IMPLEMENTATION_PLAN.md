# Implementation Plan — AI Travel Companion (Next.js + Cedar + Mastra)

## 1. Objective
- Build the AI Travel Companion defined in `PLAN.md`, delivering onboarding → itinerary/tasks UI → assistant workflow with Cedar-OS front-end components and a Mastra Cloud backend.
- Ensure Cedar frontend communicates with Mastra backend for itinerary proposals, assistant intent handling, and state synchronization using typed protocols and Cedar response processors.
- Provide a production-ready Next.js app structure that adheres to Cedar’s recommended organization and prepares for Mastra Cloud deployment with observability, streaming-first UX, and eval hooks baked in.

## 2. Architecture Overview
- **Framework**: Next.js 14 (App Router) with TypeScript, Tailwind CSS, shadcn/ui primitives.
- **State Management**: React context + reducer for trip data; Cedar `useRegisterState` / `useCedarState` for AI-readable state with typed setters and Zod schemas; lightweight local persistence via localStorage wrapper.
- **UI Layers**: App shell with tabs (`Itinerary`, `Tasks`), onboarding full-screen flow, right-side assistant dock (customized from Cedar chat with mentions & streaming indicators), modal system, calendar grid.
- **AI Integration**:
  - Cedar’s `CedarCopilot` provider configured with Mastra base URL (env-driven) plus message renderers/response processors registered in Cedar’s recommended `cedar/` folder; set `chatPath` to `/chat/execute-function` so Cedar resolves the matching SSE route automatically.
  - Custom assistant dock leveraging Cedar chat primitives while supporting streaming updates, mention chips, and prefilled prompts via Cedar chat controller.
- **Backend**: Mastra project (workspace inside repo) deployed to Mastra Cloud.
  - Define agents/tools/workflows per Mastra docs; expose REST endpoints (non-stream + SSE) via `registerApiRoute`; use `agent.streamVNext(...).toUIMessageStreamResponse()` for SSE compatibility with Cedar.
  - Configure Mastra memory threads/resources so chat state persists per trip; capture telemetry via Mastra Cloud dashboards and hook in evals.
- **Data flow**:
  1. Onboarding answers -> POST `/onboarding/itinerary-proposal` workflow (Mastra) → itinerary + metadata.
  2. Approve itinerary -> front-end seeds tasks/state, registers Cedar state slices, persists baseline locally.
  3. Assistant Dock messages (streaming) -> Mastra `/chat/execute-function` endpoints (agent-backed) → structured responses (`message`, `setState`, `frontendTool`, `progress_update`) normalized via output processors and consumed by Cedar to mutate UI state.
  4. Local persistence caches state; Mastra memory/storage keeps trip history for cross-session continuity.

## 3. Frontend Implementation Details

### 3.1 Project Bootstrapping
- Scaffold Next.js app with Tailwind + Cedar component setup (following Cedar docs + starter repo structure in `app/cedar-os`).
- Kick off using `npx cedar-os-cli plant-seed` (Mastra template) or the cedar-mastra-starter repo to ensure parity with documented integration.
- Configure `tsconfig`, `tailwind.config.js`, PostCSS, fonts, and global styles to match clean, minimal aesthetic while keeping Cedar’s utility classes available.
- Create `cedar/` directory per Cedar best practices (`messageRenderers.ts`, `responseProcessors.ts`, `frontendTools.ts`, `stateRegistry.ts`, `mentionProviders.ts`).
- Load fonts (Geist or Inter) and global CSS for layout, progress bar transitions, calendar styling, and streaming typography tweaks.

### 3.2 Layout & Routing
- `src/app/layout.tsx`: Wrap app with `CedarCopilot` (Mastra provider), load fonts, root-level providers (TripProvider, ModalProvider), and register Cedar response processors.
- `src/app/page.tsx`: Implement main UI shell with header, tab navigation, assistant dock wrapper, and conditional rendering for onboarding vs. main experience.
- Use `client` components for interactive views; server components for layout if needed.

### 3.3 State Management
- Define `TripState` aligned with data model (answers, questions, proposed, approved itinerary, tasks, dock state, modal state).
- Reducer actions: update answer, trigger follow-up, set proposal, approve itinerary, toggle tasks, open/close modal, calendar CRUD operations, dock interactions.
- Side effects: localStorage sync (debounced), seeding general/destination tasks when itinerary approved.
- Provide selectors/hooks for views (`useTripState`, `useTripActions`).
- Register state slices with Cedar using `useRegisterState` / `useCedarState` in providers (e.g., `answers`, `proposedItinerary`, `approvedItinerary`, `generalTasks`, `destinationTasks`, `calendarSelections`). Provide typed setters and Zod schemas mirroring backend expectations so Mastra can call `setState` safely.
- Register state-based mention providers (destinations, days, tasks) so chat supports `@` references.

### 3.4 Onboarding Experience
- Component structure:
  - `OnboardingView`: orchestrates question flow, progress, proposed itinerary preview.
  - `QuestionDisplay`: renders active question/follow-up text.
  - `OnboardingInputBar`: sticky bottom input with submit/regenerate controls.
  - `ItineraryPreviewCard`: shows proposed plan before approval.
- Logic:
  - Predefined core questions & follow-up rules (dates, destinations, budget) with guardrails as spec.
- On submit: local validation -> call Mastra workflow endpoint for follow-ups and itinerary proposal, using typed request bodies.
  - When `proposed` ready, show preview with Approve/Regenerate actions.
  - Smooth progress bar updates and transitions.
  - Surface workflow `progress_update` events in UI so users see status (collecting info, drafting days, finalizing).

### 3.5 Main App Shell & Tabs
- `MainAppShell`: renders header with title + HackGT badge, tab nav (Itinerary/Tasks), assistant dock toggle.
- Manage responsive layout where Assistant Dock slides over content without layout shift using CSS grid + transform, preserving Cedar chat animation patterns and keeping caption/floating variants available for other views.

### 3.6 Itinerary Tab
- **Left Pane** (`ItineraryAccordion`):
  - Render days sorted by date; accordion behavior (only one open).
  - `DayCard` component shows date, city, expand icon.
  - `ItineraryItemRow`: time chips, title, optional note, `Tasks` button to open modal.
  - Event handlers dispatch to open Task Modal with context.
- **Right Pane** (`CalendarGrid`):
  - Build CSS grid representing days columns (dynamic) and time slots rows (08:00–22:00).
  - Convert itinerary items to positioned blocks (absolute within column), handle overlaps with offsets.
  - Click events sync with Task Modal.
  - Provide responsive fallback stacking for mobile.
- Shared logic: map itinerary data to calendar positions (`timeToOffset`, `durationToHeight`).

### 3.7 Tasks Tab
- `TasksTab` container with two cards.
  - `GeneralTasksCard`: list toggle checkboxes, `AI Help` button hooking to assistant with context message.
- `DestinationTasksCard`: grouped accordion per city with toggles + `AI Help` per task/city.
- Manage state updates via reducer; ensure toggles maintain state and propagate to Cedar state registration and mention providers.

### 3.8 Task Modal
- Portal-based modal with overlay; triggered from itinerary items or calendar events.
- Displays time, title, note, subtasks list (checkbox style), action buttons (`Help me with this`, `Mark complete`).
- Hook `Help me` to assistant by pre-seeding message via Cedar chat API (e.g., call `sendMessage` with context) or open dock with prefilled prompt.
- Provide success toast/feedback when tasks completed.
- Trigger Cedar frontend tools when user requests help so dock opens with context and mention chips pre-selected.

### 3.9 Assistant Dock Integration
- Build `AssistantDock` component by composing Cedar chat primitives (`SidePanelCedarChat` + custom controls) to match spec while remaining swappable for caption/floating modes.
- Dock states: collapsed/expanded with handle, streaming indicator fed by Cedar chat `thinking` state, and mention support for contextual prompts.
- Provide ability to seed context messages (from tasks, general AI help, etc.) by calling Cedar’s `useChatController`/`useTypedAgentConnection` hooks or dispatching `frontendTool` events.
- Ensure dock accessible from mobile (overlay full width; handle viewport adjustments) and maintain zero layout shift when toggled.
- Optional: integrate Cedar diff preview pattern so itinerary edits from the agent can be reviewed before commit.

### 3.10 Styling & Theming
- Tailwind config for colors, shadows, typography.
- Create reusable class utilities for cards, chips, progress bar, streaming text styles, and mention badges.
- Add calendar-specific CSS (grid, time rail, dashed lines).
- Ensure animations for dock slide, progress transitions, streaming cursors, and mention highlights.
- Add dark-mode friendly defaults if time.

### 3.11 Accessibility & Responsiveness
- Keyboard navigable onboarding input & buttons.
- Focus trapping in Task Modal.
- Use `aria` labels for dock toggle, tasks.
- Responsive layouts: On mobile, stack itinerary accordion above calendar; docking overlay; tasks cards stack.

### 3.12 Testing & Quality
- Implement unit tests for reducer logic and helper functions (time parsing, seeding tasks, Cedar state setters, mention providers) using Vitest or Jest.
- Cypress/Playwright smoke test for onboarding → approval flow, streaming assistant updates, and `setState` mutations (time permitting).
- Manual QA checklist matching acceptance criteria (progress bar, modal, dock commands, streaming continuity, mention behavior).

## 4. Backend (Mastra) Implementation Details

### 4.1 Project Setup
- Use Mastra CLI template (or restructure existing) with `src/backend` workspace (similar to starter repo).
- Configure `package.json`, `tsconfig`, environment variables for OpenAI, Cedar integration.
- Deploy target: Mastra Cloud — ensure config aligns with cloud deployment (serverless entry, environment secrets).

-### 4.2 Agents & Workflows
- Define main agent `travelPlannerAgent` with instructions per spec (onboarding rules + assistant capabilities) using `Agent` API (`@mastra/core/agent`).
### 4.2 Agents, Tools & Workflows
- Define primary agent `travelPlannerAgent` with instructions per spec (onboarding follow-ups + execution support) using `@mastra/core/agent`; register output processors that emit Cedar-shaped objects (`message`, `setState`, `frontendTool`, `progress_update`).
- Compose `generateItineraryWorkflow` with `createWorkflow`/`createStep` to synthesize itineraries from onboarding answers; surface progress via `run.streamVNext()` (collect answers → draft days → finalize tasks).
- Keep conversational execution within `travelPlannerAgent.streamVNext`, delegating to domain tools (`add_itinerary_item`, `move_item`, `toggle_task`, `visa_brief`) defined with Zod `inputSchema`/`outputSchema` for safety.
- Introduce helper workflows for heavier operations (e.g., rebalancing multi-city trips) that the agent can call through tools when needed.
- Configure Mastra memory so `threadId` equals tripId and `resourceId` equals the signed-in user (or shared team), ensuring stateful conversations per trip.
- Add lightweight rule-based fallbacks (regex or deterministic parsing) for critical intents so the assistant remains reliable during the hackathon.

### 4.3 API Routes
- `/chat/execute-function` (POST): non-stream fallback; validates payload with Zod, calls `travelPlannerAgent.generate`, returns structured object list.
- `/chat/execute-function/stream` (POST SSE): wraps `travelPlannerAgent.streamVNext(messages, { format: 'aisdk', memory: { threadId, resourceId } })` and returns `toUIMessageStreamResponse()` so Cedar receives streaming text + structured events.
- `/onboarding/itinerary-proposal` (POST): invokes `generateItineraryWorkflow`, optionally streams progress, and responds with itinerary, seeded tasks, and metadata needed to seed frontend state.
- `/trip` (GET/POST/PUT optional): surface saved trip state via Mastra storage (LibSQL/File); fallback to in-memory map for hackathon but document persistence upgrade path.

### 4.4 Structured Responses & Cedar Integration
- Use Cedar’s `CustomStructuredResponseType` to send `setState` updates (`type: 'setState'`) for itinerary/task modifications, referencing `SetStateResponseSchema`; optionally include diff metadata for approval UX.
- Provide `frontendTool` responses for complex UI operations (e.g., open task modal, prefill dock, scroll to day) and `progress_update` events to visualize workflow stages during onboarding/assistant actions.
- Ensure responses always include `message` type for textual replies tuned to Cedar chat expectations and annotate mention targets when relevant.
- Mirror request/response typing with exported Zod schemas for validation, share TypeScript types with the frontend, and validate inbound Cedar `additionalContext` via Mastra middleware.

### 4.5 Data Sources & Utilities
- Static data sets:
  - Popular cities per region for fallback destinations.
  - Visa requirements mapping by citizenship/country for assistant responses.
  - Default general tasks list + templates.
- Time utilities to map string times to DateTime for adjustments.
- Use `dayjs` or `date-fns` for date handling within backend.

### 4.6 Deploying to Mastra Cloud
- Prepare `mastra.config`/deployment instructions (depending on Cloud requirements) with environment variables (OpenAI key, storage, base URL) and connect GitHub repo.
- Document deployment commands (Mastra CLI `mastra deploy`, GitHub Actions) and verification steps using Mastra Cloud playground.
- Ensure backend CORS or accessible from frontend domain; record Mastra Cloud endpoint in frontend `.env`.
- Enable tracing/eval exporters in production deploys and capture quick-start steps for enabling Braintrust/Langfuse if desired.

## 5. Cedar Integration Details
- Populate `cedar/messageRenderers` & `cedar/responseHandlers` minimally, leaning on Cedar defaults and only adding custom processors if we introduce new `type` values.
- Register `setStateResponseProcessor` variants for itinerary/task operations triggered by Mastra (e.g., `add-itinerary-item`, `update-task-status`) and optionally wrap `createSetStateResponseProcessor` for type safety/diff logging.
- Expose `frontendTools` for actions initiated by assistant (`openTaskModal`, `prefillDock`, `scrollToDay`) and document signatures for backend tooling.
- Register mention providers for destinations/days/tasks so chat surfaces `@` chips and Cedar passes structured references downstream.
- Use `useTypedAgentConnection` or Cedar chat controller to programmatically send prompts when auto-invoking from UI (e.g., `Help me with this` button) while preserving mention formatting.
- Configure chat component to call Mastra SSE endpoints by default for streaming-first experience with fallback to non-streaming, and opt-in to Cedar diff manager if we implement approval flows.

## 6. Feature-by-Feature Implementation Checklist
1. **Project scaffolding & Cedar setup**
2. **Trip state provider with reducer + localStorage sync**
3. **Onboarding flow (questions, follow-ups, progress bar, itinerary preview)**
4. **Mastra `generateItineraryWorkflow` + `/onboarding/itinerary-proposal` endpoint**
5. **Approve/Regenerate actions + seeding tasks**
6. **Itinerary tab (accordion + calendar, modal triggers)**
7. **Tasks tab (general + destination-specific)**
8. **Task Modal (actions + assistant hooks)**
9. **Assistant dock UI using Cedar chat, toggle integration**
10. **Mastra chat endpoints + `travelPlannerAgent` streaming pipeline**
11. **Cedar response processors, frontend tools, and mention providers**
12. **AI help shortcuts & mention-aware prompts**
13. **Edge case handling (invalid dates, empty destinations, overlapping events)**
14. **Observability (logging, tracing, eval hooks)**
15. **Responsiveness & accessibility polish**
16. **Testing (unit + smoke), QA checklist**

## 7. Environment & Configuration
- `.env.local` (frontend):
  - `NEXT_PUBLIC_MASTRA_URL=https://<mastra-cloud-endpoint>`
  - Optional: `NEXT_PUBLIC_APP_ENV` for runtime toggles.
- `mastra/.env` (backend):
  - `OPENAI_API_KEY`, `CEDAR_SHARED_SECRET` (if needed), `FRONTEND_ORIGIN` for CORS.
- Document how auth/identity flows provide `threadId` (trip) and `resourceId` (user/team) to Cedar/Mastra requests.
- Document developer setup steps in `README` (install deps, run frontend, connect to Mastra Cloud or local server).

## 8. Deliverables Summary
- Fully functional Next.js app meeting acceptance criteria.
- Cedar configuration directory with custom processors/tools/state registration.
- Mastra backend code ready for cloud deployment, providing required endpoints.
- Documentation: updated `README` with setup/run instructions, env config, deployment pointers.
- Observability artifacts: tracing screenshots or eval summaries (if available).
- Optional demos: sample data/fixtures, coverage report snapshots.
