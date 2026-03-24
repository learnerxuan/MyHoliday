# Todo: City Detail & AI Itinerary Planner

## Checklist

### Setup
- [x] Add `OPENAI_API_KEY` and `GOOGLE_PLACES_API_KEY` to `env.local`
- [x] Install packages: `npm install react-leaflet leaflet leaflet-routing-machine`

### Database
- [x] Create `chat_sessions` table (`id`, `user_id`, `destination_id`, `status`, `created_at`)
- [x] Create `chat_messages` table (`id`, `session_id`, `role`, `content`, `created_at`) — `role` constraint: `'user' | 'assistant'` only
- [x] Create `itineraries` table (`id`, `user_id`, `destination_id`, `session_id`, `title`, `content JSONB`, `created_at`, `updated_at`)

### City Detail Page (`app/destinations/[id]/page.jsx`)
- [x] Create the page file
- [x] Fetch destination data from Supabase `destinations` table by ID
- [x] Display city name and country as the page heading
- [x] Display city image (or placeholder)
- [x] Display short description and overview text
- [ ] Display popular attractions and points of interest
- [x] Display estimated travel costs (from `budget_level`)
- [x] Display climate and travel style tags using `Badge` components
- [x] Display weather overview from `avg_temp_monthly` (no API call needed)
- [x] Add "Start Planning with AI" `Button` (primary) → navigates to `/itinerary?city=[id]`
- [x] Add external booking links section (opens in new tab with `rel="noopener noreferrer"`)
- [x] Handle 404 — show friendly error if destination ID does not exist

### AI Planner Page — Layout (`app/itinerary/page.jsx`)
- [x] Create the page file
- [x] Read `city` query param; redirect or show error if missing
- [x] Set up split-pane layout: `ChatWindow` (left 50%) + tabbed right panel (right 50%)
- [x] Add tab bar: `📋 Itinerary | 🗺 Map | 🏨 Options`
- [x] Import `MapPanel` with dynamic import + `ssr: false` to prevent Leaflet SSR crash
- [x] Show destination name in the page header
- [ ] Add "Save & Exit" button in the header

### AI Planner Page — React State (`itinerary/page.jsx`)
- [x] `messages` — chat history `[{ role, content }]`
- [x] `itinerary` — `{ day1: [...], day2: [...] }` each item has `{ type, name, time, lat, lng, price, notes, status, booking_url }`
- [x] `activeTab` — `'itinerary' | 'map' | 'options'`
- [x] `activeDay` — which day the map is showing
- [x] `pendingOptions` — hotel/restaurant comparison cards
- [x] `isLoading` — true while waiting for AI response
- [x] `toolStatus` — string shown in chat during tool execution (e.g. `"🔍 Searching for hotels..."`)
- [x] `sessionId` — UUID of the current `chat_sessions` row (null until first message)

### Chat Session Management
- [x] On page load: check for existing `active` session for `(user_id, destination_id)` — resume if found
- [x] On first message: create `chat_sessions` row (do NOT create on page load)
- [x] On AI response: save user + assistant messages together (atomic insert — both or neither)
- [x] On every API request: fetch full message history from `chat_messages`, pass as `messages` array to OpenAI
- [x] Do NOT store `tool` role messages in DB — server-side only

### Component: `ChatWindow.jsx`
- [x] Create `components/sections/ChatWindow.jsx`
- [x] Render user messages right-aligned (amber background)
- [x] Render AI messages left-aligned (subtle background)
- [x] Show animated typing indicator when `isLoading` is true
- [x] Show tool status message (e.g. `"🔍 Searching for hotels in Kyoto..."`) as transient bubble during tool execution
- [x] Replace status bubble with actual AI response when done
- [x] Auto-scroll to newest message
- [x] Text input + send button at the bottom
- [x] Disable input while `isLoading`
- [ ] Trigger opening message on mount (AI sends first — asks duration + hotel tier using profile)

### Component: `ItineraryPanel.jsx`
- [x] Create `components/sections/ItineraryPanel.jsx`
- [x] Group items by day
- [x] Each item shows icon (`🏨 / 🍽 / 🎯 / 🚌`), name, time, price
- [x] Confirmed items (`status: 'confirmed'`) shown in green; suggested items in grey
- [x] "Export to My Plans" button at the bottom

### Component: `MapPanel.jsx`
- [x] Create `components/sections/MapPanel.jsx`
- [x] Use `react-leaflet` + CartoDB Voyager tiles (English labels, no API key)
- [x] Day filter buttons above map: `All | Day 1 | Day 2 | ...`
- [x] Render pins per type: amber (hotel), red (restaurant), blue (attraction), grey (transport)
- [x] Use Leaflet Routing Machine + OSRM to draw route between confirmed stops for the selected day
- [x] **Do NOT import this component directly in `itinerary/page.jsx`** — must use `dynamic(..., { ssr: false })`

### Component: `OptionsPanel.jsx`
- [x] Create `components/sections/OptionsPanel.jsx`
- [x] Display comparison cards: image, name, price, rating, stars, brief notes
- [x] "Select" button on each card → sends `"I'll take [name]"` to chat → AI confirms → itinerary updates
- [x] Auto-switch right panel to Options tab when `pendingOptions` has items
- [x] Allow multiple selections — cards show "Added ✓" after select; "Done ✓" button clears the batch

