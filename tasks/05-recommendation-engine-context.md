# Feature: Destination Recommendation Engine

## Overview

The core discovery feature of MyHoliday. Instead of showing users a catalogue, the engine works backwards from the user's stated preferences via a quiz. It filters and scores destinations, returning a ranked list of cities with match percentages.

Users who already know where they want to go can skip the quiz and navigate directly to any city page.

**Dependencies:** Requires `01-project-setup` (Supabase client, database), `02-ui-components` (Button, Select, DestinationCard, Badge, PageHeader, Spinner).

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
| Preference Quiz | `app/recommendations/page.jsx` | ES |
| Matched City Results | `app/recommendations/results/page.jsx` | ES |

## API Route
- `app/api/recommendation/route.js` — preference matching and scoring logic

---

## Design Tokens (Quick Reference)

### Colours
- Charcoal `charcoal` — primary text, buttons
- Warm White `warmwhite` — page background
- Amber `amber` — accent, match score highlights
- Subtle `#F5F2EE` — alternate section backgrounds
- Muted `muted` — tag badges
- Secondary `secondary` — descriptions

### Typography
- Page hero heading: `text-5xl font-extrabold font-display`
- Section heading: `text-4xl font-extrabold font-display`
- Card heading: `text-xl font-semibold font-body`

### Grid Layout
- Destination cards: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` with `gap-4`

---

## Database Schema (Relevant Tables)

```sql
-- Destination dataset
destinations
  id, name, country, description, estimated_cost,
  climate_tags, style_tags, budget_range, image_url
```

The engine uses a **predefined, curated destination dataset** — not live travel APIs or real-time pricing. Each destination entry includes tags aligned to the preference axes, allowing the scoring algorithm to compute a reliable match.

---

## Preference Quiz

The quiz collects the following inputs:

| Input | Options |
|---|---|
| Travel Style | Adventure, Cultural, Relaxation, Food & Dining, Nature, etc. |
| Budget Level | Backpacker / Mid-range / Luxury |
| Group Size | Solo / Couple / Small Group / Large Group |
| Trip Duration | Weekend / 1 Week / 2 Weeks / Extended |
| Climate Preference | Tropical / Temperate / Cold / Desert / Any |

### UI Components Used
- `Select` for each preference input (or custom multi-step form)
- `Button` (primary) for "Find My Destinations" submit
- `PageHeader` for the page title

### Flow
1. User fills out quiz form with 5 preference fields
2. On submit, preferences are sent to the API route
3. API returns ranked destinations with match scores
4. User is redirected to the results page

---

## Scoring Algorithm

The API route at `app/api/recommendation/route.js` implements:

1. **Filter** — Query the `destinations` table, filter out destinations that don't match any preference criteria
2. **Score** — For each qualifying destination, calculate a match score based on how many preference axes align:
   - Compare `style_tags` with selected travel style(s)
   - Compare `budget_range` with selected budget level
   - Compare `climate_tags` with selected climate preference
   - Factor in group size and duration suitability
3. **Rank** — Sort destinations by match score descending
4. **Return** — Send back the ranked list with match percentages

---

## Results Page

Route: `app/recommendations/results/page.jsx`

- Display ranked destination cards using `DestinationCard` component
- Each card shows: city name, country, tags, match score (e.g., "98% match"), image
- Grid layout: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` with `gap-4`
- Cards link to the city detail page: `/destinations/[id]`
- Include a "Retake Quiz" button to go back and change preferences
- Include a "Browse All Destinations" option for users who want to skip scoring

---

## Skip Quiz Option

Users who already have a destination in mind can skip the quiz entirely and navigate directly to any city page. The results page or a destinations index page should support browsing all destinations without requiring quiz completion.

---

## Components Used (from `@/components/ui/`)

- `Button` — quiz submit, retake quiz, browse all
- `Select` — preference dropdowns
- `DestinationCard` — result cards with match score
- `Badge` — tags on destination cards
- `PageHeader` — page titles
- `Spinner` — loading state while scoring

---

## CSS Rules

- Never write inline `style={{}}`
- Never use arbitrary Tailwind values like `w-[347px]`
- Always use named colour tokens — never hardcode hex values
