# MyHoliday — Project Context

## What is this?
Personalised travel planning web app (university capstone — AAPP011-4-2).
Users take a quiz → get matched to destinations → chat with an AI to build a day-by-day itinerary → optionally hire a local guide via a marketplace.

## Tech Stack
| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript for layout/config, JavaScript for components/API routes |
| Styling | Tailwind CSS v4 with custom design tokens |
| Auth | Supabase Auth (Google OAuth, PKCE + implicit flow) |
| Database | Supabase (PostgreSQL) with Row Level Security on every table |
| AI | OpenAI GPT-4o-mini — server-side only |
| Maps | React-Leaflet v5 + CartoDB Voyager tiles + Leaflet Routing Machine (OSRM) |
| External APIs | Google Places (hotels/restaurants/photos), OpenTripMap (attractions), Open-Meteo (weather) |

## Repository
GitHub: https://github.com/learnerxuan/myholiday · Branch: `main`

## Environment Variables (never commit real values)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
OPENAI_API_KEY          ← server-side only
GOOGLE_PLACES_API_KEY   ← server-side only
```

## Design Tokens
Colours: `charcoal` `warmwhite` `amber` `amberdark` `subtle` `muted` `secondary` `tertiary` `border` `success` `success-bg` `warning` `warning-bg` `error` `error-bg`
Fonts: `font-display` = Funnel Display (headings), `font-body` = Noto Serif (body)
**Funnel Display has NO italic** — use `.italic-accent` CSS class instead.

## Key File Structure
```
app/
  page.tsx                          Homepage (server component)
  layout.tsx                        Root layout: Navbar + flex-1 overflow-y-auto
  globals.css                       Design tokens, base resets, .italic-accent
  destinations/[id]/page.jsx        City Detail (server component)
  itinerary/
    page.jsx                        Suspense wrapper (h-full overflow-hidden)
    ItineraryPlanner.jsx            Full AI planner (client component)
  api/
    chat/route.js                   AI chat — NDJSON streaming
    places-photo/route.js           Google Places photo proxy
  auth/
    login/page.tsx
    callback/page.tsx               OAuth callback — CLIENT component (handles #hash)

components/
  Navbar.tsx
  sections/
    ChatWindow.jsx                  Chat bubbles + react-markdown + typing indicator
    ItineraryPanel.jsx              Day-grouped itinerary + Export button
    MapPanel.jsx                    Leaflet map (ALWAYS dynamic import, ssr: false)
    OptionsPanel.jsx                Comparison cards with multi-select

lib/
  supabase/
    client.ts                       createBrowserClient (@supabase/ssr) — cookies-based
    server.ts                       createSupabaseServerClient — server components/routes
    auth.ts                         signOut helper
  ai/
    system-prompt.js                Dynamic prompt builder (destination + user profile)
    guardrails.js                   Keyword blocklist: jailbreak + off-topic
    tools/
      index.js                      Tool definitions + executeTool dispatcher
      search_hotels.js              Google Places nearbysearch (lodging)
      search_restaurants.js         Google Places nearbysearch (restaurant)
      search_attractions.js         OpenTripMap /places/radius
      get_weather.js                avg_temp_monthly JSONB → Open-Meteo fallback
      estimate_budget.js            Pure JS budget calculator
      check_transport.js            OSRM public API

middleware.ts                       Protects /itinerary, /profile, /admin, /guide
supabase/migrations/                All schema + RLS migrations (run in Supabase SQL Editor)
tasks/                              Per-feature context + todo files
```

## Critical Architecture Rules
- **MapPanel** must always use `dynamic(..., { ssr: false })` — Leaflet crashes on SSR
- **OAuth callback** is `app/auth/callback/page.tsx` (CLIENT component) — never recreate as a server route. Handles `#access_token` hash via `onAuthStateChange`
- **Supabase browser client** uses `createBrowserClient` from `@supabase/ssr` (cookies) — NOT `createClient` from `@supabase/supabase-js` (localStorage). Middleware needs cookies to read the session
- **API keys** never appear in any client-side file — all AI/Places calls are server-side only
- **Layout scroll**: body = `h-screen overflow-hidden flex flex-col`. Wrapper = `flex-1 min-h-0 overflow-y-auto`. Itinerary page = `h-full overflow-hidden` so chat/tab panels scroll independently

## Database RLS Status
All tables have RLS enabled. Key policies:
- `destinations` — public read (no auth required)
- `traveller_profiles`, `tour_guides` — own row only + admin read
- `chat_sessions`, `chat_messages`, `itineraries` — own rows only
- `marketplace_*`, `transactions`, `historical_trips`, `users` (old) — locked (no client policies yet)

## AI Chat Architecture
```
User message
  → guardrails.js (instant blocklist check — no API call)
  → /api/chat/route.js
      → fetch destination + traveller_profile from Supabase
      → buildSystemPrompt()
      → OpenAI tool-calling loop (max 5 rounds, GPT-4o-mini)
          → stream NDJSON status chunks to frontend during tool execution
      → parse JSON: { message, itinerary_updates, options }
      → save user + assistant messages atomically to chat_messages
      → stream result chunk
  → ItineraryPlanner.jsx reads NDJSON stream
      → applyUpdates() patches itinerary state
      → options → OptionsPanel (multi-select, cards stay until "Done ✓")
```

## Feature Status
See `tasks/` folder — each feature has its own context + todo file with up-to-date status.

## Coding Conventions
- Never hardcode hex colours — always use named Tailwind tokens
- Never use arbitrary Tailwind values like `w-[347px]`
- Never write inline `style={{}}` (Leaflet is the only exception)
- No separate `.css` files per component — use globals.css or Tailwind only
- Navbar and Footer come from root layout — never import them inside pages
- Comments only where logic is not self-evident
