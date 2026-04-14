# MyHoliday AI Chatbot Overhaul Plan

## Summary

This document defines the implementation plan for upgrading the MyHoliday AI chatbot into a stronger quiz-first trip planning system.

Target product flow:

`Quiz -> immediate AI draft -> planner-first workspace -> guided refinement -> save/export`

This plan is intentionally constrained to **code-only changes**. It must **not modify Supabase schema, migrations, or database structure**. Existing database issues should be handled in code through safer assumptions, fallbacks, validation, and phased adaptation where possible.

This plan also assumes all work happens on branch:

`codex/chatbot-overhaul`

## Product Goal

The current chatbot should stop feeling like a generic assistant that happens to output an itinerary. It should feel like a structured planner that:

- uses quiz results as authoritative planning input
- generates a useful first draft immediately
- lets the user refine the trip using visible actions and real place options
- enriches itinerary items with route, image, opening hours, price, and explanation
- uses chat as a planner assistant, not as the only interface

## Non-Goals For This Phase

- No Supabase schema or migration changes
- No full booking integration
- No flight scraping from arbitrary websites
- No full product rewrite
- No hard dependency on a place-ID-first architecture for every feature on day one

## Key Problems In The Current Chatbot

### 1. The planner is not clearly the main product

Current behavior still leans too much on the chat transcript. Users can get a draft, but refinement is not yet strong enough through structured planner interactions.

Impact:

- editing feels vague
- chat carries too much responsibility
- the trip does not yet feel like a durable object

### 2. The post-quiz transition is underpowered

The quiz already collects meaningful planning input, but the current first-draft experience does not fully capitalize on it.

Impact:

- users do not see enough immediate value from the quiz
- the assistant may feel repetitive or weak after intake
- the first response is not as planner-oriented as it should be

### 3. The options workflow is incomplete

The codebase suggests an options-based workflow, but the live planner behavior is not consistently built around visible place choices and targeted replacement actions.

Impact:

- users cannot compare or select alternatives cleanly
- nearby recommendations are not yet a first-class product capability

### 4. Itinerary items are too thin

Activities should carry richer details:

- description
- route context
- opening hours
- price
- image
- reason for selection

Impact:

- the plan feels too light compared with tools like Trip.com
- users cannot judge quality or practicality quickly

### 5. The backend tool layer is too narrow for a planner product

The model should not invent operational facts. The system needs backend scripts that provide:

- nearby places
- place details
- images
- hours
- price
- route duration and distance
- day-level logistics validation
- optional flights later

Impact:

- the AI risks guessing instead of planning
- the system cannot support rich cards and route-aware decisions

## Target Product Behavior

## A. Quiz-First Drafting

After quiz completion, the planner should:

- load quiz-derived trip context immediately
- avoid re-asking known facts
- generate a full first draft
- summarize the assumptions used

Example opening behavior:

“Based on your quiz, I created a 5-day relaxed Kyoto trip for a mid-range couple focused on food and culture.”

The UI should immediately show:

- a day-by-day itinerary
- a map
- quick refinement actions
- any unresolved choices in a separate planning area

## B. Planner-First Workspace

The planner should become the primary interface after quiz.

Recommended structure:

- `Overview`
- `Day 1...Day N`
- `To be planned`
- `Notes`

The chat remains useful, but should act as:

- a refinement assistant
- a search assistant
- a patch generator for the itinerary

It should not remain the primary surface where the user must do all work.

## C. Nearby Discovery Through Category Buttons

The map buttons should work like lightweight exploration tools.

Examples:

- click `Attractions` -> show nearby attractions around the active map or selected itinerary stop
- click `Food` -> show nearby restaurants and food experiences
- click `Properties` -> show likely hotel options or stay areas
- click `Shopping` -> show nearby shopping spots
- click `Airports` -> show relevant airports and transfer anchors

Each result should appear as a structured card with:

- image
- title
- short explanation
- rating summary
- price summary if available
- distance from current area or selected stop
- add/replace action

## D. Rich Itinerary Items

Each itinerary activity should be enriched beyond a short one-line title.

Desired fields:

- `name`
- `type`
- `time`
- `duration_hint`
- `description`
- `why_this_place`
- `lat`
- `lng`
- `image_url`
- `opening_hours`
- `price_estimate`
- `requires_ticket`
- `route_from_previous`

Expected experience:

- the user can understand what the activity actually is
- the user can judge whether it fits the budget, timing, and day flow
- the user can replace or refine a specific item

## E. Route-Aware Itinerary

The itinerary should include transport realism between consecutive activities.

For each transition, the planner should support:

- transport mode
- duration
- distance
- route warnings when relevant

Day-level route summary should show:

- total travel time
- total route distance
- signs of inefficient clustering if present

## F. Separate Notes Layer

Trip-level notes should be separate from itinerary items.

Examples:

- local etiquette
- transit tips
- airport arrival reminders
- payment notes
- weather-related cautions
- destination-specific advice

This should work more like a travel notes panel, not an itinerary item type.

## Backend Script Plan

The model should primarily orchestrate these scripts and then merge the results into planner updates. It should not fabricate factual details that a script can retrieve.

## Priority 1 Scripts

### 1. `search_nearby_places.js`

Purpose:

- search for nearby attractions, food, hotels, shopping, airports, or other place categories

Primary use cases:

- map category buttons
- “show nearby food”
- “replace this attraction with something near here”

Inputs:

- `category`
- `lat`
- `lng`
- `radius_m`
- optional `keyword`
- optional `open_now`
- optional `price_level`
- optional `limit`

Output:

- normalized place cards

Suggested output shape:

```json
{
  "anchor": { "lat": 0, "lng": 0 },
  "category": "food",
  "results": [
    {
      "id": "place-or-fallback-id",
      "place_id": "optional-stable-place-id",
      "name": "Example Place",
      "type": "restaurant",
      "lat": 0,
      "lng": 0,
      "short_address": "Area, City",
      "rating": 4.5,
      "review_count": 120,
      "price_level": "$$",
      "distance_m": 650,
      "image_available": true,
      "summary": "Good nearby option for lunch with strong local reviews.",
      "source": "places-api"
    }
  ]
}
```

### 2. `get_place_details.js`

Purpose:

- fetch richer place information for one selected place

Inputs:

- `place_id`

Output:

- full place detail payload for use in cards and itinerary enrichment

Fields:

- `name`
- `description`
- `editorial_summary`
- `address`
- `lat`
- `lng`
- `rating`
- `review_count`
- `opening_hours`
- `website`
- `phone`
- `price_level`
- `photos`
- `business_status`
- `source`

### 3. `get_place_photo.js`

Purpose:

- retrieve a usable photo for a place

Why this needs its own script:

- some APIs do not always provide usable images
- the UI needs a consistent fallback path

Inputs:

- `place_id`
- optional `photo_reference`
- optional `fallback_query`

Output:

- `image_url`
- `source`
- `attribution`
- `is_fallback`

Fallback order:

1. primary place-photo source
2. cached known image from existing app data if available
3. secondary safe fallback image source
4. generic category image

### 4. `get_place_opening_hours.js`

Purpose:

- normalize opening hours for planner use

Inputs:

- `place_id`

Output:

- `open_now`
- `today_hours`
- `weekly_hours`
- `special_notes`
- `source`

### 5. `get_activity_price.js`

Purpose:

- estimate or fetch activity price

Inputs:

- `place_id`
- `name`
- `city`
- optional `type`

Output:

- `price_text`
- `price_min`
- `price_max`
- `currency`
- `confidence`
- `source`

Important implementation rule:

- if exact pricing cannot be verified, return approximate pricing with explicit confidence
- do not pretend uncertain values are exact

### 6. `get_route_segment.js`

Purpose:

- compute route data between two points

Inputs:

- `from_lat`
- `from_lng`
- `to_lat`
- `to_lng`
- `mode`

Output:

- `distance_km`
- `duration_min`
- `polyline`
- `warnings`
- `source`

This should become the normalized routing primitive used by planner enrichment.

### 7. `build_day_route.js`

Purpose:

- compute route details for a whole itinerary day

Inputs:

- `day_items`
- optional `hotel_anchor`
- optional `mode_preference`

Output:

- ordered route segments
- total distance
- total travel time
- route warnings
- clustering notes

### 8. `enrich_itinerary_items.js`

Purpose:

- enrich AI-generated itinerary items after the draft is created

This script should:

- resolve better coordinates when possible
- fetch image
- fetch hours
- fetch price
- fetch place detail summary
- fetch route from previous item

Output:

- fully enriched itinerary ready for UI rendering

This is one of the most important scripts because it separates:

- AI-generated structure
- backend-factual enrichment

### 9. `search_alternatives.js`

Purpose:

- find replacements for an existing itinerary item

Inputs:

- current item
- anchor location
- budget
- style preferences
- dietary constraints if food
- day context

Output:

- alternative place cards
- each with short reason and replace-ready structure

## Priority 2 Scripts

### 10. `validate_itinerary_logistics.js`

Purpose:

- validate whether the itinerary makes practical sense

Checks:

- place likely closed at planned time
- route too long between stops
- overpacked day
- poor geographic flow
- suspicious timing gaps

Output:

- list of warnings
- suggested fixes

### 11. `get_trip_notes.js`

Purpose:

- generate a structured trip notes block for the current destination and trip

Topics:

- arrival and immigration notes
- local transport tips
- etiquette
- payment guidance
- local cautions
- weather reminders

## Flight Scripts For Later Phase

### 12. `search_flights.js`

Purpose:

- search inbound and outbound flights using a proper API source

Inputs:

- origin
- destination
- departure date
- return date
- passengers
- cabin class
- budget

Output:

- normalized flight options

### 13. `rank_flights.js`

Purpose:

- rank flight options by user preference

Ranking modes:

- cheapest
- shortest
- best value
- best schedule

Important implementation rule:

- do not build this on unstable browser scraping in v1
- use a proper flight data API or official data source

## Orchestration Model

GPT-4.1-mini should act as:

- input interpreter
- planner orchestrator
- tool caller
- result summarizer
- itinerary patch generator

GPT-4.1-mini should not be the primary source of truth for:

- exact image URLs
- exact route timing
- exact price
- exact opening hours
- flight comparison facts

Correct control flow:

1. user asks for planning or nearby suggestions
2. model decides what script(s) are needed
3. scripts return structured data
4. model merges that into:
   - planner updates
   - option cards
   - concise explanation

## Frontend Changes

## Planner Screen

The planner UI should evolve toward:

- itinerary workspace as primary surface
- map tied directly to itinerary selection
- visible category buttons
- visible place cards for nearby discovery
- quick action buttons for refinement

## Nearby Results UI

For map category filters, results should support:

- clustered map markers
- result cards
- add to selected day
- replace an existing stop
- preview details

## Itinerary Item Cards

Each item card should support:

- title
- richer description
- image
- opening hours
- price
- route from previous stop
- replace/remove actions

## Notes UI

Trip-level notes should be displayed separately from itinerary items, likely in:

- `Overview`
- or a dedicated `Notes` section

## Code-Only Constraint Handling

Because Supabase must not be changed in this phase:

- no migrations are added
- no schema edits are made
- no existing Supabase files are modified unless strictly required for non-schema code behavior

Where schema drift exists, code should:

- tolerate missing optional fields safely
- avoid hard assumptions when possible
- separate “requires schema work later” from “can be improved now in code”

## Suggested Implementation Order

### Phase 1: Stabilize and prepare

- normalize planner-side item shape
- define place card shape
- define route segment shape
- cleanly expose a tool contract from chat route

### Phase 2: Nearby place discovery

- implement `search_nearby_places.js`
- implement `get_place_details.js`
- implement `get_place_photo.js`
- wire category buttons to nearby search

### Phase 3: Enriched itinerary items

- implement `get_place_opening_hours.js`
- implement `get_activity_price.js`
- implement `enrich_itinerary_items.js`
- upgrade itinerary card rendering

### Phase 4: Route realism

- implement `get_route_segment.js`
- implement `build_day_route.js`
- attach transport summaries to itinerary items and days

### Phase 5: Smarter alternatives and validation

- implement `search_alternatives.js`
- implement `validate_itinerary_logistics.js`
- add replace/regenerate flows based on real place candidates

### Phase 6: Trip notes and flights

- implement `get_trip_notes.js`
- later add `search_flights.js` and `rank_flights.js`

## Acceptance Criteria

The overhaul is successful when:

- quiz results drive the first draft directly
- the planner, not the chat, feels like the main product
- clicking `Attractions` or `Food` shows nearby place cards on the map
- itinerary items show richer activity descriptions
- itinerary items can show image, hours, and price where available
- route duration and distance appear between activities
- missing image/price data degrades gracefully
- GPT-4.1-mini acts mainly as orchestrator, not fact inventor
- all changes are delivered without Supabase schema modifications

