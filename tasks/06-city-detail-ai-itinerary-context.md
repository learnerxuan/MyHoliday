# Feature: City Detail & AI Itinerary Planner

## Overview

This feature covers two connected pages and the full AI chatbot system:

1. **City Detail Page** — shows information about a selected destination with a "Start Planning" CTA
2. **AI Itinerary Planner** — a split-pane interface where the user chats with an AI to build a personalised day-by-day itinerary in real time

The AI is not a form or template generator. It is a full conversational agent that:
- Asks the user targeted questions
- Calls real backend tool functions (hotel search, weather, restaurants, attractions, transport, budget)
- Returns a structured response that simultaneously updates the chat, the live itinerary panel, and the map
- Handles "I don't know" gracefully by falling back to the user's saved profile as defaults


**Dependencies:**
- `01-project-setup` — Supabase client, env vars, folder structure
- `02-ui-components` — Button, Badge, Spinner, PageHeader, Modal (import from `@/components/ui/`)
- `04-auth` — user must be logged in; user profile data is used for AI personalisation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | Supabase (PostgreSQL) |
| AI | OpenAI API or Gemini API — **server-side only via API route** |
| Map | Leaflet.js + React-Leaflet + OpenStreetMap tiles (free, no API key) |
| Routing on map | OSRM public API (free) via Leaflet Routing Machine plugin |
| Hotel & restaurant search | Google Places API (free tier — $200/month credit) |
| Attractions | OpenTripMap API (free tier) |
| Weather | Open-Meteo API (completely free, no API key needed) |
| Budget estimate | Pure JS calculation — no external API |
| Styling | Tailwind CSS with custom tokens |

---

## Environment Variables

Add the following to `env.local`:

```
OPENAI_API_KEY=<your-key>
GOOGLE_PLACES_API_KEY=<your-key>
```

- `OPENAI_API_KEY` — used server-side in `/api/chat/route.js` for LLM calls
- `GOOGLE_PLACES_API_KEY` — used server-side in `search_hotels.js` and `search_restaurants.js`
- Never expose either key to the browser

---

## Routes

| Page | Route | File |
|---|---|---|
| City Detail | `/destinations/[id]` | `app/destinations/[id]/page.jsx` |
| AI Itinerary Planner | `/itinerary?city=[id]` | `app/itinerary/page.jsx` |
| AI Chat API | `/api/chat` | `app/api/chat/route.js` |

---

## Database Schema (Relevant Tables)

```sql
-- Destination data (pre-seeded, curated dataset)
destinations
  id UUID, city VARCHAR, country VARCHAR, region VARCHAR,
  short_description TEXT, latitude FLOAT, longitude FLOAT,
  avg_temp_monthly JSONB,   -- e.g. { "jan": 12, "feb": 14, ... }
  ideal_durations JSONB,
  budget_level VARCHAR,     -- 'Budget' | 'Mid-range' | 'Luxury'
  culture SMALLINT,         -- 0–5 score
  adventure SMALLINT, nature SMALLINT, beaches SMALLINT,
  nightlife SMALLINT, cuisine SMALLINT, wellness SMALLINT,
  urban SMALLINT, seclusion SMALLINT,
  categories TEXT, best_time_to_visit TEXT

-- Traveller profile (used by AI for personalisation — never ask again what's already here)
traveller_profiles
  id, user_id, full_name, age, nationality,
  dietary_restrictions, accessibility_needs, preferred_language

-- Saved itineraries (written on Export)
itineraries
  id UUID, user_id UUID, destination_id UUID, session_id UUID,
  title VARCHAR, content JSONB,
  created_at TIMESTAMP, updated_at TIMESTAMP

-- Chat session (one session per planner visit)
chat_sessions
  id UUID, user_id UUID, destination_id UUID,
  status VARCHAR,  -- 'active' | 'completed'
  created_at TIMESTAMP

-- Chat messages (persisted for context continuity)
chat_messages
  id UUID, session_id UUID,
  role VARCHAR,   -- 'user' | 'assistant'
  content TEXT, created_at TIMESTAMP
```

---

## File & Folder Structure

