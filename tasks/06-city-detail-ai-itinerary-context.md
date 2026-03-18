# Feature: City Detail & AI Itinerary Planner

## Overview

Two connected pages: the City Detail page shows information about a selected destination, and the AI Itinerary Planner provides a conversational chatbot interface where the user discusses their trip with an LLM to generate and refine a day-by-day itinerary.

**Dependencies:** Requires `01-project-setup` (Supabase client, AI client), `02-ui-components` (Button, Badge, Spinner, PageHeader), `04-auth` (user profile data used for personalisation).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | Supabase (PostgreSQL) |
| AI | OpenAI API or Gemini API (server-side via API route) |
| Styling | Tailwind CSS with custom tokens |

---

## Route Ownership

| Page | Route | Owner |
|---|---|---|
| City Detail | `app/destinations/[id]/page.jsx` | ES |
| AI Itinerary Chat | `app/itinerary/page.jsx` | ES |

## API Route
- `app/api/chat/route.js` — LLM proxy for AI itinerary generation (server-side, keeps API key secure)

---

## Design Tokens (Quick Reference)

### Colours
- Charcoal `charcoal` — primary text
- Warm White `warmwhite` — page background
- Amber `amber` — accent, CTA buttons
- Subtle `subtle` — alternate sections
- Muted `muted` — tags
- Secondary `secondary` — descriptions
- Border `border` — card borders

### Typography
- Section heading: `text-4xl font-extrabold font-display`
- Card heading: `text-xl font-semibold font-body`
- Body: `text-sm font-normal font-body`

---

## Database Schema (Relevant Tables)

```sql
-- Destination dataset
destinations
  id, name, country, description, estimated_cost,
  climate_tags, style_tags, budget_range, image_url

-- Traveller profile (used for AI personalisation)
traveller_profiles
  id, user_id, full_name, age, nationality,
  dietary_restrictions, accessibility_needs, preferred_language

-- AI-generated saved itineraries
itineraries
  id, user_id, destination_id, title,
  plan_content (JSON), created_at, updated_at
```

---

## City Detail Page

Route: `app/destinations/[id]/page.jsx`

Shows detailed information about a single destination. Content is fetched from the `destinations` table.

### Content
- City name and country (heading)
- City description and overview
- Popular attractions and points of interest
- Estimated travel costs
- Tags (climate, travel style) displayed as Badge components
- City image

### Actions
- "Plan My Trip" Button → navigates to the AI Itinerary Planner with the city pre-selected
- External booking links: links to third-party sites for hotel and transport bookings (MyHoliday does not perform actual bookings — it redirects to external platforms)

---

## AI Itinerary Planner

Route: `app/itinerary/page.jsx`

A conversational chatbot interface — not a form or template generator. The user chats with the AI to create their itinerary.

### Chatbot Interaction Flow

1. **Generate Draft** — The AI uses the user's profile (dietary restrictions, accessibility needs, preferred language, group size, nationality) and the selected destination to produce an initial day-by-day itinerary
2. **Refine Plan** — The user can request changes through conversation: swap an activity, adjust pacing, add a specific type of restaurant, account for mobility needs, etc.
3. **Confirm Plan** — Once satisfied, the user confirms and saves the itinerary to the `itineraries` table

### UI Component
- ZX builds a `ChatWindow.jsx` component for ES to use
- Chat window with message bubbles (user messages vs AI messages)
- Input field at the bottom for typing messages
- Send button
- "Save Plan" button that appears after AI generates a plan
- Loading/typing indicator while AI responds

### API Route: `app/api/chat/route.js`
- Receives: user message, conversation history, destination info, user profile data
- Calls OpenAI API or Gemini API server-side (keeps API key out of client)
- Returns: AI response (streamed or full)
- System prompt should include:
  - The selected destination details
  - The user's profile info (dietary, accessibility, language, nationality)
  - Instructions to generate day-by-day itineraries
  - Instructions to respond conversationally

### Saving an Itinerary
- When user clicks "Save Plan", extract the itinerary from the conversation
- Save to `itineraries` table with:
  - `user_id` — the logged-in user
  - `destination_id` — the selected city
  - `title` — auto-generated or user-provided
  - `plan_content` — the full itinerary as JSON
- Redirect to My Plans dashboard after saving

---

## External Booking Links

City pages and itineraries include links to third-party sites for hotel and transport bookings. MyHoliday does **not** perform actual bookings — it redirects users to the appropriate external platforms.

---

## Components Used (from `@/components/ui/`)

- `Button` — "Plan My Trip", send message, save plan
- `Badge` — tags on city detail
- `Spinner` — loading states
- `PageHeader` — city detail page header
- `ChatWindow` (built by ZX in `components/sections/ChatWindow.jsx`)

---

## CSS Rules

- Never write inline `style={{}}`
- Never use arbitrary Tailwind values like `w-[347px]`
- Always use named colour tokens — never hardcode hex values
