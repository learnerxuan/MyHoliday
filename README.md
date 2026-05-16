# MyHoliday

MyHoliday is a Next.js travel platform for destination discovery, AI-assisted itinerary planning, saved trip management, and traveller-to-guide coordination. A traveller can discover destinations, build an itinerary with an AI planner, save the finished plan, publish it to a marketplace, review guide offers, chat with guides, and complete an internal mock transaction.

The current system uses Next.js App Router, Supabase Auth/PostgreSQL/RLS, OpenAI chat completions, Google Places APIs, Leaflet maps, Recharts reporting, and a mock payment ledger stored in Supabase.

## Current Capabilities

- Email/password auth and Supabase Google OAuth entry points.
- Role-aware onboarding for travellers and tour guides.
- Traveller profile management with full name, date of birth, nationality, dietary restrictions, accessibility needs, preferred language, and admin deactivation support.
- Tour guide onboarding with city assignment, document upload, and admin approval or rejection.
- Destination catalogue with search, budget/region filters, detail pages, imagery, weather data, historical trip statistics, external booking links, and click tracking.
- Preference quiz that scores destinations by travel style, selected regions, budget, trip duration, and climate.
- Personalized discovery API that uses saved itinerary metadata, destination clicks, and prior planner sessions.
- Conversational AI itinerary planner with quick intake, active session resume, structured planner state, map coordinates, itinerary editing, nearby-place search, and autosave.
- Saved itinerary list and individual saved itinerary editor with map view, JSON download, browser print/PDF flow, marketplace publishing, and return-to-chat support.
- Traveller marketplace listings created from saved itineraries.
- Guide marketplace browsing scoped to approved guides and their assigned destination city.
- Marketplace offers with proposed prices, optional guide-edited itinerary proposals, withdrawal rules, acceptance/rejection, and participant chat.
- Mock transactions with configurable platform fee, service charge, guide payout, pending/completed status, and booking history pages.
- Guide workspace for marketplace requests, accepted-tour schedule, completed booking history, and consolidated chat inbox.
- Admin dashboard for traveller management, guide requests/documents, guide status review, marketplace moderation, listing suspension, KPIs, charts, and reports.
- Survey capture for historical trip records used by destination statistics and reporting.

## User Roles

| Role | Current access |
| --- | --- |
| Traveller | Complete traveller onboarding, update profile, take the quiz, browse destinations, plan with AI, save itineraries, publish listings, review offers, chat with guides, pay through the mock flow, and view completed booking history. |
| Tour guide | Complete guide onboarding, upload verification documents, wait for admin approval, browse marketplace requests for the assigned city, submit/edit/withdraw offers before lock, propose itinerary edits, chat with travellers, enable mock payment after offer acceptance, and view schedule/history. |
| Admin | Access admin pages, manage traveller activation, review guide profiles and documents, approve or reject guides, moderate marketplace listings, suspend listings, and view operational/reporting data. |

## Route Map

| Area | Routes |
| --- | --- |
| Public | `/`, `/about`, `/destinations`, `/destinations/[id]`, `/auth/login`, `/auth/register`, `/auth/reset-password`, `/auth/update-password`, `/auth/callback` |
| Traveller | `/auth/onboarding/traveller`, `/profile`, `/quiz`, `/itinerary`, `/itineraries`, `/saved-itinerary/[id]`, `/marketplace`, `/marketplace/new`, `/marketplace/[id]`, `/marketplace/[id]/chat`, `/history`, `/survey` |
| Guide | `/auth/onboarding/guide`, `/marketplace`, `/marketplace/[id]`, `/marketplace/[id]/offer`, `/guide`, `/guide/history`, `/guide/bookings`, `/guide/chats` |
| Admin | `/admin`, `/admin/users`, `/admin/tour-guides`, `/admin/tour-guides/requests`, `/admin/marketplace`, `/admin/reports` |
| Main APIs | `/api/chat`, `/api/recommendation`, `/api/recommendation/discovery`, `/api/destinations`, `/api/city-image`, `/api/place-image`, `/api/nearby-places`, `/api/geocode`, `/api/interactions`, `/api/survey`, `/api/guide/*`, `/api/admin/*`, `/api/marketplace/*` |

`middleware.ts` protects the main authenticated and role-specific route groups, blocks inactive traveller accounts, and redirects unauthenticated users to login. Several pages and API routes also perform their own Supabase user/role checks, so access control is not only middleware-based.

## Core User Flows

### Traveller Discovery And Planning

