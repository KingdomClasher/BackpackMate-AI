Here’s a clear, end-to-end spec for what to implement. It matches your latest canvas file and your product direction.

# Product Spec — AI Travel Companion (HackGT)

## 0) One-line goal

An AI travel app that onboards users via a neat, full-screen Q&A, proposes an itinerary, and—once approved—lets them manage a split-view Itinerary (per-day dropdowns + inline calendar) and a Tasks hub (general + destination-specific), with a right-side expandable assistant that can help complete tasks and update the plan.

---

## 1) User journeys

### A. First-run onboarding

1. User opens app → sees **full-screen question** centered, minimal UI, top **progress bar**.
2. Types answer in bottom input, presses **Submit**.
3. Agent may ask **follow-up** (e.g., missing end date) **before** moving to next question.
4. After final question, agent shows **Proposed Itinerary** card in the same centered view.
5. User clicks **Approve Itinerary** (or Regenerate). Approve → proceeds to main app.

### B. Itinerary management

1. Land on **Itinerary** tab.
2. **Split view**:

   * **Left**: Accordion per day → within each, time-boxed items (start/end, title, note).
   * **Right**: **Inline calendar** (time grid). Clicking an event opens a **Task Modal**.
3. From a day item or a calendar event → “Tasks” button opens modal with subtasks and “Help me”.

### C. Tasks hub

1. Go to **Tasks** tab.
2. **General Tasks** (passport, insurance, vaccines, visa).
3. **Destination-specific tasks** grouped by city.
4. Each task: mark complete or click **AI help** to open assistant dock with prefilled context.

### D. Right-side assistant dock

1. Dock handle on the right; expands/collapses without leaving current tab.
2. User can chat to:

   * Create/modify tasks
   * Insert/update calendar items
   * Ask for links/checklists (e.g., visa steps)
3. Responses show inline in dock; app state updates accordingly.

---

## 2) Screens & layout

### 2.1 Onboarding screen (full page)

* **Header**: App title + subtle subtitle.
* **Progress bar**: fills with % of answered core questions.
* **Centered question**: large, friendly, single line or two.
* **Assistant hint** (small text) for follow-ups.
* **Bottom sticky input**: input + Submit button.
* **When ready**: replace question area with **Proposed Itinerary** preview and two buttons:

  * **Approve Itinerary** (primary)
  * **Regenerate** (secondary)

### 2.2 Main app shell

* Header with app title and small “HackGT demo”.
* **Tabs**:

  * **Itinerary**
  * **Tasks**
* **Right-side assistant dock**: collapsible panel that overlays content.

### 2.3 Itinerary tab (split view)

* **Left (2 columns span)**: Accordion per day

  * Each day row: date + city
  * Inside: items with `HH:MM–HH:MM`, title, note, “Tasks” button (opens modal)
* **Right (1 column)**: Inline multi-day time grid (08:00–22:00, 30-min slots)

  * Clicking an event opens the same Task Modal.

### 2.4 Tasks tab

* **Left card**: General Tasks (toggle complete, “AI help”)
* **Right card**: Destination-Specific Tasks, grouped by city (each with toggles + “AI help”)

### 2.5 Task Modal (from itinerary/calendar)

* Title + time chip
* Optional note
* Bullet subtasks
* Buttons: **Help me with this**, **Mark complete**

---

## 3) Data model (frontend)

```ts
type QAKey = "dates" | "destinations" | "preferences" | "budget" | "citizenship";

type Answers = Record<QAKey, string>;

type ItinItem = {
  timeStart: string;   // "09:00"
  timeEnd: string;     // "11:00"
  title: string;
  note?: string;
  tasks?: string[];
};

type ItinDay = {
  date: string;        // "YYYY-MM-DD"
  city: string;
  items: ItinItem[];
};

type Task = { id: string; text: string; done: boolean };

type DestinationTasks = Record<string, Task[]>; // keyed by city name
```

Derived/computed:

* `progress = Math.round(answeredCount / totalQuestions * 100)`
* `approved: ItinDay[] | null`
* `generalTasks: Task[]`
* `destinationTasks: DestinationTasks` (seeded from unique city list after approval)

---

## 4) LLM/agent behavior

### 4.1 Onboarding follow-ups (guardrails)

* `dates`: if no “to” or range → ask for end date.
* `destinations`: if single city → ask to add 1–2 more or confirm single-city trip.
* `budget`: if numeric and low (e.g., < $800) → ask if hostels/low-cost is acceptable.

### 4.2 Itinerary generation (MVP stub → later LLM)

* Parse start date; if invalid, start tomorrow.
* For each destination, allocate two demo days.
* Create 3–4 canonical items per day with reasonable time windows.
* Produce destination tasks from unique cities (maps, tickets, SIM).

### 4.3 Assistant dock intents (MVP)

* “add task X for city Y” → push into `destinationTasks[Y]`.
* “mark task … done” → toggle.
* “add dinner in Rome 19:00–20:30” → insert `ItinItem` into correct `ItinDay`.
* “move museum to tomorrow 10:00” → update item time/date.
* “visa for Spain (Mexican citizen)” → reply with checklist & official link (static list for demo).

