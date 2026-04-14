# MyHoliday AI Chatbot Overhaul Todo

## Working Constraints

- Branch must remain: `codex/chatbot-overhaul`
- Do not modify Supabase schema or migrations
- Prefer code-only implementation
- Keep GPT-4.1-mini as orchestrator/tool-caller
- Backend scripts should provide factual planner data

## Phase 1: Foundation and contracts

- [ ] Confirm current chat route responsibilities and list exactly where tool outputs are merged into planner state
- [ ] Define one normalized `itinerary item` shape for frontend and backend use
- [ ] Define one normalized `place card` shape for nearby discovery and alternatives
- [ ] Define one normalized `route segment` shape for transport summaries
- [ ] Define one normalized `trip notes` shape
- [ ] Review current tool registry and identify where new scripts will be registered
- [ ] Review current map and planner components to decide where nearby result cards should render
- [ ] Add a short implementation note explaining how missing image/price/open-hours values should be handled gracefully

## Phase 2: Nearby discovery scripts

- [ ] Create `search_nearby_places.js`
- [ ] Support categories at minimum:
  - [ ] attractions
  - [ ] food
  - [ ] properties
  - [ ] shopping
  - [ ] airports
- [ ] Support anchor-based search around:
  - [ ] current map center
  - [ ] selected itinerary stop
  - [ ] city center fallback
- [ ] Return normalized place cards with summary, rating, distance, and coordinates
- [ ] Create `get_place_details.js`
- [ ] Create `get_place_photo.js`
- [ ] Implement image fallback logic when primary source has no photo
- [ ] Register nearby discovery scripts in the AI tool layer if they should be model-callable

## Phase 3: Planner enrichment scripts

- [ ] Create `get_place_opening_hours.js`
- [ ] Create `get_activity_price.js`
- [ ] Decide confidence model for pricing:
  - [ ] exact
  - [ ] estimated
  - [ ] unknown
- [ ] Create `enrich_itinerary_items.js`
- [ ] Ensure enrichment can be applied after first draft generation
- [ ] Ensure enrichment can be applied after item replacement
- [ ] Add safe fallback behavior when details are partially missing

## Phase 4: Route and transport realism

- [ ] Review whether current `check_transport` should be upgraded or replaced
- [ ] Create `get_route_segment.js`
- [ ] Create `build_day_route.js`
- [ ] Attach segment duration/distance between consecutive itinerary items
- [ ] Add day-level total route distance and total travel time
- [ ] Add route warnings for poor day flow
- [ ] Ensure route logic supports at least walking and driving

## Phase 5: Smarter planner behaviors

- [ ] Create `search_alternatives.js`
- [ ] Support replacement flows for:
  - [ ] food
  - [ ] attraction
  - [ ] hotel/property area
- [ ] Create `validate_itinerary_logistics.js`
- [ ] Validate closed-time conflicts where data exists
- [ ] Validate excessive travel gaps
- [ ] Validate overpacked day structure
- [ ] Return warnings in a UI-friendly structure

## Phase 6: Frontend planner upgrades

- [ ] Decide where category buttons live in the current planner UI
- [ ] Add button handlers for `Attractions`, `Food`, `Properties`, `Shopping`, and `Airports`
- [ ] Add nearby place result cards UI
- [ ] Add add-to-day flow from nearby cards
- [ ] Add replace-current-item flow from nearby cards
- [ ] Upgrade itinerary item cards to show:
  - [ ] richer description
  - [ ] image
  - [ ] opening hours
  - [ ] price
  - [ ] route from previous stop
- [ ] Add overview-level trip notes panel
- [ ] Add clear loading states for place enrichment and nearby search
- [ ] Add empty states for categories with no nearby results

## Phase 7: Chatbot orchestration updates

- [ ] Ensure GPT-4.1-mini is used as planner orchestrator, not as data source for factual fields
- [ ] Update system prompt/tool guidance so the model knows when to call nearby discovery scripts
- [ ] Update tool-call flow so the model can:
  - [ ] request nearby places
  - [ ] request alternatives
  - [ ] enrich a drafted itinerary
  - [ ] attach route summaries
- [ ] Ensure planner patches are structured and validated
- [ ] Ensure the model does not invent images, prices, or hours when script data is missing

## Phase 8: Notes and flights

- [ ] Create `get_trip_notes.js`
- [ ] Show notes separately from itinerary items
- [ ] Design future `search_flights.js` interface without implementing unstable scraping
- [ ] Design future `rank_flights.js` interface
- [ ] Document acceptable flight data source strategy for later implementation

## QA and validation

- [ ] Test quiz -> first draft flow with complete quiz context
- [ ] Test nearby attraction search from map center
- [ ] Test nearby food search from selected itinerary item
- [ ] Test add place from card into itinerary
- [ ] Test replace itinerary item with alternative card
- [ ] Test itinerary enrichment when place photo is missing
- [ ] Test itinerary enrichment when price is unavailable
- [ ] Test route segment generation for consecutive activities
- [ ] Test day route summary output
- [ ] Test fallback behavior when external detail APIs return partial data
- [ ] Confirm no Supabase schema or migration files were changed
- [ ] Confirm all work remains on `codex/chatbot-overhaul`

## Documentation and follow-up

- [ ] Keep this todo file updated as implementation progresses
- [ ] Record any code-only workarounds caused by schema limitations
- [ ] Record which scripts are production-ready vs experimental
- [ ] Record which planner UI changes are v1 vs later-phase