1. Register or log in from `/auth/register` or `/auth/login`.
2. Complete traveller onboarding at `/auth/onboarding/traveller`.
3. Take the preference quiz at `/quiz`.
4. Review quiz-ranked recommendations on `/destinations?from=quiz`.
5. Open a destination detail page at `/destinations/[id]`.
6. Start the AI planner at `/itinerary?city=<destinationId>`.
7. Complete quick intake or use quiz context, chat with the planner, edit the generated itinerary, inspect the map, and save the plan.
8. Manage active sessions and finalized plans at `/itineraries`.
9. Open a finalized plan at `/saved-itinerary/[id]`.
10. Publish a saved plan to the marketplace from `/marketplace/new` or the saved itinerary viewer.
11. Review offers, chat with guides, accept an offer, complete the mock payment, and view completed bookings at `/history`.

### Tour Guide Marketplace

1. Register with the guide role and complete `/auth/onboarding/guide`.
2. Upload a verification document to the Supabase Storage bucket used by the app (`guide-documents`).
3. Wait for admin approval.
4. Browse matching marketplace requests at `/marketplace`; approved guides only see non-suspended, non-closed listings for their assigned city.
5. Submit an offer from `/marketplace/[id]/offer`.
6. Chat, update the offer price, and propose an edited itinerary while the offer is not locked.
7. Enable mock payment after a traveller accepts the offer.
8. Use `/guide/history` for accepted paid tour schedule, `/guide/bookings` for completed paid booking history, and `/guide/chats` for the consolidated chat inbox.

### Admin Operations

1. Log in with Supabase user metadata role `admin`.
2. Use `/admin` for live KPIs, action queues, marketplace stats, and top clicked destinations.
3. Manage travellers at `/admin/users`, including activation status.
4. Review guides at `/admin/tour-guides` and pending applications at `/admin/tour-guides/requests`.
5. Open uploaded guide documents through admin API routes.
6. Moderate listings at `/admin/marketplace`, including suspended and no-offer listing views.
7. View analytics, charts, and report actions at `/admin/reports`.

## Recommendations

The quiz recommendation endpoint is `/api/recommendation`.

It accepts travel styles, regions, budget, climate, group size, and travel date range. The implementation filters destinations by selected regions, derives inclusive trip duration from the dates, encodes user preferences and destination attributes into normalized vectors, applies cosine similarity, and returns the top scored destinations with trip metadata.

The discovery endpoint is `/api/recommendation/discovery`.

It requires an authenticated user and reads recent saved itineraries, destination click interactions, and planner sessions. It infers preferences, scores destinations, and applies region/country affinity boosts before returning personalized results.

## Destination Data And External Services

Destination records come from Supabase table `destinations`. Historical traveller statistics come from `historical_trips`.

Current supporting routes:

- `/api/destinations` returns paginated destination results with search, budget, and region filters. When user signals exist, it personalizes ordering.
- `/api/city-image` tries Wikipedia summary imagery first, then Google Places images if no Wikipedia image is found and `GOOGLE_PLACES_API_KEY` is configured.
- `/api/place-image` uses Google Places photos.
- `/api/nearby-places` uses Google Places nearby search for restaurants, attractions, hotels, cafes, and shopping.
- `/api/geocode` uses Google Places find-place text search.
- `/api/interactions` records authenticated destination clicks for personalization and admin reporting.

Destination detail pages also show external links to Booking.com, Google Flights, TripAdvisor, and Lonely Planet. These are outbound links only; MyHoliday does not book hotels, flights, or tours directly.

## AI Itinerary Planner

The planner UI is mounted at `/itinerary` and calls `/api/chat`.

Current planner behavior:

- Requires an authenticated user.
- Creates or resumes one active chat session per user and destination.
- Stores messages in `chat_messages`.
- Stores structured state in `chat_sessions.planner_state`.
- Restores itinerary state from Supabase and a browser localStorage backup.
- Uses quiz context when available and otherwise shows quick intake for dates, budget, pace, and group size.
- Uses traveller profile context for dietary needs, accessibility needs, preferred language, and age.
- Streams newline-delimited JSON chunks to the client.
- Uses OpenAI chat completions with `response_format: { type: "json_object" }`.
- Defaults to model `gpt-4o` unless `OPENAI_CHAT_MODEL` is configured.
- Applies local guardrails before calling OpenAI.
- Geocodes itinerary items with Google Places when possible.
- Lets users add, edit, delete, and retime itinerary activities.
- Supports Leaflet map pins, day filtering, route lines, nearby-place search, and adding nearby places into the itinerary.

AI helper files live in `lib/ai/`:

- `system-prompt.js`
- `guardrails.js`
- `tools/index.js`
- `tools/search_places.js`
- `tools/get_weather.js`
- `tools/check_transport.js`
- `tools/estimate_budget.js`