```
app/
├── destinations/[id]/page.jsx         ← City Detail page
├── itinerary/page.jsx                 ← Split-pane AI Planner
└── api/chat/route.js                  ← LLM orchestration + tool execution

lib/ai/
├── system-prompt.js                   ← Itinerary planning instructions for LLM
└── tools/
    ├── search_hotels.js               ← Google Places API
    ├── search_restaurants.js          ← Google Places API
    ├── search_attractions.js          ← OpenTripMap API
    ├── get_weather.js                 ← Open-Meteo API
    ├── estimate_budget.js             ← Pure JS calculation
    └── check_transport.js             ← OSRM public routing API

components/sections/
├── ChatWindow.jsx                     ← Chat bubbles + input + send button
├── ItineraryPanel.jsx                 ← Live draft itinerary + Export button
├── MapPanel.jsx                       ← Leaflet map + day filter + route drawing
└── OptionsPanel.jsx                   ← Hotel/restaurant comparison cards
```

---

## Page 1: City Detail (`app/destinations/[id]/page.jsx`)

Fetches destination data from the `destinations` table by ID and displays it.

### Content to Display
- City name and country (page heading)
- City image (`image_url` or a placeholder)
- Short description and overview
- Popular attractions / points of interest (from seeded data or OpenTripMap)
- Estimated travel costs (from `budget_level` + historical data)
- Tags: climate, travel style — displayed using `Badge` component
- Weather overview (from `avg_temp_monthly` in the DB — no API call needed here)
- External booking links section (hotels, flights) — links to third-party sites only, no in-app booking

### Actions
- **"Start Planning with AI"** Button (primary) → navigates to `/itinerary?city=[id]`
- Handle 404 — show friendly error if destination ID does not exist

---

## Page 2: AI Itinerary Planner (`app/itinerary/page.jsx`)

### Layout: Split Pane

```
┌─────────────────────────────────────────────────────────────┐
│  Planning: Kyoto, Japan                          [Save & Exit]│
├──────────────────────┬──────────────────────────────────────┤
│                      │  [📋 Itinerary] [🗺 Map] [🏨 Options] │
│   AI CHATBOT         ├──────────────────────────────────────┤
│   (left panel)       │  RIGHT PANEL                         │
│                      │  (switches between 3 tabs)           │
│                      │                                      │
│                      │                                      │
│  [message input ──→] │  [Export to My Plans →]             │
└──────────────────────┴──────────────────────────────────────┘
```

- **Left (50%):** `ChatWindow.jsx` — conversation with the AI
- **Right (50%):** Tabbed panel with 3 tabs:
  - `📋 Itinerary` — `ItineraryPanel.jsx`
  - `🗺 Map` — `MapPanel.jsx`
  - `🏨 Options` — `OptionsPanel.jsx`

All state is managed in `itinerary/page.jsx` and passed down as props.

---

## AI Conversation Flow

### Opening (A+C Hybrid)

When the page loads, the AI sends an opening message using the destination name and the user's profile:

> "You've picked **Kyoto** 🎌 I can see you prefer halal food from your profile. Two quick questions before I build your plan:
> 1. How many days are you thinking?
> 2. Any hotel preference? (Budget / 3-star / 4-star / Luxury)"

**If user answers** → AI uses those answers + profile to call tools and generate a draft.

**If user says "idk" / "dk" / "surprise me"** → AI falls back to profile defaults:
- Duration → 5 days (default)
- Hotel tier → matches `budget_level` from user's quiz preference

The AI **never asks** about things already in the profile (dietary restrictions, accessibility needs, nationality, language). It uses them automatically.

### Refinement (at any time)

After the draft is generated, users can say anything:
- "Swap Day 2 lunch to somewhere halal near Arashiyama"
- "Find me a cheaper hotel, under RM 150/night"
- "What's the weather like in April?"
- "Add a tea ceremony on Day 3"
- "Show me transport options from the hotel to Fushimi Inari"

The AI calls the relevant tool and updates only the affected part of the itinerary.

---

## AI Response: Structured JSON Shape

Every AI response returns **two things simultaneously** — a chat message AND a structured update:

```json
{
  "message": "String — prose displayed in the chat bubble",

  "itinerary_updates": [
    {
      "action": "add | remove | update",
      "day": 1,
      "type": "hotel | restaurant | attraction | transport | note",
      "name": "Kyoto Garden Inn",
      "time": "14:00",
      "time_end": "16:00",
      "lat": 35.0116,
      "lng": 135.7681,
      "price": "RM 220/night",
      "notes": "3★ · 4.2⭐ · Near Gion district",
      "status": "confirmed | suggested",
      "booking_url": "https://..."
    }
  ],

  "options": [
    {
      "name": "Kyoto Garden Inn",
      "type": "hotel",
      "price": "RM 220/night",
      "rating": 4.2,
      "stars": 3,
      "lat": 35.0116,
      "lng": 135.7681,
      "image_url": "...",
      "booking_url": "..."
    }
  ]
}
```