### AI Tool Functions (`lib/ai/tools/`)
- [x] Create `search_hotels.js` — Google Places API `nearbysearch` (type=`lodging`) → returns `[{ name, price_estimate, rating, stars, lat, lng, image_url, booking_url }]`
- [x] Create `search_restaurants.js` — Google Places API `nearbysearch` (type=`restaurant`) → supports `dietary` keyword filter → returns `[{ name, cuisine, price_level, rating, lat, lng, image_url }]`
- [x] Create `search_attractions.js` — OpenTripMap `/places/radius` → returns `[{ name, category, description, lat, lng, image_url }]`
- [x] Create `get_weather.js` — check `destinations.avg_temp_monthly` first; fall back to Open-Meteo API → returns `{ month, avg_temp_c, condition, notes }`
- [x] Create `estimate_budget.js` — pure JS calculation → returns `{ total_estimate, breakdown: { accommodation, food, activities, misc } }`
- [x] Create `check_transport.js` — OSRM public API → returns `{ distance_km, duration_min, mode, steps }`

### System Prompt (`lib/ai/system-prompt.js`)
- [x] Create `lib/ai/system-prompt.js`
- [x] Inject destination context: city, country, best time to visit, budget level, coordinates
- [x] Inject user profile: dietary restrictions, accessibility needs, nationality, language
- [x] Instruct AI: ask at most 2 questions (duration, hotel tier); use profile defaults if user says "dk"
- [x] Instruct AI: never ask about things already in the profile
- [x] Instruct AI: return structured JSON with `message`, `itinerary_updates` (array), `options`
- [x] Instruct AI: plan one day at a time; be proactive in suggesting next steps
- [x] Instruct AI: scope restricted to travel only — refuse off-topic requests

### Security (`lib/ai/guardrails.js`)
- [x] Keyword blocklist checked before every API call — blocks jailbreak attempts
- [x] Off-topic filter — blocks requests for homework, medical/legal/financial advice, crypto, etc.
- [x] Returns polite refusal in NDJSON format (same stream format as normal responses)
- [x] System prompt `## Scope — STRICT` section as defence-in-depth layer

### API Route (`app/api/chat/route.js`)
- [x] Create the route file
- [x] Accept POST body: `{ message, sessionId, destinationId, userId }` — no `history` (fetched from DB server-side)
- [x] Fetch destination from Supabase
- [x] Fetch user traveller_profile from Supabase
- [x] Build system prompt dynamically
- [x] Send to OpenAI with all 6 tool definitions
- [x] On `tool_call`: execute matching function from `lib/ai/tools/`; stream tool status message to client
- [x] Send tool result back to OpenAI; get final structured JSON response
- [x] Return final JSON to frontend
- [x] Handle errors gracefully (rate limits, network failures)
- [x] Never expose `OPENAI_API_KEY` or `GOOGLE_PLACES_API_KEY` to the browser

### Export Flow
- [x] "Export to My Plans" shows a confirmation `Modal` — "Save this plan to My Plans?"
- [x] On confirm: prompt for plan title (or auto-generate: `"Kyoto · 5 Days · March 2026"`)
- [x] Insert new row into `itineraries` table with current `itinerary` state as `content` JSONB
- [x] Each export always creates a **new row** — never overwrites previous exports
- [x] Export works on partial itineraries (not all days need to be confirmed)
- [x] After export: show success confirmation; **keep chat open** — do NOT redirect
- [x] User can export again after further refinements

### Extras (beyond original spec)
- [x] Google Places photo proxy (`app/api/places-photo/`) — keeps API key server-side
- [x] `react-markdown` rendering in ChatWindow — properly renders AI prose responses
- [x] OptionsPanel image `onError` fallback — shows emoji placeholder if photo fails to load
- [x] Supabase browser client uses `createBrowserClient` (`@supabase/ssr`) — cookies-based so middleware can read session
- [x] OAuth callback replaced with client-side `page.tsx` — handles both implicit and PKCE flows
- [x] Homepage (`app/page.tsx`) — hero, how-it-works, featured destinations, marketplace teaser
- [x] Layout scroll fix — `h-screen overflow-hidden` body + `overflow-y-auto` wrapper so planner panels scroll independently, not the whole page

### Final Testing
- [ ] Test full flow: city detail → Start Planning → chat → AI generates draft → refine → export
- [ ] Verify `itinerary_updates` array applies multiple items in a single AI response
- [ ] Verify tool status message appears during tool execution and is replaced by real response
- [ ] Verify session resumes correctly on page reload
- [ ] Verify multiple exports create multiple rows (no overwrite)
- [ ] Verify MapPanel loads without SSR errors
- [ ] Test "idk" / "surprise me" → AI falls back to profile defaults
- [ ] Test dietary restriction respected — no non-halal suggestions for halal users
- [ ] Verify API keys are not present in any client-side bundle
- [ ] Test API error handling (bad key, network failure)
- [ ] Test guardrails — verify jailbreak and off-topic messages are blocked
