# MyHoliday

MyHoliday is a web application for travel discovery, AI-assisted itinerary planning, and traveller-to-tour-guide coordination. It helps a traveller move from destination discovery to a saved itinerary, then into a marketplace where verified tour guides can offer services for that itinerary.

The system is built with Next.js App Router, Supabase Auth/PostgreSQL/RLS, OpenAI-powered itinerary chat, Google Places/Maps integrations, and a mock marketplace transaction flow.

## Current System Capabilities

- Traveller authentication, onboarding, profile management, and account deactivation checks.
- Tour guide onboarding with city assignment, document upload, and admin approval.
- Destination catalogue with city detail pages, imagery, booking links, and click tracking.
- Preference quiz that scores destinations using vector similarity over style, budget, trip duration, climate, and region.
- Personalized destination discovery based on saved itineraries, destination clicks, and prior AI planning sessions.
- Conversational AI itinerary planner that stores chat sessions, planner state, itinerary updates, and map coordinates.
- Saved itinerary history and individual itinerary viewer.
- Marketplace listings created from saved itineraries.
- Guide-side marketplace browsing scoped by guide role/profile, with offer submission and negotiation.
- Marketplace chat between travellers and guides.
- Mock transaction records for accepted offers, including platform service charge and guide payout calculation.
- Admin dashboard for users, tour-guide requests, guide documents, marketplace moderation, live KPIs, and reports.

## User Roles

| Role | What the role can do |
| --- | --- |
| Traveller | Complete onboarding/profile, take the quiz, browse destinations, plan itineraries with AI, save itineraries, create marketplace listings, review offers, chat with guides, and complete mock transactions. |
| Tour guide | Complete guide onboarding, upload verification documents, wait for approval, browse marketplace requests, submit offers, chat with travellers, and enable mock payment for accepted work. |
| Admin | Access the admin dashboard, view/manage travellers, review guide applications/documents, approve or reject guides, moderate listings, suspend listings, and view analytics/reports. |

Access control is implemented in two layers:

- `middleware.ts` protects role-specific route groups and blocks inactive traveller accounts.
- Supabase Row Level Security policies protect database reads/writes for profiles, destinations, chat, itineraries, marketplace records, transactions, and admin reporting access.

## Main User Flows

### Traveller Flow

1. Register or log in at `/auth/register` or `/auth/login`.
2. Complete traveller onboarding at `/auth/onboarding/traveller`.
3. Take the preference quiz at `/quiz`.
4. Review ranked destination recommendations on `/destinations`.
5. Open a destination detail page at `/destinations/[id]`.
6. Launch the AI planner at `/itinerary?city=[destinationId]`.
7. Chat with the planner, refine the trip, view itinerary/map panels, and save the plan.
8. Review saved plans at `/itineraries`, `/history`, or `/saved-itinerary/[id]`.
9. Publish a saved itinerary to the marketplace at `/marketplace/new`.
10. Review offers and chat on `/marketplace/[id]`, `/marketplace/[id]/offer`, and `/marketplace/[id]/chat`.

### Tour Guide Flow

1. Register or log in with guide role.
2. Complete guide onboarding at `/auth/onboarding/guide`.
3. Wait for admin verification.
4. Use `/marketplace` to view relevant traveller requests.
5. Submit an offer, negotiate by chat, and enable a mock payment record after agreement.
6. Review guide history/bookings from `/guide/history`, `/guide/bookings`, and `/guide/chats`.

### Admin Flow

1. Log in with admin metadata.
2. Use `/admin` for operational KPIs and action queues.
3. Manage travellers at `/admin/users`.
4. Review tour guides at `/admin/tour-guides` and pending guide requests at `/admin/tour-guides/requests`.
5. Open uploaded guide documents through admin API routes.
6. Moderate listings at `/admin/marketplace`, including suspension.
7. View charts and reports at `/admin/reports`.

## Core Modules

### Authentication and Profiles

Supabase Auth handles email/password sessions and OAuth configuration. User role is stored in Supabase user metadata. Profile data is stored separately:

- `traveller_profiles` stores name, date of birth, nationality, dietary restrictions, accessibility needs, preferred language, and active status.
- `tour_guides` stores guide profile data, city assignment, document URL, and verification status.

### Destination Recommendation

The quiz recommendation API is implemented at `/api/recommendation`.

It accepts preference data including:

- preferred travel styles
- destination regions
- budget level
- climate preference
- group size
- travel start and end dates

The engine filters destinations by selected regions, encodes user and destination attributes into normalized vectors, applies cosine similarity, and returns the top scored destinations with trip metadata.

The discovery API at `/api/recommendation/discovery` generates "recommended for you" results from behavioural signals:

- saved itinerary metadata
- destination click interactions
- previous chat session planner state

It also applies region and country affinity boosts before returning personalized destinations.

### Destination Pages and External Data

Destination pages use stored destination data from Supabase and supporting API routes:

- `/api/destinations`
- `/api/city-image`
- `/api/place-image`
- `/api/nearby-places`
- `/api/geocode`
- `/api/interactions`

Google Places/Maps is used for place search, geocoding, nearby places, and images. Wikipedia can provide fallback city imagery. Destination click interactions are recorded for personalization and admin reports.

### AI Itinerary Planner

The planner UI is at `/itinerary` and is backed by `/api/chat`.

The planner:

- creates or resumes one active chat session per user/destination
- stores messages in `chat_messages`
- stores structured planner progress in `chat_sessions.planner_state`
- uses traveller profile data for dietary, accessibility, language, and age context
- accepts quiz context when available so the first itinerary draft can be fast-tracked
- uses OpenAI chat completions with tool calls
- returns newline-delimited JSON responses to the client
- supports itinerary generation and incremental modification
- enriches itinerary items with Google Places coordinates for the map panel
- applies simple guardrails before calling the model

Supporting AI files live in `lib/ai/`:

- `system-prompt.js`
- `guardrails.js`
- `tools/index.js`
- `tools/search_places.js`
- `tools/get_weather.js`
- `tools/check_transport.js`
- `tools/estimate_budget.js`

### Saved Itineraries

Saved itineraries are stored in `itineraries` with JSON content and optional trip metadata. Users can view itinerary lists/history and open individual saved itineraries through `/saved-itinerary/[id]`.

### Marketplace

The marketplace is shared by travellers and guides at `/marketplace`, with role-aware behaviour.

Travellers can:

- create a listing from a saved itinerary
- set a desired budget
- view guide offers
- chat with guides
- accept or reject offers
- complete a mock transaction after payment is enabled

Guides can:

- view marketplace requests
- submit offers with a proposed price
- include an edited itinerary proposal
- chat with travellers
- enable payment for an accepted offer

Marketplace API routes live under `/api/marketplace`, including listings, offers, messages, profiles, history, and transactions.

### Mock Transactions

MyHoliday does not integrate with a real payment gateway. It creates internal transaction records in Supabase.

The default platform fee is 10%, configured in `lib/marketplace/payment-config.ts`. Transaction logic calculates:

- total amount
- service charge
- guide payout
- payment reference
- pending/completed/refunded status

### Admin and Reporting

Admin pages read operational data from Supabase through server actions and API routes. Current reporting includes:

- active travellers
- approved guides
- pending guide requests
- open AI sessions
- suspended listings
- listings with no offers
- marketplace offer status counts
- completed GMV
- platform revenue
- top clicked destinations
- report charts through Recharts

## Tech Stack

| Layer | Technology |
| --- | --- |
| Web framework | Next.js 16 App Router |
| UI | React 19, Tailwind CSS 4, lucide-react, Recharts |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth with user metadata roles |
| Database access | `@supabase/ssr`, `@supabase/supabase-js`, `pg` |
| AI | OpenAI API |
| Maps and places | Google Places/Maps APIs, Leaflet, React Leaflet, Leaflet Routing Machine |
| Supporting APIs | Wikipedia fallback imagery, Open-Meteo weather fallback, OSRM routing estimates |
| Deployment target | Vercel-compatible Next.js deployment |

## Project Structure

```text
myholiday/
  app/
    admin/                         Admin dashboard, users, guides, marketplace, reports
    api/                           Next.js API routes
      admin/                       Admin traveller/marketplace/tour-guide endpoints
      chat/                        AI itinerary planner endpoint
      recommendation/              Quiz and discovery recommendation endpoints
      marketplace/                 Listings, offers, messages, profiles, history, transactions
    auth/                          Login, register, onboarding, callback, password flows
    destinations/                  Destination list and detail pages
    guide/                         Guide redirects, history, bookings, chats
    itinerary/                     AI planner page and planner component
    itineraries/                   Saved itinerary list
    marketplace/                   Traveller/guide marketplace screens
    profile/                       Traveller profile
    quiz/                          Preference quiz
    saved-itinerary/[id]/          Saved itinerary viewer
    survey/                        Survey capture
  components/
    admin/                         Admin charts and live stats
    sections/                      Planner, map, chat, listing and marketplace panels
    ui/                            Shared UI primitives
  lib/
    actions/                       Server actions for reports
    ai/                            System prompt, guardrails and AI tools
    marketplace/                   Mock payment calculations
    supabase/                      Browser/server Supabase clients and auth helpers
    recommendation.ts              Discovery preference inference/scoring helpers
    survey-options.ts              Survey/quiz option data
  supabase/
    migrations/                    Consolidated database schema and RLS policies
  docs/
    context-diagram.md             System context diagram
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

Important later schema additions in the consolidated migration include:

- `traveller_profiles.is_active` for admin deactivation.
- `marketplace_listings.is_suspended` for moderation.
- `marketplace_offers.edited_itinerary` for guide proposal changes.
- `marketplace_offers.payment_enabled` for the mock payment flow.
- RLS policies allowing admins to read analytics tables.
- RLS policies for marketplace participants, transactions, historical trips, and profile summaries.

## Environment Variables

Create `.env.local` from `.env.example`.

```env
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
OPENAI_API_KEY=
GOOGLE_PLACES_API_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Optional:

```env
OPENAI_CHAT_MODEL=gpt-4o
```

Notes:

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is used by browser/server Supabase clients.
- `OPENAI_API_KEY` is required for `/api/chat`.
- `GOOGLE_PLACES_API_KEY` is required for place search, geocoding, and place/city imagery.
- `DATABASE_URL` supports server-side reporting/database access.
- OAuth variables are present for Google auth configuration.

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

- Payments are mock records only; there is no live payment gateway.
- Hotel and transport booking links are external; MyHoliday does not book travel inventory directly.
- Guide verification is an admin review workflow, not a live licensing authority check.
- Destination and historical trip data are seeded/static, not live travel pricing data.
- The UI is web-only.
- The interface is English-first; preferred language is stored for planner context but does not localize the full UI.
- Marketplace service delivery after agreement is outside the platform.

## Documentation

- System context diagram: `docs/context-diagram.md`
- Design reference: `design-guide.md`
- Database schema: `supabase/migrations/20260420000000_full_schema.sql`

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