**`itinerary_updates` is an array** — the AI can add multiple items (e.g., a full day plan) in a single response without multiple round trips. Frontend iterates the array and applies each update in sequence.

**Frontend handles each field:**
- `message` → renders as AI chat bubble in `ChatWindow`
- `itinerary_updates` → each item updates the `itinerary` state → `ItineraryPanel` re-renders + map pins drop
- `options` → populates `OptionsPanel` tab with comparison cards (auto-switches to Options tab)

Either `itinerary_updates` or `options` can be `null` if not applicable for that response.

---

## React State (in `itinerary/page.jsx`)

```js
const [messages, setMessages] = useState([])
// Chat history: [{ role: 'user'|'assistant', content: '...' }]

const [itinerary, setItinerary] = useState({})
// { day1: [items], day2: [items], ... }
// Each item: { type, name, time, time_end, lat, lng, price, notes, status, booking_url }

const [activeTab, setActiveTab] = useState('itinerary')
// 'itinerary' | 'map' | 'options'

const [activeDay, setActiveDay] = useState(1)
// Which day the map is currently showing

const [pendingOptions, setPendingOptions] = useState([])
// Current hotel/restaurant options shown in Options tab

const [isLoading, setIsLoading] = useState(false)
// True while waiting for AI response — shows typing indicator

const [toolStatus, setToolStatus] = useState(null)
// e.g. "🔍 Searching for hotels in Kyoto..." — shown as transient bubble during tool execution

const [sessionId, setSessionId] = useState(null)
// UUID of the current chat_sessions row — null until first message creates the session
```

---

## Component: ChatWindow.jsx

```jsx
<ChatWindow
  messages={messages}
  isLoading={isLoading}
  toolStatus={toolStatus}
  onSend={(text) => handleSend(text)}
/>
```

- Renders message bubbles — user messages right-aligned (amber bg), AI messages left-aligned (subtle bg)
- Shows typing indicator (animated dots) when `isLoading` is true
- Auto-scrolls to newest message
- Input field + send button at bottom
- Input disabled while `isLoading`

**Tool call loading indicator:**
When the AI is executing a tool (typically 2–5 seconds), show a status message in the chat rather than a plain spinner:
- Stream a placeholder message in the chat, e.g. `"🔍 Searching for hotels in Kyoto..."`
- The placeholder is replaced by the actual AI response when the tool call completes
- The API route sends a status string (e.g. `{ "status": "Searching for hotels in Kyoto..." }`) as a streaming chunk before the final response, and `ChatWindow` renders it as a transient bubble

---

## Component: ItineraryPanel.jsx

```jsx
<ItineraryPanel
  itinerary={itinerary}
  onExport={() => handleExport()}
/>
```

- Groups items by day
- Each item shows: icon (🏨/🍽/🎯/🚌), name, time, price
- **Green** = `status: 'confirmed'`, **Grey** = `status: 'suggested'`
- **Export to My Plans** button at the bottom — triggers the export flow (confirmation dialog → save → chat stays open, no redirect)

---

## Component: MapPanel.jsx

```jsx
<MapPanel
  itinerary={itinerary}
  activeDay={activeDay}
  onDayChange={(day) => setActiveDay(day)}
/>
```

**Tech:** `react-leaflet` + OpenStreetMap tiles. Install: `npm install react-leaflet leaflet leaflet-routing-machine`

> **Critical — SSR fix:** Leaflet accesses `window`/`document` at import time, which crashes Next.js SSR. `MapPanel` (and any component that imports `react-leaflet`) **must** be loaded with dynamic import and `ssr: false` in `itinerary/page.jsx`:
> ```js
> const MapPanel = dynamic(() => import('@/components/sections/MapPanel'), { ssr: false })
> ```
> Without this the page will throw a ReferenceError on the server.

**Day filter buttons** above the map: `All | Day 1 | Day 2 | Day 3 ...`
- Switching days shows only that day's pins and redraws the route

**Map pins** — different icon per type:
- 🏨 Hotel — amber pin
- 🍽 Restaurant — red pin
- 🎯 Attraction — blue pin
- 🚌 Transport — grey pin

**Route drawing:**
- Leaflet Routing Machine draws a route line connecting all confirmed places in the day's order
- Uses OSRM public API (free) for road/walking routing
- Route shows walking or driving distance between stops

