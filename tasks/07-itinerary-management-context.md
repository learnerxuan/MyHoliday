# Feature: Itinerary Management (My Plans)

## Overview

The My Plans dashboard where travellers can view, edit, and delete their saved AI-generated itineraries. This is the central hub for managing travel plans before optionally posting them to the marketplace.

**Dependencies:** Requires `01-project-setup` (Supabase client), `02-ui-components` (Button, PageHeader, Spinner, Modal), `04-auth` (authentication), `06-city-detail-ai-itinerary` (itineraries are created there).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | Supabase (PostgreSQL) |
| Styling | Tailwind CSS with custom tokens |

---

## Route Ownership

| Page | Route | Owner |
|---|---|---|
| My Plans | `app/itinerary/my-plans/page.jsx` | JW |

---

## Design Tokens (Quick Reference)

### Colours
- Charcoal `charcoal` — primary text
- Warm White `warmwhite` — page background
- Amber `amber` — accent, edit actions
- Amber Dark `amberdark` — hover states
- Error `error` — delete actions
- Border `border` — card borders, dividers
- Secondary `secondary` — descriptions, metadata
- Tertiary `tertiary` — timestamps

### Typography
- Section heading: `text-4xl font-extrabold font-display`
- Card heading: `text-xl font-semibold font-body`
- Body: `text-sm font-normal font-body`
- Caption/metadata: `text-xs font-normal font-body`

### Spacing
- Section vertical padding: `py-20`
- Card internal padding: `p-5`
- Gap between cards: `gap-4`

---

## Database Schema (Relevant Tables)

```sql
-- AI-generated saved itineraries
itineraries
  id, user_id, destination_id, title,
  plan_content (JSON), created_at, updated_at

-- Destination dataset (for displaying city info on plan cards)
destinations
  id, name, country, description, estimated_cost,
  climate_tags, style_tags, budget_range, image_url

-- Marketplace listings (to check if a plan has already been posted)
marketplace_listings
  id, itinerary_id, traveller_id, destination_id,
  budget, status (open/closed), created_at
```

---

## My Plans Dashboard

Route: `app/itinerary/my-plans/page.jsx`

### Features

**View All Plans**
- List all itineraries belonging to the logged-in user
- Each plan card shows:
  - Plan title
  - Destination city and country
  - Created date and last updated date
  - Preview snippet of the itinerary content
- Sort by most recently updated

**View Plan Detail**
- Click a plan card to expand or navigate to a detail view
- Show the full day-by-day itinerary content (rendered from `plan_content` JSON)
- Show destination info

**Edit Plan**
- "Edit" button re-enters the AI chatbot with the existing itinerary context
- The chatbot loads the previous conversation/plan so the user can refine it further
- After editing, the updated plan is saved back to the same `itineraries` row (`updated_at` is refreshed)

**Delete Plan**
- "Delete" button with confirmation modal
- Uses Modal component: "Are you sure you want to delete this plan?"
- On confirm, delete the row from `itineraries` table
- If the plan has an associated marketplace listing, warn the user or prevent deletion

**Post to Marketplace**
- "Post to Marketplace" button on each plan
- Links to the marketplace listing creation flow (`/marketplace/new`) with the itinerary pre-selected
- Only available if the plan hasn't already been posted

---

## Empty State

If the user has no saved plans, show a friendly empty state:
- Message: "You haven't created any plans yet"
- CTA: "Take the Quiz" or "Browse Destinations" button

---

## Components Used (from `@/components/ui/`)

- `Button` — edit, delete, post to marketplace, CTA buttons
- `PageHeader` — "My Plans" title
- `Spinner` — loading state while fetching plans
- `Modal` — delete confirmation dialog
- `Badge` — destination tags on plan cards

---

## RLS Policies

- Users can only read their own itineraries (`user_id = auth.uid()`)
- Users can only update their own itineraries
- Users can only delete their own itineraries

---

## CSS Rules

- Never write inline `style={{}}`
- Never use arbitrary Tailwind values like `w-[347px]`
- Always use named colour tokens — never hardcode hex values