Tool behavior is local to the app. Weather uses stored monthly climate data first and can fall back to Open-Meteo. Transport estimates use OSRM-style routing where available, with transit approximated rather than sourced from a live transit provider.

## Saved Itineraries

Saved plans are stored in `itineraries` with JSON itinerary content and optional `trip_metadata`.

Current saved-plan features:

- `/itineraries` lists active planner sessions and finalized saved itineraries.
- `/saved-itinerary/[id]` opens the saved itinerary viewer/editor.
- Users can edit itinerary items and save changes.
- Users can download JSON.
- The PDF flow uses the browser print dialog from the saved itinerary viewer.
- A saved itinerary can be posted to the marketplace unless the current user is a guide.
- Users can return a saved plan to the AI chat flow when no active session conflict prevents it.

`/history` is not the saved itinerary list. It is the traveller's completed paid marketplace booking history.

## Marketplace And Mock Payments

Marketplace records are stored in:

- `marketplace_listings`
- `marketplace_offers`
- `marketplace_messages`
- `transactions`

Traveller listing behavior:

- Listings are created from saved itineraries.
- Listings include desired budget, destination, itinerary reference, status, and suspension flag.
- Travellers can withdraw their listing, which soft-closes it.
- Travellers can accept one guide offer, which confirms the listing and rejects competing non-withdrawn offers.

Guide offer behavior:

- Guides must have an approved `tour_guides` profile.
- Marketplace supply is scoped to the guide's assigned city.
- Offers include proposed price, intro message, status, optional edited itinerary, and payment-enabled flag.
- Guides can withdraw pending/unlocked offers.
- Offer edits are blocked after acceptance/confirmation/payment lock conditions.

Chat behavior:

- Marketplace chat is stored in `marketplace_messages`.
- Message content includes normal text and internal system tokens for offer price changes, acceptance, itinerary updates, payment enablement, payment completion, and withdrawals.
- Closed or suspended listings block further participant chat in the relevant API routes.

Payment behavior:

- There is no real payment gateway.
- Guides enable a pending transaction after an offer is accepted.
- Travellers mark the internal transaction completed through the mock payment flow.
- Server-side fee calculations use `MARKETPLACE_PLATFORM_FEE_RATE`.
- The guide offer page displays the expected payout using `NEXT_PUBLIC_MARKETPLACE_PLATFORM_FEE_RATE`.
- Both rates default to `0.1` when missing or invalid, and valid configured values must be greater than or equal to `0` and less than `1`.

## Admin And Reporting

Admin reporting reads Supabase data through `lib/actions/reports.ts` and admin API routes.

Current admin metrics include:

- active travellers
- approved guides
- pending guide requests
- open AI sessions
- suspended listings
- listings with no offers
- marketplace offer/listing status counts
- completed GMV
- platform revenue
- average transaction value
- marketplace match rate
- AI planner completion rate
- average messages per planner session
- itinerary volume
- destination demand
- supply/demand by destination
- historical trip dataset size and mix
- top clicked destinations

Admin chart components use Recharts.

## Survey

The survey page posts to `/api/survey` and inserts validated records into `historical_trips`. The API validates destination, duration, traveller age, gender, nationality, accommodation type/cost, and transportation type/cost before inserting.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Web framework | Next.js 16 App Router |
| UI | React 19, Tailwind CSS 4, lucide-react, Recharts |
| Database and auth | Supabase PostgreSQL, Supabase Auth, Row Level Security |
| Supabase clients | `@supabase/ssr`, `@supabase/supabase-js` |
| AI | OpenAI API |
| Maps and places | Google Places APIs, Leaflet, React Leaflet, Leaflet Routing Machine |
| Supporting APIs | Wikipedia summary images, Open-Meteo fallback weather, OSRM-style route estimates |
| Data tooling | Seed/data files under `destination_dataset/` and `scripts/seed_database.py` |
| Deployment target | Vercel-compatible Next.js deployment |

## Project Structure