**Coordinates source:**
- Hotel/restaurant coords come from Google Places API results
- Attraction coords come from OpenTripMap results
- Destination city center coords from `destinations.latitude` / `destinations.longitude`

---

## Component: OptionsPanel.jsx

```jsx
<OptionsPanel
  options={pendingOptions}
  onSelect={(option) => handleOptionSelect(option)}
/>
```

- Shows when `pendingOptions` has items (tab auto-switches to Options)
- Each option is a card: image, name, price, rating, stars, brief notes
- **"Select"** button on each card → sends a message to chat ("I'll take [name]") + AI confirms + itinerary updates
- Cards are the same visual style as `ListingCard` but for hotels/restaurants

---

## API Route: `/api/chat/route.js`

### What it receives (POST body)
```json
{
  "message": "user's latest message",
  "sessionId": "uuid",
  "destinationId": "uuid",
  "userId": "uuid"
}
```

### What it does
1. Fetch destination from Supabase (city, country, lat/lng, avg_temp_monthly, budget_level)
2. Fetch user's traveller_profile from Supabase (dietary, accessibility, nationality, language)
3. Build system prompt from `lib/ai/system-prompt.js` with all context injected
4. Send to OpenAI/Gemini with tool definitions for all 6 tools
5. If LLM returns a `tool_call` → execute the matching function from `lib/ai/tools/`
6. Send tool result back to LLM
7. LLM returns final structured JSON response
8. Return the JSON to the frontend

> `OPENAI_API_KEY` is **never** sent to the browser. All LLM calls are server-side only.

---

## The 6 Tool Functions

### 1. `search_hotels.js`
```js
search_hotels({ city, lat, lng, budget_tier, guests, check_in, check_out })
// budget_tier: 'budget' | 'mid-range' | 'luxury'
// Calls Google Places API (nearbysearch, type=lodging)
// Returns: [{ name, price_estimate, rating, stars, lat, lng, image_url, booking_url }]
```

### 2. `search_restaurants.js`
```js
search_restaurants({ city, lat, lng, cuisine, price_range, dietary })
// dietary: e.g. 'halal', 'vegetarian', 'vegan'
// price_range: 1–4 (Google Places price level)
// Calls Google Places API (nearbysearch, type=restaurant, keyword=halal etc.)
// Returns: [{ name, cuisine, price_level, rating, lat, lng, image_url }]
```

### 3. `search_attractions.js`
```js
search_attractions({ city, lat, lng, category })
// category: e.g. 'museum', 'temple', 'nature', 'shopping'
// Calls OpenTripMap API (/places/radius endpoint)
// Returns: [{ name, category, description, lat, lng, image_url }]
```

### 4. `get_weather.js`
```js
get_weather({ city, month })
// month: 'january' | 'february' | ... | 'december'
// First checks destinations.avg_temp_monthly in Supabase (already seeded)
// Falls back to Open-Meteo API if not in DB
// Returns: { month, avg_temp_c, condition, notes }
```

### 5. `estimate_budget.js`
```js
estimate_budget({ hotel_price_per_night, days, guests, meal_budget_per_day, activities_budget })
// Pure JS calculation — no API call
// Returns: { total_estimate, breakdown: { accommodation, food, activities, misc } }
```

### 6. `check_transport.js`
```js
check_transport({ from_lat, from_lng, to_lat, to_lng, mode })
// mode: 'walking' | 'driving' | 'transit'
// Calls OSRM public API (router.project-osrm.org — free)
// Returns: { distance_km, duration_min, mode, steps }
```

---

## System Prompt (in `lib/ai/system-prompt.js`)

The system prompt is built dynamically with context injected:

```
You are an expert travel planner for MyHoliday. You are helping the user plan a trip to {city}, {country}.

User profile:
- Dietary restrictions: {dietary_restrictions}
- Accessibility needs: {accessibility_needs}
- Nationality: {nationality}
- Language preference: {preferred_language}

Destination context:
- City: {city}, {country}
- Best time to visit: {best_time_to_visit}
- Budget level: {budget_level}
- Coordinates: {lat}, {lng}

Your job:
1. Ask at most 2 questions (trip duration, hotel tier). Use profile defaults if user says "dk".
2. Call tools to find real hotels, restaurants, attractions, weather, transport.
3. Recommend the best option and explain why, but always give the user 2–3 alternatives.
4. Return a structured JSON response with "message", "itinerary_updates" (array), and "options" fields.
5. Always respect dietary restrictions and accessibility needs — never suggest non-halal food to a halal user.
6. Build the itinerary day by day, confirming with the user as you go.
```

