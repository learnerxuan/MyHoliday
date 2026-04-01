# Flexible AI Chatbot Flow — Design Spec

## Overview

Replace the rigid intake state machine in `route.js` with a fully flexible AI-driven conversation. The hard-coded `buildIntakeResponse` function currently intercepts every message during the intake phase and handles it without calling OpenAI, creating a locked, linear flow. This spec replaces that with a design where every real user message goes straight to OpenAI, which handles the conversation naturally and flexibly.

---

## Problem Statement

The current chatbot has two layers:
1. A hard-coded state machine (`buildIntakeResponse`) that intercepts messages during `intake` phase — no AI involved
2. OpenAI with a phase-prescriptive system prompt — only gets control after the state machine is satisfied

This creates: forced hotel-first ordering, rigid question sequences, inability to start planning freely, and a robotic feel.

---

## Goals

- Users can start planning anything immediately after 2 setup questions (pace + mode)
- No forced hotel selection before day planning
- User can say "plan me the remaining days" or "give me a full draft" at any point
- Day 1 start time asked naturally when relevant, not upfront
- All existing tools remain; behavior becomes more natural, not less capable

---

## Opening Experience

Two paths depending on whether the user arrived via quiz:

| Turn | Handler | Quiz path | No-quiz path |
|---|---|---|---|
| `__INIT__` | Server (no API call) | Greet + confirm days + budget + ask pace (chips: Relaxed/Balanced/Packed) | Greet + ask "How many days is the trip?" (chips: 3/5/7 days) — same as current |
| Days answer (no-quiz only) | OpenAI | — | Asks budget, then pace |
| Pace answer | OpenAI | Asks planning mode: Quick Draft or Guided Planning? | Same |
| Mode answer | OpenAI | Opens up: "What do you want to start with?" | Same |
| Day 1 start time | OpenAI | Asked naturally when about to plan Day 1 | Same |

**`buildInitMessage` retains its existing conditional logic** (days-first when `knownDays` is null). Only the `phase` value it sets changes from `'intake'` to `'setup'`.

---

## plannerState Phase Simplification

**Before:** 6 phases — `intake`, `anchor_selection`, `drafting`, `day_planning`, `review`, `complete`

**After:** 2 phases — `setup` (pace and/or mode not yet confirmed) and `planning` (everything else)

Phase is informational context for the AI only. The server no longer routes based on phase value.

### Phase migration for existing sessions

`normalisePlannerState` requires two changes:

1. **Change the default baseline** from `phase: 'intake'` to `phase: 'setup'` so new sessions start in the correct phase.
2. **Add a coercion step** after the merge that maps old phase values to new ones:
   - `'intake'` → `'setup'`
   - `'anchor_selection'`, `'drafting'`, `'day_planning'`, `'review'`, `'complete'` → `'planning'`
   - `'setup'` and `'planning'` pass through unchanged (they are already valid new-model values)

Both changes are required. Updating the coercion without updating the baseline default would still emit `'intake'` for brand-new sessions before the coercion runs.

The coercion runs **after** the deep merge, on the merged result's `phase` field:

```js
const PHASE_COERCE = {
  intake: 'setup',
  anchor_selection: 'planning',
  drafting: 'planning',
  day_planning: 'planning',
  review: 'planning',
  complete: 'planning',
}
// After merging: coerce stale phase values; 'setup' and 'planning' pass through as-is
merged.phase = PHASE_COERCE[merged.phase] ?? merged.phase
```

This ensures resumed sessions with old phase values send recognisable context to the new system prompt.

### plannerState fields retained

All existing fields are kept (all still useful as AI context):
`mode`, `phase`, `trip_days`, `pace`, `budget_profile`, `day1_start_time`, `arrival_time_hint`, `hotel_status`, `selected_hotel_name`, `draft_generated`, `current_day`, `current_cluster`, `travel_date_start`, `travel_date_end`, `group_size`, `preferred_styles`, `needs` (including `must_do`, `must_avoid`, `dietary`, `accessibility`)

---

## route.js Changes

### Deleted

- `buildIntakeResponse` function (~190 lines) — the entire state machine
- `buildGuidedDayOneResponse` function
- `parseHotelSelection` early-return block
- Parse helpers: `parseTripDays`, `parsePace`, `parseMode`, `parseBudgetProfile`, `parseDay1StartTime`, `parseHotelIntent`, `parseMustDoResponse`
- Message builder: `buildTripSummary`
- The `if (currentPlannerState?.phase === 'intake')` early-return block
- The `if (selectedHotelName && ...)` hotel-selection early-return block
- `enrichHotelOption` and `enrichPlaceOption` — replaced by a single `normaliseOption` function (see below)

### Retained explicitly

- `__INIT__` server-side handler — the inline `planner_state_patch: { phase: 'intake' }` inside this block must change to `{ phase: 'setup' }`; all other logic unchanged
- `buildInitMessage` — retained with existing conditional (days-first when quiz context absent); does not itself set the phase — that is set by the caller
- `formatTimeLabel` — retained (still called by `buildInitMessage`)
- `toTitleCase`, `quickReply` — retained
- `deepMergePlannerState`, `normalisePlannerState` — retained, with phase coercion added
- `extractPlannerStatePatch`, `extractQuickReplies` — retained
- Session creation and resumption
- Guardrails check
- OpenAI tool-calling loop (unchanged)
- plannerState persistence

### Added

**`normaliseOption(option)`** — a lightweight replacement for the deleted `enrichHotelOption`/`enrichPlaceOption` pair. Ensures every item in the AI's returned `options` array has the required fields (`type`, `price`, `notes`) before it reaches OptionsPanel. Applied as a map over `parsed.options` after the OpenAI response is received, before streaming to the client:

```js
function normaliseOption(opt) {
  // Resolve price first so the notes fallback can reference it
  const resolvedPrice = opt.price ?? opt.price_estimate ?? 'Price not available'
  return {
    ...opt,
    type:  opt.type  ?? 'attraction',
    price: resolvedPrice,
    notes: opt.notes ?? [resolvedPrice, opt.rating ? `${opt.rating}/5` : null].filter(Boolean).join(' · ') || '',
  }
}
// Usage: parsed.options = parsed.options.map(normaliseOption)
```

### Resulting size: ~884 lines → ~430 lines

---

## system-prompt.js Changes

Full rewrite of the template string. `formatPlannerState` and `buildItineraryContext` are unchanged.

### Removed from old template

These sections must be **deleted entirely** from the new template — they belong to the old phase model:

- **SECTION 5 — OPENING FLOW** (the `"When the user message is exactly '__INIT__'"` block): `__INIT__` is now handled server-side only; OpenAI never sees it.
- The `"phase can be 'intake', 'drafting', 'anchor_selection', 'day_planning', 'review', or 'complete'"` line in the Planner State interpretation paragraph — replace with: `"phase is either 'setup' (still gathering pace + mode) or 'planning' (free conversation)"`
- In the **Response Contract** section, the phase list `"mode, phase, trip_days, pace, hotel_status, selected_hotel_name, draft_generated, current_day, current_cluster, and needs"` remains but any commentary saying the AI should set phase to `'intake'` must be removed. The AI may only set phase to `'planning'` (when transitioning out of setup). `'setup'` is set server-side at session start.

### New template structure

```
SECTION 1  - SCOPE
SECTION 2  - USER PROFILE
SECTION 3  - DESTINATION CONTEXT
SECTION 3b - TRIP CONTEXT (from quiz, conditional)
SECTION 4  - PLANNER STATE
SECTION 5  - SETUP PHASE
SECTION 6  - FREE PLANNING RULES
SECTION 7  - QUICK DRAFT MODE
SECTION 8  - GUIDED PLANNING MODE
SECTION 9  - TOOL USAGE
SECTION 10 - SCHEDULING AND GEOGRAPHY
SECTION 11 - REFINEMENT
SECTION 12 - RESPONSE CONTRACT
```

### SECTION 5 — Setup Phase

- If `phase` is `setup` and `pace` is unknown: ask pace first (do not ask anything else yet)
- If `phase` is `setup` and `pace` is known but `mode` is unknown: ask planning mode (Quick Draft / Guided Planning)
- Once both pace and mode are confirmed: set `planner_state_patch.phase` to `'planning'`
- **If user wants to start planning before setup is complete**: use sensible defaults for missing values, state them in one sentence, then proceed — never block

### Hotel selection in the new flow

With `parseHotelSelection` deleted, hotel confirmation is no longer a server-side intercept. When the user picks a hotel from the options panel, `ItineraryPlanner.jsx` already sends the selection as a regular message (e.g. "I'll go with [hotel name]"). OpenAI now handles this message directly and must:

- Set `planner_state_patch.selected_hotel_name` to the chosen hotel name
- Set `planner_state_patch.hotel_status` to `'confirmed'`
- Add the hotel as an `itinerary_updates` item (action: `add`, type: `hotel`, day: 1) using coordinates and details from the most recent tool result in context
- Continue the conversation naturally (e.g. ask what to plan next)

This behavior is specified in the new **SECTION 6** of the system prompt (see below). No server-side intercept is needed.

### SECTION 6 — Free Planning Rules

- User drives the conversation — respond directly to what they ask
- Hotel is optional before day planning; if no hotel yet, plan around a central area and offer hotel search as a suggestion, not a requirement
- **"Plan me the remaining days" / "plan the rest"**: inspect the current itinerary context (appended to system prompt), identify unplanned days, generate all of them in one response
- **"Give me a full draft" / "plan everything"**: generate all days at once
- Day 1 start time: ask it the first time an item is about to be added to Day 1; do not ask it upfront
- Never re-ask for `trip_days`, `budget`, `group_size`, `preferred_styles` — already known
- If user mentions anything to avoid (places, cuisines, activities, areas): write it to `planner_state_patch.needs.must_avoid`
- If user mentions must-do items: write them to `planner_state_patch.needs.must_do`

### SECTION 7 — Quick Draft Mode

- Generate all requested days in one response using `itinerary_updates` array
- After generating the draft, ask one review question: "Do you want me to refine hotels, food, attractions, pace, or budget?"
- Set `draft_generated: true` in `planner_state_patch`

### SECTION 8 — Guided Planning Mode

- Plan by day and cluster, not by individual meal slots
- After each cluster is confirmed, continue to the next meaningful chunk
- Do not ask permission before every tiny step

---

## Files Changed

| File | Change type |
|---|---|
| `app/api/chat/route.js` | Major refactor — delete state machine, add `normaliseOption`, simplify phases |
| `lib/ai/system-prompt.js` | Full template string rewrite |

## Files Unchanged

`app/itinerary/ItineraryPlanner.jsx`, `lib/ai/tools/*`, `lib/ai/guardrails.js`, all other files.

---

## Success Criteria

1. After pace + mode are answered, user can immediately ask for hotels, Day 1 planning, weather, full draft — anything, in any order
2. "Plan me the remaining days" at any point generates all unplanned days in one response
3. Direct `/itinerary?city=X` (no quiz) still works — AI asks days + budget before pace; full intake works without quiz context
4. Session resume on reload still works; old sessions with `phase: 'intake'` or `phase: 'drafting'` are coerced to new phase values and continue normally
5. Options panel renders correctly for all three card types (hotel, restaurant, attraction) — `normaliseOption` guarantees `type`, `price`, and `notes` are always present
6. Export, map, itinerary panel — no regression