> Note: In hackathon MVP, these intents can be **pattern-matched** with simple regex + local handlers; later, route to an LLM tool-use plan.

---

## 5) Components (by responsibility)

* **OnboardingView** (full-screen):

  * Renders progress, question/follow-up, proposed itinerary preview, bottom input.
* **ItinerarySplit**:

  * Left: **DayAccordion** (list of **DayCard** → list of **ItineraryItemRow**)
  * Right: **CalendarGrid** (clickable boxes)
* **TasksTab**:

  * **GeneralTasksCard**
  * **DestinationTasksCard**
* **TaskModal**:

  * Displays selected item’s tasks and actions.
* **AssistantDock**:

  * Expand/collapse, input, streaming reply area, action buttons (optional).

---

## 6) App state & events

* `answers[qKey] = value`
* `qIndex++` when moving to next question.
* `proposed = generateItinerary(answers)`
* On **Approve Itinerary**:

  * `approved = proposed`
  * `seedDestinationTasks(approved)`
* **Task toggle**:

  * General: toggle by id in array
  * Destination: toggle in `destinationTasks[city]`
* **Calendar select / “Tasks” click**:

  * `openEvent = { day, item }` → show modal
* **AssistantDock**:

  * `dockOpen: boolean`
  * `dockInput: string`
  * `dockReply: string | null`

---

## 7) Visual & interaction details

* **Tone**: minimal, clean, plenty of white space, rounded corners, soft shadows.
* **Typography**: headline (xl/2xl), body (base/sm), monospace chips for times.
* **Progress bar**: smooth CSS width transition.
* **Accordion**: only one day open at a time.
* **CalendarGrid**:

  * Columns per day, left time rail, dashed hour lines, absolute-positioned events.
  * Hover: slightly deepen background.
* **Dock**: fixed right, transitions with `translateX`; open/close button in header.

---

## 8) API contract (future-proof; mock for hackathon)

(For later when you wire a backend/LLM)

* `POST /onboarding/itinerary-proposal` → returns `ItinDay[]`
* `POST /assistant/plan` with `{ intent, payload }` → modifies itinerary/tasks and returns diff
* `GET /trip` → `{ itinerary, generalTasks, destinationTasks }`
* For MVP, implement as in-memory store; persist to `localStorage` if time permits.

---

## 9) Acceptance criteria (demo ready)

**Onboarding**

* [ ] First visit shows **only** the centered question screen with a progress bar and bottom input.
* [ ] Follow-ups trigger **before** advancing (dates/destinations/budget rules above).
* [ ] Proposal preview appears and **Approve** flows into main app.
* [ ] Regenerate yields a different (or re-created) proposal.

**Itinerary**

* [ ] Split view: left accordion (per-day items with time chips, note, Tasks button), right inline calendar.
* [ ] Clicking an event or Tasks button opens Task Modal with subtasks.

**Tasks**

* [ ] General Tasks checklist works (toggle; status stays in memory).
* [ ] Destination-specific groups exist for each city; toggles work.
* [ ] “AI help” opens assistant dock prefilled (may be manual for MVP).

**Assistant dock**

* [ ] Expands/collapses from right on every tab.
* [ ] Sending a message shows a response; at least one command (e.g., “add dinner in Rome 19:00–20:30”) updates state and UI.

**Performance & polish**

* [ ] No layout shift when opening dock.
* [ ] Mobile viewport: accordion and calendar stack; dock still accessible.

---

## 10) Edge cases

* Missing/invalid dates → default start tomorrow; show subtle hint.
* Empty destinations → propose 2–3 popular cities based on region preference (hardcode list).
* Overlapping calendar items → offset vertically by a few pixels to avoid full overlap.
* Long task names → ellipsis trimming with tooltip if time.

---

## 11) Stretch (if time allows)

* Drag-resize events on calendar.
* “Duplicate day” / “Swap days”.
* Export to `.ics`.
* Simple visa rule hints per citizenship + country (static JSON).
* Save/load trip (localStorage).

---

## 12) Team split for the hackathon

* **Frontend A**: OnboardingView, follow-up logic, state machine, proposal preview card.
* **Frontend B**: ItinerarySplit (accordion + calendar), Task Modal.
* **Frontend C**: Tasks tab, Assistant dock, mock intent handlers.
* **AI/Logic**: Prompt(s), rule-based follow-ups, itinerary generator improvements, future tool schema.

---

## 13) Prompt sketch (for later tool-use)

> “You are a travel planner agent. Ask one onboarding question at a time. If an answer is incomplete (e.g., dates without an end date), ask a short follow-up. When core questions are answered, propose a concise day-by-day itinerary with 3–4 timed items per day. After the user approves, act as an execution assistant: when asked, add/modify tasks and calendar items. Always confirm changes succinctly.”

---

If you want, I can also drop this as a `README.md` into the canvas or add **TODO comments** in the code where each acceptance criterion is implemented.