---

## Session Rules (Finalised)

- Multiple active sessions per city are **allowed** — the user can start fresh even after exporting
- A session stays `active` even after export — **never** mark it as `completed` on export
- `status: 'completed'` is only set when the user explicitly closes/abandons the session (or optionally after an inactivity timeout)
- On page load: check for an existing `active` session for `(user_id, destination_id)` — resume it if found; otherwise create a new session on the first message (not on page load)

---

## Export Flow (Finalised)

When user clicks **"Export to My Plans"**:

1. Show a **confirmation dialog** — "Save this plan to My Plans?" (uses `Modal` component)
2. On confirm: prompt for a plan title (or auto-generate: "Kyoto · 5 Days · March 2026")
3. Save to Supabase `itineraries` table — **always inserts a new row** (never overwrites):
   ```json
   {
     "user_id": "...",
     "destination_id": "...",
     "session_id": "...",
     "title": "Kyoto · 5 Days · March 2026",
     "content": { "day1": [...], "day2": [...], ... }
   }
   ```
4. Show success confirmation
5. **Chat stays open** — do NOT redirect or close the planner after export
6. User can keep chatting, refine further, and export again (creates another `itineraries` row)
7. Export works on **partial** itineraries — not all days need to be confirmed first

---

## Chat Storage Decisions (Finalised)

### What gets stored in `chat_messages`
- Store only `user` and `assistant` (final prose) messages
- **Do NOT** store raw `tool` role messages in the DB — they are handled server-side only and discarded after each request
- This keeps the `role` column constraint simple (`'user' | 'assistant'`) and avoids schema changes
- The system prompt is never stored — it is rebuilt dynamically on every request from destination + profile data

### Session creation and message persistence pattern
1. **Page load:** check for an existing `active` session for `(user_id, destination_id)` in `chat_sessions`
   - If found → resume it (load message history, continue conversation)
   - If not found → do nothing yet; wait for the user's first message
2. **First message:** create the `chat_session` row, then proceed with the API call
3. **After AI responds:** save the user message and assistant message together as an **atomic transaction** (both rows or neither)
4. **Every subsequent request:** fetch the full message history from `chat_messages` for the session, pass as the `messages` array to OpenAI — this is the sole source of conversation context

---

## Design Tokens (Quick Reference)

### Colours
| Token | Hex | Usage |
|---|---|---|
| `charcoal` | `#1A1A1A` | Primary text, chat bubbles (AI) |
| `warmwhite` | `#FAF9F7` | Page background |
| `amber` | `#C4874A` | User chat bubbles, CTAs, active pins |
| `amberdark` | `#8B6A3E` | Hover states |
| `subtle` | `#F5F2EE` | AI message bubble background |
| `muted` | `#F0EBE3` | Tags, badges |
| `secondary` | `#666666` | Descriptions, metadata |
| `border` | `#EBEBEB` | Card borders, dividers |
| `success` | `#059669` | Confirmed items (green) |
| `success-bg` | `#ECFDF5` | Confirmed item background |

### Typography
| Usage | Class |
|---|---|
| Page heading | `text-4xl font-extrabold font-display` |
| Card heading | `text-xl font-semibold font-body` |
| Chat message | `text-sm font-normal font-body` |
| UI label | `text-xs font-semibold font-body` |

### Layout
- Page max width: `max-w-5xl mx-auto`
- Card padding: `p-5`
- Card border radius: `rounded-xl`
- Button border radius: `rounded-md`
- Input border radius: `rounded-lg`
- Modal border radius: `rounded-2xl`

---

## Components Used (from `@/components/ui/`)

| Component | Where Used |
|---|---|
| `Button` | "Start Planning", send message, Export, day filter |
| `Badge` | Tags on city detail, dietary/type labels |
| `Spinner` | Loading states |
| `PageHeader` | City detail header |
| `Modal` | Export title prompt, confirm dialogs |

---

## CSS Rules (Strictly Follow)

- Never write inline `style={{}}`
- Never create a separate `.css` file for a component
- Never use arbitrary Tailwind values like `w-[347px]`
- Always use named colour tokens — never hardcode hex values
- Navbar and Footer come from root layout — never add them inside these pages

---

## External Links (No In-App Booking)

City pages include links to third-party booking sites. MyHoliday **does not** process any bookings — it only links out. Links should open in a new tab (`target="_blank" rel="noopener noreferrer"`).
