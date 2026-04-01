# Quiz → Chatbot Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pass quiz answers (trip duration, budget, travel dates, group size, travel styles) from sessionStorage into the AI chatbot so it never re-asks questions the user already answered.

**Architecture:** On `__INIT__`, `ItineraryPlanner` reads `quiz_prefs` + `quiz_trip_meta` directly from sessionStorage inside the `sendInit` function (not via React state, to avoid timing issues) and sends them as `quizContext` in the POST body. The chat API applies this context to the initial `plannerState` (pre-filling `trip_days`, `budget_profile`, `travel_date_start`, `travel_date_end`, `group_size`, `preferred_styles`). The system prompt exposes these fields to the AI so it uses them silently from message one. The `__INIT__` opening message skips the days and budget questions and goes straight to pace.

**Tech Stack:** Next.js 15 App Router, JavaScript (client components + API routes), Supabase, OpenAI GPT-4o-mini, sessionStorage (client-only)

---

## File Map

| File | Change type | What changes |
|---|---|---|
| `app/itinerary/ItineraryPlanner.jsx` | Modify | Read quiz context from sessionStorage inside `sendInit`; pass as `quizContext` in `__INIT__` body; fix hardcoded "Whistler" fallback |
| `app/api/chat/route.js` | Modify | Accept `quizContext`; expand `normalisePlannerState`; apply quiz context on `__INIT__`; update opening message + quick replies; update `buildInitMessage` signature |
| `lib/ai/system-prompt.js` | Modify | Expand `formatPlannerState` to include new fields; add SECTION 3b quiz context block to `buildSystemPrompt`; update SECTION 7 intake list |

No new files needed. No database schema changes needed (`plannerState` is stored as free-form JSONB so new fields are additive).

---

## Task 1: Read quiz context in ItineraryPlanner and pass it on `__INIT__`

**Files:**
- Modify: `app/itinerary/ItineraryPlanner.jsx`

### Context

The quiz stores two objects in sessionStorage after the user submits:
- `quiz_prefs`: `{ styles, budget, climate, groupSize, travelDateStart, travelDateEnd }`
- `quiz_trip_meta`: `{ duration_days, duration_label, travel_month, date_start, date_end, group_size, climate }`

**Important:** We read sessionStorage directly inside `sendInit` (not via a `useState`). This is intentional — `quizContext` is only ever needed for the single `__INIT__` POST, so there's no reason to store it in React state. Reading it directly inside `sendInit` avoids React 18 state batching timing concerns entirely. Do not add a `useState` for this.

`sendInit` is the async function inside the second `useEffect` (the one that fires when `pageReady && !initDone.current && messages.length === 0`). Since this effect only runs once (guarded by `initDone.current`), reading sessionStorage there is safe.

### Steps

- [ ] **Step 1: Read sessionStorage and build `quizContext` inside `sendInit`**

Find the `sendInit` function inside the second `useEffect`. At the very top of `sendInit`, before the `fetch` call, add:

```js
const sendInit = async () => {
  // Read quiz answers from sessionStorage (only used for this single __INIT__ call)
  // Both keys must exist; if either is missing, quizContext stays null (user arrived directly)
  let quizContext = null
  try {
    const rawPrefs = sessionStorage.getItem('quiz_prefs')
    const rawMeta  = sessionStorage.getItem('quiz_trip_meta')
    if (rawPrefs && rawMeta) {
      const prefs = JSON.parse(rawPrefs)
      const meta  = JSON.parse(rawMeta)
      quizContext = {
        trip_days:         meta.duration_days   ?? null,
        budget:            prefs.budget         ?? null,   // e.g. "Mid-range"
        travel_date_start: meta.date_start      ?? null,   // ISO string e.g. "2026-12-10"
        travel_date_end:   meta.date_end        ?? null,
        group_size:        prefs.groupSize      ?? null,   // e.g. "Couple"
        preferred_styles:  prefs.styles         ?? [],     // e.g. ["Culture", "Food & Cuisine"]
      }
    }
  } catch { /* sessionStorage unavailable or corrupted — fall back to null */ }

  setIsLoading(true)
  setToolStatus(null)
  // ... rest of sendInit continues unchanged
```

- [ ] **Step 2: Pass `quizContext` in the `__INIT__` POST body**

Still inside `sendInit`, find the `JSON.stringify` call for the fetch body:

```js
body: JSON.stringify({ message: '__INIT__', sessionId, destinationId: cityId, userId, itinerary }),
```

Change to:

```js
body: JSON.stringify({ message: '__INIT__', sessionId, destinationId: cityId, userId, itinerary, quizContext }),
```

`quizContext` is `null` when the user arrives directly (no quiz). The server handles `null` gracefully — no behaviour change for direct arrivals.

- [ ] **Step 3: Fix the hardcoded "Whistler" fallback in the catch block**

Find the `catch` block at the bottom of `sendInit`. It currently hardcodes a Whistler-specific message and always shows day-count chips. Replace the entire hardcoded content object with a destination-aware fallback that also respects whether quiz context was available:

```js
} catch {
  const fallbackQuickReplies = quizContext?.trip_days
    ? [{ label: 'Relaxed', value: 'Relaxed' }, { label: 'Balanced', value: 'Balanced' }, { label: 'Packed', value: 'Packed' }]
    : [{ label: '3 days', value: '3 days' }, { label: '5 days', value: '5 days' }, { label: '7 days', value: '7 days' }]

  setMessages([{
    role: 'assistant',
    content: quizContext?.trip_days
      ? `${destination?.city ?? 'This destination'} is a great pick.\n\nI can see you're planning **${quizContext.trip_days} days** — what pace suits you: relaxed, balanced, or packed?`
      : `${destination?.city ?? 'This destination'} is a great pick.\n\nHow many days is the trip?`,
    quickReplies: fallbackQuickReplies,
  }])
}
```

Note: `quizContext` is accessible here because it's declared in the outer scope of `sendInit`, before the try block.

- [ ] **Step 4: Verify manually**

Start the dev server (`npm run dev`). Open DevTools → Network tab. Complete the quiz for any destination. Navigate to the city detail and click "Start Planning with AI". Find the `__INIT__` POST to `/api/chat`. Confirm:
- `quizContext` appears in the request body with correct values
- `trip_days` matches the quiz duration
- `budget` matches the quiz budget selection

Then navigate directly to `/itinerary?city=<any-valid-id>` without the quiz. Confirm `quizContext` is `null` in the `__INIT__` body.

- [ ] **Step 5: Commit**

```bash
git add app/itinerary/ItineraryPlanner.jsx
git commit -m "feat: read quiz context from sessionStorage and pass to __INIT__ POST"
```

---

## Task 2: Accept and apply quiz context in the chat API route

**Files:**
- Modify: `app/api/chat/route.js`

### Context

The route currently destructures: `{ message, sessionId, destinationId, userId, itinerary }` from the request body.

`normalisePlannerState` sets the default shape of `plannerState`. We add 4 new fields with safe defaults.

The quiz patch is applied right after `currentPlannerState` is first assigned for a new session, and before the `send(controller, { type: 'session', ... })` call. This means by the time `__INIT__` processing runs, `currentPlannerState` already contains the quiz values. The `__INIT__` handler saves `nextPlannerState` to Supabase by merging `currentPlannerState` (which now includes quiz values) with `initResponse.planner_state_patch` — so the quiz values are persisted correctly without any extra DB call.

**`buildInitMessage` and the `isInit` block are updated in one atomic step** (Step 4 below) to avoid the function being called with a signature mismatch during implementation.

### Steps

- [ ] **Step 1: Destructure `quizContext` from the request body**

Find the POST handler line:

```js
const { message, sessionId, destinationId, userId, itinerary } = await request.json()
```

Change to:

```js
const { message, sessionId, destinationId, userId, itinerary, quizContext } = await request.json()
```

- [ ] **Step 2: Expand `normalisePlannerState` with new fields**

Find `normalisePlannerState`. Add 4 new fields to the defaults object (alongside the existing fields):

```js
function normalisePlannerState(rawState, profile) {
  return deepMergePlannerState({
    mode: null,
    phase: 'intake',
    trip_days: null,
    pace: null,
    budget_profile: 'unknown',
    day1_start_time: null,
    arrival_time_hint: null,
    hotel_status: 'unknown',
    selected_hotel_name: null,
    draft_generated: false,
    current_day: 1,
    current_cluster: 'none',
    // ── Quiz context fields ────────────────────────────────────
    travel_date_start: null,
    travel_date_end: null,
    group_size: null,
    preferred_styles: [],
    // ─────────────────────────────────────────────────────────
    needs: {
      must_do: [],
      must_avoid: [],
      dietary: profile?.dietary_restrictions || 'none',
      accessibility: profile?.accessibility_needs ? 'yes' : 'none',
    },
  }, rawState)
}
```

- [ ] **Step 3: Apply quiz context when creating a new session**

Find the new-session creation block (`if (!currentSessionId) { ... }`). After this line:

```js
currentPlannerState = normalisePlannerState(newSession.planner_state, profile)
```

And **before** this line:

```js
send(controller, { type: 'session', sessionId: currentSessionId })
```

Insert the following block:

```js
// Pre-fill plannerState from quiz answers (new sessions only; existing sessions already have these persisted)
if (quizContext) {
  // "Mid-range" → "mid-range", "Budget" → "budget", "Luxury" → "luxury"
  const normalisedBudget = quizContext.budget
    ? quizContext.budget.toLowerCase()
    : null

  // deepMergePlannerState gives precedence to the second argument (the patch),
  // so quiz values override the 'unknown' / null defaults set by normalisePlannerState.
  // We do NOT call normalisePlannerState again — deepMergePlannerState is sufficient here
  // because currentPlannerState is already fully normalised.
  currentPlannerState = deepMergePlannerState(currentPlannerState, {
    trip_days:         quizContext.trip_days         ?? null,
    budget_profile:    normalisedBudget              ?? currentPlannerState.budget_profile,
    travel_date_start: quizContext.travel_date_start ?? null,
    travel_date_end:   quizContext.travel_date_end   ?? null,
    group_size:        quizContext.group_size        ?? null,
    preferred_styles:  quizContext.preferred_styles  ?? [],
  })
}
```

- [ ] **Step 4: Update `buildInitMessage` AND the `isInit` block together (atomic change)**

These two changes must be made at the same time. If you apply one without the other the server will behave incorrectly.

**4a — Update `buildInitMessage`** (add a third `known` parameter):

```js
function buildInitMessage(destination, profile, known = null) {
  const dietary      = profile?.dietary_restrictions || 'none'
  const accessibility = profile?.accessibility_needs ? 'yes' : 'none'
  const city         = destination.city

  const lines = [`${city} is a great pick for a well-planned getaway.`]

  if (dietary !== 'none') {
    lines.push(`I'll keep your ${dietary} preferences in mind throughout.`)
  } else if (accessibility !== 'none') {
    lines.push("I'll keep accessibility in mind as I build the plan.")
  }

  if (known?.knownDays && known?.knownBudget) {
    // Both values are known from the quiz — confirm them and ask pace next
    lines.push(
      ``,
      `I can see you're planning **${known.knownDays} days** with a **${known.knownBudget}** budget — I'll work from those.`,
      ``,
      `What pace suits you: relaxed, balanced, or packed?`
    )
  } else {
    // No quiz context — ask for days as the first question
    lines.push('', 'How many days is the trip?')
  }

  return lines.join('\n')
}
```

**4b — Update the `isInit` block** to pass `known` and adjust quick replies:

Find the `if (isInit) { ... }` block. Replace only the `initResponse` object and the `buildInitMessage` call within it:

```js
if (isInit) {
  // Determine which values are already known from the quiz
  const knownDays   = currentPlannerState.trip_days ?? null
  const knownBudget = currentPlannerState.budget_profile !== 'unknown'
                        ? currentPlannerState.budget_profile
                        : null

  const known = (knownDays && knownBudget)
    ? { knownDays, knownBudget: knownBudget.charAt(0).toUpperCase() + knownBudget.slice(1) }
    : null

  const initResponse = {
    message: buildInitMessage(destination, profile, known),
    itinerary_updates: [],
    options: [],
    planner_state_patch: { phase: 'intake' },
    // If days are known, skip straight to pace chips; otherwise show day-count chips
    quick_replies: known
      ? [quickReply('Relaxed'), quickReply('Balanced'), quickReply('Packed')]
      : [quickReply('3 days'), quickReply('5 days'), quickReply('7 days')],
  }

  // The rest of the __INIT__ block (nextPlannerState save + DB insert + send) is unchanged.
  // Note: nextPlannerState is built by merging currentPlannerState (which already contains
  // quiz values from Step 3) with initResponse.planner_state_patch — so quiz values
  // are persisted to Supabase correctly without any extra DB call.
```

Leave everything after `initResponse` (the `nextPlannerState` merge, the `supabase.update`, the `supabase.insert`, the `send`, and the `return`) exactly as it is.

- [ ] **Step 5: Verify the intake skip works**

Run the dev server. Go through the quiz — select any destination, set a 7-day trip, choose "Mid-range" budget. Open the planner. The opening AI message should:
- Mention the destination city
- State "7 days" and "Mid-range" as confirmed facts (not questions)
- Ask "What pace suits you: relaxed, balanced, or packed?" as the first question
- Show `Relaxed | Balanced | Packed` as quick reply chips

Reply "Balanced". Confirm the next intake question is about planning mode (not budget or days).

Then open the planner directly via `/itinerary?city=<id>` (clear sessionStorage first or open a private window). Confirm:
- Opening message asks "How many days is the trip?"
- Quick replies show `3 days | 5 days | 7 days`
- Full intake flow (days → pace → mode → budget → Day 1 time → hotel) works as before

- [ ] **Step 6: Commit**

```bash
git add app/api/chat/route.js
git commit -m "feat: accept quizContext in chat API and pre-fill plannerState on __INIT__"
```

---

## Task 3: Expose quiz context fields in the system prompt

**Files:**
- Modify: `lib/ai/system-prompt.js`

### Context

The AI only knows what's in its system prompt. The new `plannerState` fields (`travel_date_start`, `travel_date_end`, `group_size`, `preferred_styles`) are stored on the server but currently invisible to the model. We:

1. Add them to `formatPlannerState` so they appear in SECTION 4 of every request
2. Add a short SECTION 3b block in `buildSystemPrompt` that gives the AI trip-level context
3. Update SECTION 7's intake inference list and intake question order to reflect that `group_size` may already be known

### Steps

- [ ] **Step 1: Expand `formatPlannerState` with the four new fields**

Find `formatPlannerState`. Add 4 lines after the `current_cluster` line and before the `must_do` line:

```js
function formatPlannerState(plannerState = {}) {
  const needs = plannerState.needs ?? {}

  return [
    'CURRENT PLANNER STATE',
    `- mode: ${plannerState.mode ?? 'unset'}`,
    `- phase: ${plannerState.phase ?? 'intake'}`,
    `- trip_days: ${plannerState.trip_days ?? 'unknown'}`,
    `- pace: ${plannerState.pace ?? 'unknown'}`,
    `- budget_profile: ${plannerState.budget_profile ?? 'unknown'}`,
    `- day1_start_time: ${plannerState.day1_start_time ?? 'unknown'}`,
    `- arrival_time_hint: ${plannerState.arrival_time_hint ?? 'none'}`,
    `- hotel_status: ${plannerState.hotel_status ?? 'unknown'}`,
    `- selected_hotel_name: ${plannerState.selected_hotel_name ?? 'none'}`,
    `- draft_generated: ${plannerState.draft_generated ? 'yes' : 'no'}`,
    `- current_day: ${plannerState.current_day ?? 1}`,
    `- current_cluster: ${plannerState.current_cluster ?? 'none'}`,
    // ── Quiz context fields ────────────────────────────────────
    `- travel_date_start: ${plannerState.travel_date_start ?? 'unknown'}`,
    `- travel_date_end: ${plannerState.travel_date_end ?? 'unknown'}`,
    `- group_size: ${plannerState.group_size ?? 'unknown'}`,
    `- preferred_styles: ${(plannerState.preferred_styles ?? []).join(', ') || 'none'}`,
    // ─────────────────────────────────────────────────────────
    `- must_do: ${(needs.must_do ?? []).join(', ') || 'none'}`,
    `- must_avoid: ${(needs.must_avoid ?? []).join(', ') || 'none'}`,
    `- dietary: ${needs.dietary ?? 'none'}`,
    `- accessibility: ${needs.accessibility ?? 'none'}`,
  ].join('\n')
}
```

- [ ] **Step 2: Add the four new variables to `buildSystemPrompt`**

Find `buildSystemPrompt`. After the existing destructuring (the lines that set `dietary`, `accessibility`, `nationality`, `language`, `city`, `country`, `budget`, `best`, `lat`, `lng`), add:

```js
  // Quiz context (may be null/empty if user arrived without taking the quiz)
  const travelDateStart = plannerState.travel_date_start ?? null
  const travelDateEnd   = plannerState.travel_date_end   ?? null
  const groupSize       = plannerState.group_size        ?? null
  const preferredStyles = plannerState.preferred_styles  ?? []
```

- [ ] **Step 3: Build SECTION 3b and inject it into the template string**

Just before the `return` statement in `buildSystemPrompt`, add a helper that builds the section only when data is present:

```js
  const quizContextLines = []
  if (travelDateStart && travelDateEnd) {
    quizContextLines.push(`- travel dates: ${travelDateStart} to ${travelDateEnd}`)
  }
  if (groupSize) {
    quizContextLines.push(`- group size: ${groupSize}`)
  }
  if (preferredStyles.length > 0) {
    quizContextLines.push(`- preferred travel styles (from quiz): ${preferredStyles.join(', ')}`)
    quizContextLines.push(`  Use these to bias attraction and activity recommendations where relevant.`)
    quizContextLines.push(`  Do not repeat or mention these back to the user as a list.`)
  }
  const quizContextSection = quizContextLines.length > 0
    ? `SECTION 3b - TRIP CONTEXT (from quiz)\n${quizContextLines.join('\n')}`
    : ''
```

Then, in the template string, insert the section between SECTION 3 and SECTION 4:

```js
  return `
...

SECTION 3 - DESTINATION CONTEXT
- city: ${city}, ${country}
- best time to visit: ${best}
- default budget level: ${budget}
- city center coordinates: lat ${lat}, lng ${lng}

${quizContextSection ? quizContextSection + '\n\n' : ''}SECTION 4 - PLANNER STATE
${formatPlannerState(plannerState)}

...
`.trim()
```

- [ ] **Step 4: Update SECTION 7 intake inference list and question order**

Find SECTION 7 in the template string. It contains a list of things the AI infers:

```
- trip_days
- pace
- mode
- budget_profile
- day1_start_time
- whether the user already has a hotel or needs suggestions
- must-do attractions, food priorities, and hard constraints
```

Add one line:

```
- trip_days
- pace
- mode
- budget_profile
- day1_start_time
- whether the user already has a hotel or needs suggestions
- group_size (may already be set from planner_state — do not ask if already known)
- must-do attractions, food priorities, and hard constraints
```

Then find the "Ask follow-up questions in this order" numbered list in SECTION 7:

```
1. Ask pace.
2. Ask planning mode.
3. Ask overall budget.
4. Ask what time to start Day 1.
5. Ask whether the user already has a hotel or wants suggestions.
6. Ask for must-do attractions or constraints only if still unknown.
```

Add a note after item 5:

```
1. Ask pace.
2. Ask planning mode.
3. Ask overall budget.
4. Ask what time to start Day 1.
5. Ask whether the user already has a hotel or wants suggestions.
6. Do not ask about group_size — it is captured from the quiz and available in planner_state.
7. Ask for must-do attractions or constraints only if still unknown.
```

- [ ] **Step 5: Verify the AI uses travel styles**

Go through the quiz selecting "Food & Cuisine" and "Nature" as styles. Start the planner, complete the intake, then ask the AI "What do you recommend for Day 1?" Without mentioning food or nature, the AI's suggestions should lean toward nature spots and food experiences rather than generic landmarks. This is qualitative — look at the attraction types in the itinerary panel.

- [ ] **Step 6: Commit**

```bash
git add lib/ai/system-prompt.js
git commit -m "feat: expose quiz context fields in AI system prompt"
```

---

## Task 4: End-to-end smoke test

**Files:** None — verification only.

- [ ] **Step 1: Full quiz-to-planner flow**

1. Go to `/quiz`
2. Select styles: `Culture` + `Food & Cuisine`
3. Select budget: `Mid-range`
4. Select climate: `Tropical`
5. Select group size: `Couple`
6. Set dates: 7 days from today
7. Submit → navigate to destinations page
8. Pick any destination → click "Start Planning with AI"
9. Confirm the opening AI message:
   - Mentions the destination city
   - States "7 days" and "Mid-range" as confirmed facts (not questions)
   - Asks about pace as the first question
   - Quick replies show `Relaxed | Balanced | Packed`
10. Reply "Balanced" → confirm the next question is about planning mode (not days or budget)

- [ ] **Step 2: Direct planner flow (regression check)**

1. Open a private browser window (or clear sessionStorage)
2. Go directly to `/itinerary?city=<any-valid-id>`
3. Confirm opening message asks "How many days is the trip?"
4. Quick replies show `3 days | 5 days | 7 days`
5. Full intake flow works as before (days → pace → mode → budget → Day 1 time → hotel)

- [ ] **Step 3: Resume session flow (regression check)**

1. Complete the quiz → start planner → send at least one message through intake
2. Reload the page
3. Confirm the session resumes from chat history with no duplicate `__INIT__` questions
4. Confirm the chat picks up where it left off

- [ ] **Step 4: Final commit**

```bash
git add docs/superpowers/plans/2026-04-01-quiz-chatbot-bridge.md
git commit -m "docs: add quiz-chatbot bridge implementation plan"
```