```text
myholiday/
  app/
    admin/                         Admin dashboard, users, guides, marketplace, reports
    api/                           Next.js API routes
      admin/                       Admin traveller, tour-guide, and marketplace endpoints
      chat/                        AI itinerary planner endpoint
      guide/                       Guide analytics and schedule endpoints
      marketplace/                 Listings, offers, messages, profiles, history, transactions
      recommendation/              Quiz and personalized discovery endpoints
    auth/                          Login, register, callback, onboarding, password flows
    destinations/                  Destination list and detail pages
    guide/                         Guide layout, schedule, bookings, chats
    history/                       Traveller completed booking history
    itinerary/                     AI planner page and planner component
    itineraries/                   Active sessions and saved itinerary list
    marketplace/                   Traveller/guide marketplace screens
    profile/                       Traveller profile
    quiz/                          Preference quiz
    saved-itinerary/[id]/          Saved itinerary viewer/editor
    survey/                        Historical trip survey page
  components/
    admin/                         Admin charts and live stats
    sections/                      Planner, map, chat, listing, marketplace panels
    ui/                            Shared UI primitives
  destination_dataset/             CSV and notebook source data
  lib/
    actions/                       Admin reporting server actions
    ai/                            System prompt, guardrails, and AI tools
    marketplace/                   Mock payment calculations/config
    supabase/                      Browser/server Supabase clients and auth helpers
    recommendation.ts              Discovery preference inference/scoring helpers
    survey-options.ts              Survey option data
  scripts/
    seed_database.py               Data seeding script
  supabase/
    migrations/                    Consolidated database schema and RLS policies
  design-guide.md                  Design reference
```

## Database Overview

The consolidated schema is in `supabase/migrations/20260420000000_full_schema.sql`.

Main tables:

- `destinations`
- `traveller_profiles`
- `tour_guides`
- `chat_sessions`
- `chat_messages`
- `itineraries`
- `marketplace_listings`
- `marketplace_offers`
- `marketplace_messages`
- `transactions`
- `historical_trips`
- `user_interactions`

Important current schema fields and behavior:

- `traveller_profiles.is_active` supports admin deactivation.
- `marketplace_listings.is_suspended` supports admin marketplace moderation.
- `marketplace_offers.edited_itinerary` stores guide itinerary proposals.
- `marketplace_offers.payment_enabled` supports the mock payment lock flow.
- `transactions` stores total amount, service charge, guide payout, payment reference, and status.
- `admin_suspend_listing(p_listing_id, p_is_suspended)` is available as an RPC for listing suspension.
- Row Level Security policies are enabled for the main application tables and cover own-data access, marketplace participants, transactions, historical trip insertion, and admin reporting access.

The app also expects a Supabase Storage bucket for guide verification documents. The guide onboarding flow uploads to `guide-documents`.

## Environment Variables

Create `.env.local` from `.env.example`, then add any optional variables needed for the deployed/runtime environment.

Variables read by the current application source:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
OPENAI_API_KEY=
GOOGLE_PLACES_API_KEY=

# Optional
OPENAI_CHAT_MODEL=gpt-4o
MARKETPLACE_PLATFORM_FEE_RATE=0.1
NEXT_PUBLIC_MARKETPLACE_PLATFORM_FEE_RATE=0.1
```

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are required by Supabase browser/server clients and middleware.
- `OPENAI_API_KEY` is required by `/api/chat`.
- `OPENAI_CHAT_MODEL` is optional; `/api/chat` defaults to `gpt-4o`.
- `GOOGLE_PLACES_API_KEY` is required for Google place search, geocoding, nearby places, and Google place imagery. City image lookup can still use Wikipedia when a Wikipedia image is available.
- `MARKETPLACE_PLATFORM_FEE_RATE` controls server-side transaction fee calculation.
- `NEXT_PUBLIC_MARKETPLACE_PLATFORM_FEE_RATE` controls the fee preview shown on the guide offer page. Keep it aligned with the server-side rate.

Additional placeholders currently present in `.env.example`:

```env
DATABASE_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

The current Next.js application source does not directly read `DATABASE_URL`, `GOOGLE_CLIENT_ID`, or `GOOGLE_CLIENT_SECRET`. Google OAuth is initiated through Supabase Auth; provider credentials are normally configured in the Supabase project.

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build the application:

```bash
npm run build
```

Run linting:

```bash
npm run lint
```

## Current Limitations

- Payments are mock records only; no external payment gateway is integrated.
- Booking links are outbound links only; MyHoliday does not reserve hotels, flights, transport, or tours directly.
- Guide verification is an admin review workflow, not a live government or licensing authority check.
- Destination, climate, and historical trip data are seeded/static datasets, not live pricing or availability feeds.
- AI output and route/transport estimates should be treated as planning assistance, not guaranteed travel advice.
- Google Places features depend on `GOOGLE_PLACES_API_KEY` and can fail when the key is missing, quota-limited, or rejected by Google.
- The UI is web-only.
- The app stores preferred language for planner context, but the full interface is English-first and not fully localized.
- Marketplace service delivery after agreement happens outside the platform.

## Team

| Name |
| --- |
| Laeu Zi-Li |
| Low Ze Xuan |
| Heng Ee Sern |
| Tan Hao Shuan |
| Muhammad Farris Bin Razman |
| Soo Jian Wen |

Course: AAPP011-4-2 Capstone Project  
Institution: Asia Pacific University of Technology & Innovation  
Intake: UCDF2407ICT(DI) | 032026
