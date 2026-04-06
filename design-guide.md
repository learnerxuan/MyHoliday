# MyHoliday — Design & Context Guide
**Travel and Tourism Recommendation System**
**AAPP011-4-2 Capstone Project | Group 1 | UCDF2407ICT(DI)**
**Repository:** https://github.com/learnerxuan/myholiday

---

## How to Use This Document

Paste the **System Context** section at the top of any LLM session before asking for help with your module. Then paste the section for your specific feature. This gives the LLM accurate knowledge of the stack, database, components, and conventions without you having to explain anything manually.

---

---

# SYSTEM CONTEXT
### Paste this at the start of every LLM session

---

## Overview

MyHoliday is a web-based travel and tourism recommendation system with five interconnected features: user authentication and profiling, a preference-based destination recommendation engine, an AI itinerary planner, a traveller-guide marketplace, and an admin analytics dashboard.

There are three user roles: **Traveller** (stored in `users` table with `role = 'traveler'`), **Tour Guide** (stored in `tour_guides` table), and **Admin** (stored in `users` table with `role = 'admin'`).

**Full user journey:** Register → set preferences → get city recommendations → chat with AI to build itinerary → save itinerary → post to marketplace → tour guide submits offer → negotiate via chat → confirm booking.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL hosted on Supabase (already live — do not recreate tables) |
| Database Client | `pg` (node-postgres) — connection in `lib/supabase/` |
| Styling | Tailwind CSS 3 with custom design tokens in `tailwind.config.js` |
| Charts | Recharts (Admin Dashboard only) |
| Deployment | Vercel |

---

## Project Structure

```
myholiday/
├── app/
│   ├── layout.jsx                    ← Root layout — auto-wraps ALL pages with Navbar + Footer
│   ├── globals.css                   ← Base styles + font imports
│   ├── page.jsx                      ← Homepage
│   ├── auth/
│   │   ├── login/page.jsx
│   │   └── register/page.jsx
│   ├── profile/page.jsx
│   ├── destinations/
│   │   ├── page.jsx                  ← Destination listing + recommendation results
│   │   └── [id]/page.jsx             ← City detail page
│   ├── recommendations/page.jsx      ← Preference quiz
│   ├── itinerary/
│   │   ├── page.jsx                  ← AI itinerary planner
│   │   └── my-plans/page.jsx         ← Saved itineraries
│   ├── marketplace/
│   │   ├── page.jsx                  ← Listing board
│   │   ├── new/page.jsx              ← Create listing
│   │   └── [id]/page.jsx             ← Listing detail + offers + chat
│   ├── dashboard/page.jsx            ← Admin dashboard
│   └── api/                          ← All backend API routes
│       ├── auth/route.js
│       ├── destinations/route.js
│       ├── recommendations/route.js
│       ├── itinerary/route.js
│       ├── marketplace/
│       │   ├── listings/route.js
│       │   ├── listings/[id]/route.js
│       │   ├── offers/route.js
│       │   ├── offers/[listingId]/route.js
│       │   ├── offers/[id]/route.js
│       │   ├── messages/route.js
│       │   └── messages/[listingId]/route.js
│       ├── transactions/route.js
│       └── dashboard/
│           └── marketplace/route.js
├── components/
│   ├── ui/                           ← Base reusable components — never rebuild these
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Select.jsx
│   │   ├── DestinationCard.jsx
│   │   ├── ListingCard.jsx
│   │   ├── Badge.jsx
│   │   ├── StatusBadge.jsx
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── Spinner.jsx
│   │   ├── Modal.jsx
│   │   ├── Avatar.jsx
│   │   ├── StarRating.jsx
│   │   └── PageHeader.jsx
│   └── sections/                     ← Larger page section components
│       ├── HeroSection.jsx
│       ├── FeaturedDestinations.jsx
│       ├── SearchBar.jsx
│       ├── FilterPanel.jsx
│       ├── PreferenceForm.jsx
│       ├── ChatWindow.jsx
│       └── ListingForm.jsx
├── lib/supabase/                     ← DB connection — always import from here
├── tailwind.config.js                ← Design tokens — do not edit
└── .env.example                      ← Copy to .env.local, fill in Supabase credentials
```

---

## Root Layout Behaviour

`app/layout.tsx` automatically wraps every page with the universal Navbar and the standardised dark Capstone `<Footer />`. **Never import or implement Navbar or Footer manually inside any page file.**

The Footer (`components/Footer.tsx`) is a dark `#1C1A1A` block containing the trademark, capstone descriptor, and quick routing links spanning Explore, Account, and System. It dynamically locks to the bottom of the page viewport using Flexbox.

```jsx
// Your page file SHOULD NEVER contain a <footer> tag. Navbar and Footer are already there natively.
export default function YourPage() {
  return (
    <div className="bg-warmwhite min-h-screen">
      <section className="py-20">
        {/* your content */}
      </section>
    </div>
  )
}
```

---

## Database Schema (All Tables — Already Live)

Do not recreate or modify any tables. Use exact column names as listed.

### `destinations`
```sql
id UUID PK
city VARCHAR(100), country VARCHAR(100), region VARCHAR(100)
short_description TEXT
latitude FLOAT, longitude FLOAT
avg_temp_monthly JSONB   -- {"1": {"avg": 28.1, "max": 32.5, "min": 25.5}, ...}
ideal_durations JSONB    -- ["Short trip", "One week"]
budget_level VARCHAR     -- CHECK: 'Budget' | 'Mid-range' | 'Luxury'
culture SMALLINT 0-5, adventure SMALLINT 0-5, nature SMALLINT 0-5
beaches SMALLINT 0-5, nightlife SMALLINT 0-5, cuisine SMALLINT 0-5
wellness SMALLINT 0-5, urban SMALLINT 0-5, seclusion SMALLINT 0-5
categories TEXT, best_time_to_visit TEXT
```

### `historical_trips`
```sql
id SERIAL PK            -- integer, NOT UUID
destination VARCHAR(150) -- plain string, NOT a FK to destinations
duration_days FLOAT, traveler_age FLOAT, traveler_gender VARCHAR(20)
traveler_nationality VARCHAR(100)
accommodation_type VARCHAR(50), accommodation_cost NUMERIC(10,2)
transportation_type VARCHAR(50), transportation_cost NUMERIC(10,2)
-- No foreign keys. Admin dashboard only.
-- Cannot JOIN to destinations by id — match by city name string only.
```

### `users`
```sql
id UUID PK
email VARCHAR(255) UNIQUE, password_hash VARCHAR(255)
full_name VARCHAR(150), phone VARCHAR(20)
date_of_birth DATE, nationality VARCHAR(100)
dietary_restrictions VARCHAR(100)
accessibility_needs BOOLEAN DEFAULT FALSE
language_preferences VARCHAR(50) DEFAULT 'English'
role VARCHAR DEFAULT 'traveler'  -- CHECK: 'traveler' | 'admin'
created_at TIMESTAMP DEFAULT NOW()
```

### `tour_guides`
```sql
id UUID PK
email VARCHAR(255) UNIQUE, password_hash VARCHAR(255)
full_name VARCHAR(150), phone VARCHAR(20)
city_id UUID FK → destinations ON DELETE SET NULL
document_url VARCHAR(500)
verification_status VARCHAR DEFAULT 'pending'  -- CHECK: 'pending' | 'approved' | 'rejected'
created_at TIMESTAMP DEFAULT NOW()
```

### `chat_sessions`
```sql
id UUID PK
user_id UUID FK → users CASCADE
destination_id UUID FK → destinations CASCADE
status VARCHAR DEFAULT 'active'  -- CHECK: 'active' | 'completed'
created_at TIMESTAMP DEFAULT NOW()
```

### `chat_messages`
```sql
id UUID PK
session_id UUID FK → chat_sessions CASCADE
role VARCHAR  -- CHECK: 'user' | 'assistant'
content TEXT
created_at TIMESTAMP DEFAULT NOW()
```

### `itineraries`
```sql
id UUID PK
user_id UUID FK → users CASCADE
destination_id UUID FK → destinations CASCADE
session_id UUID FK → chat_sessions ON DELETE SET NULL
title VARCHAR(255)
content JSONB       -- full day-by-day itinerary object generated by AI
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

### `marketplace_listings`
```sql
id UUID PK
user_id UUID FK → users CASCADE
itinerary_id UUID FK → itineraries CASCADE
destination_id UUID FK → destinations CASCADE
desired_budget NUMERIC(10,2)   -- !! column is desired_budget — NOT budget
status VARCHAR DEFAULT 'open'  -- CHECK: 'open' | 'negotiating' | 'confirmed' | 'closed'
created_at TIMESTAMP DEFAULT NOW()
```

### `marketplace_offers`
```sql
id UUID PK
listing_id UUID FK → marketplace_listings CASCADE
guide_id UUID FK → tour_guides CASCADE
proposed_price NUMERIC(10,2)
status VARCHAR DEFAULT 'pending'  -- CHECK: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
created_at TIMESTAMP DEFAULT NOW()
```

### `marketplace_messages`
```sql
id UUID PK
listing_id UUID FK → marketplace_listings CASCADE
sender_type VARCHAR  -- CHECK: 'traveler' | 'guide'
sender_id UUID       -- NOT a FK — polymorphic (UUID of user OR tour_guide)
content TEXT
created_at TIMESTAMP DEFAULT NOW()
-- sender_id is intentionally not a FK. Use sender_type to know
-- which table (users or tour_guides) to query for sender name/avatar.
```

### `transactions`
```sql
id UUID PK
offer_id UUID FK → marketplace_offers RESTRICT
payer_id UUID FK → users RESTRICT
payee_id UUID FK → tour_guides RESTRICT
total_amount NUMERIC(10,2)
service_charge NUMERIC(10,2)
guide_payout NUMERIC(10,2)   -- CONSTRAINT: must equal total_amount - service_charge
status VARCHAR DEFAULT 'pending'  -- CHECK: 'pending' | 'completed' | 'refunded'
payment_reference VARCHAR(100) UNIQUE
created_at TIMESTAMP DEFAULT NOW()
-- RESTRICT: cannot delete a user/guide/offer with a completed transaction
```

---

## API Route Pattern

```js
import { NextResponse } from 'next/server'
import { db } from '@/lib/supabase'  // always import from here — never new client

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const param = searchParams.get('param')
    const result = await db.query('SELECT * FROM table WHERE col = $1', [param])
    return NextResponse.json(result.rows)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const result = await db.query(
      'INSERT INTO table (col1, col2) VALUES ($1, $2) RETURNING *',
      [body.col1, body.col2]
    )
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

---

## Design Tokens (Quick Reference)

### Colours
```
bg-warmwhite   #FAF9F7   Page background
bg-charcoal    #1A1A1A   Primary buttons, navbar
text-charcoal  #1A1A1A   Primary body text
bg-amber       #C4874A   CTAs, brand accent, active links
text-amber     #C4874A   Highlighted text, match scores
amberdark      #8B6A3E   Hover state on amber elements
border         #EBEBEB   Card borders, dividers
bg-subtle      #F5F2EE   Alternate section backgrounds
bg-muted       #F0EBE3   Tags, badges, form backgrounds
secondary      #666666   Descriptions, body text
tertiary       #999999   Timestamps, placeholders, metadata
disabled       #AAAAAA   Disabled form states
success        #059669   / success-bg  #ECFDF5
warning        #D97706   / warning-bg  #FEF3C7
error          #DC2626   / error-bg    #FEF2F2
```

### Typography
```
Funnel Display 800  →  font-display font-extrabold  →  All headings h1–h6
Noto Serif 400/600  →  font-body                    →  All body, labels, buttons

Already set globally in globals.css — no need to add these to every element.
ITALIC RULE: Funnel Display has no true italic. Use .italic-accent class instead.
```

### Grid Layouts
```
Destination cards:    grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4
Marketplace listings: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
How It Works:         grid-cols-1 lg:grid-cols-3 gap-4
Hero (2-col split):   grid-cols-1 lg:grid-cols-2 gap-12
Admin stats row:      grid-cols-2 lg:grid-cols-4 gap-4
Auth forms (centred): max-w-md mx-auto
Page max width:       max-w-5xl mx-auto px-12
Section padding:      py-20
Card padding:         p-5
```

---

## CSS Rules

- Never write inline `style={{}}`
- Never use arbitrary Tailwind values like `w-[347px]`
- Never hardcode hex values — use named tokens only (e.g. `text-amber` not `text-[#C4874A]`)
- Never use `<form>` tags — use `<div>` with `onClick` and `onChange` handlers
- Never use `<img>` — use Next.js `<Image>` from `next/image`
- Never use `localStorage` or `sessionStorage` — use React state or Supabase auth session
- Never apply `italic` to `font-display` — use `.italic-accent` CSS class
- Never pass raw DB status to `StatusBadge` — derive `displayStatus` first (see Marketplace section)
- Never reference a `budget` column in marketplace — the column is `desired_budget`
- Never push directly to `main` — use a feature branch and PR into `dev`
- Never commit `.env.local` — it is gitignored and contains Supabase credentials

---

---

# FEATURE: Auth & Profile

## Overview

Handles registration, login, logout, and password reset for both travellers and tour guides. Also manages the personal profile that feeds into the AI itinerary system. Travellers and tour guides have completely separate registration flows.

**Dependencies:** `01-project-setup` (Supabase auth), `02-ui-components` (Button, Input, Select, Avatar, Spinner, PageHeader)

---

## Routes

| Page | Route |
|---|---|
| Login | `app/auth/login/page.jsx` |
| Register | `app/auth/register/page.jsx` |
| Profile | `app/profile/page.jsx` |

### API Routes
- `app/api/auth/route.js` — login and registration
- `app/api/profile/route.js` — GET and PATCH user profile

---

## Database Tables

```sql
users — traveller and admin accounts
  id, email, password_hash, full_name, phone, date_of_birth,
  nationality, dietary_restrictions, accessibility_needs,
  language_preferences, role ('traveler'|'admin'), created_at

tour_guides — guide accounts (separate table)
  id, email, password_hash, full_name, phone,
  city_id FK → destinations,  -- determines which listings the guide can see
  document_url, verification_status ('pending'|'approved'|'rejected'), created_at
```

---

## Traveller Side

### Login (`/auth/login`)
- Centred card: `max-w-md mx-auto`
- `Input` email + `Input` password
- "Forgot password?" link — small, grey, right-aligned
- Primary `Button` "Log In" — full width
- Divider with "or"
- Ghost `Button` "Register as Traveller" → `/auth/register?role=traveler`
- Ghost `Button` "Register as Tour Guide" → `/auth/register?role=guide`
- On submit: `POST /api/auth` with `{ email, password }`
- On success: redirect to `/` for travellers, `/marketplace` for guides
- On error: show error message in `error` colour below the submit button

### Register — Traveller flow (`/auth/register?role=traveler`)
Three-step wizard with a progress bar at the top.

**Step 1 — Account:**
- `Input` full name, email, password, confirm password
- Validate password match client-side before allowing Next

**Step 2 — Personal profile (used by AI for itinerary personalisation):**
- `Input` date of birth (type="date")
- `Input` nationality
- `Select` dietary restrictions — ["None", "Halal", "Vegetarian", "Vegan", "Other"]
- Checkbox: "I have accessibility requirements" — maps to `accessibility_needs BOOLEAN`
- `Select` language preference — ["English", "Bahasa Malaysia", "Mandarin", "Tamil"]

**Step 3 — Review and confirm:**
- Read-only summary of entered details
- Primary `Button` "Create Account" — `POST /api/auth/register`
- On success: redirect to `/`

### Register — Tour Guide flow (`/auth/register?role=guide`)
Single-step form:
- `Input` full name, email, password, phone
- `Select` city — fetch from `GET /api/destinations`, display as city names, store UUID as `city_id`
- File input "Upload Verification Document (License or ID)" — store as `document_url`
- Primary `Button` "Submit Application"
- On success: show static message "Your application is pending approval by an administrator." with a "Back to Home" link — do not redirect

### Profile Page (`/profile`)
- Protect route: redirect to `/auth/login` if no session
- `PageHeader` tag: "Account", title: "Your Profile"
- Large `Avatar` with full name and email below
- Editable form — same fields as registration Step 2
- Primary `Button` "Save Changes" → `PATCH /api/profile`
- Section below: "Saved Itineraries" — list linking to `/itinerary/my-plans`

---

## Components Used

- `Button` — submit actions, navigation links
- `Input` — all text and date fields
- `Select` — dietary restrictions, language, city
- `Avatar` — profile display on `/profile`
- `Spinner` — loading state while submitting
- `PageHeader` — profile page header

---

## Important Notes

- Read `?role=` query param on the register page to determine which flow to render
- Tour guide registration does NOT auto-login — it creates a pending account only
- The `city_id` set during guide registration determines which marketplace listings the guide can see — this is critical for the marketplace city-scoping logic

---

---

# FEATURE: Recommendation Engine

## Overview

A multi-step preference quiz that collects travel preferences and scores them against the 9 thematic columns in the `destinations` table (culture, adventure, nature, beaches, nightlife, cuisine, wellness, urban, seclusion). The output is a ranked list of cities with match scores.

**Dependencies:** `01-project-setup`, `02-ui-components` (Button, Select, PageHeader, DestinationCard, Badge, Spinner, FilterPanel)

---

## Routes

| Page | Route |
|---|---|
| Preference Quiz | `app/recommendations/page.jsx` |
| Destination Listing + Results | `app/destinations/page.jsx` |

### API Routes
- `app/api/recommendations/route.js` — POST preferences, return ranked destinations
- `app/api/destinations/route.js` — GET destinations with optional filter params

---

## Database Tables

```sql
destinations
  id, city, country, budget_level, short_description,
  avg_temp_monthly JSONB, ideal_durations JSONB,
  culture, adventure, nature, beaches, nightlife,
  cuisine, wellness, urban, seclusion  -- all SMALLINT 0-5
```

---

## Preference Quiz (`/recommendations`)

Multi-step wizard — one question per screen, progress bar at top, Back and Next buttons (Next disabled until selection made).

**Step 1 — Travel Style:** Solo / Couple / Family / Group (pill buttons)

**Step 2 — Budget Range:** Budget / Mid-range / Luxury (pill buttons — maps to `budget_level` in destinations)

**Step 3 — Group Size:** Number `Input` or slider 1–10

**Step 4 — Trip Duration:** Weekend / One Week / Two Weeks / One Month+ (maps to `ideal_durations` JSONB)

**Step 5 — Climate:** Tropical / Temperate / Cold / Any (maps to `avg_temp_monthly` JSONB)

**Step 6 — Interests (multi-select):** Checkbox grid of all 9 thematic categories — Culture, Adventure, Nature, Beaches, Nightlife, Cuisine, Wellness, Urban, Seclusion. Each maps directly to its corresponding SMALLINT column.

On submit:
- `POST /api/recommendations` with collected preferences object
- On success: redirect to `/destinations` — cards show `matchScore` badges
- Show `Spinner` while processing

Skip option: "I already know where I want to go →" at top — links to `/destinations` without scores

---

## Destination Listing Page (`/destinations`)

- `PageHeader` tag: "Browse", title: "All Destinations" (or "Recommended for You" if arriving from quiz)
- Filter bar (horizontal pill row): Category, Budget Level, Climate — active filter in charcoal
- Four-column `DestinationCard` grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`
- If from recommendation engine: pass `matchScore` prop to each card — badge shows "X% match"
- If browsing directly: `matchScore` not passed — badge hidden
- Fetch: `GET /api/destinations?budget_level=&category=`
- Empty state: "No destinations match your filters." + ghost `Button` "Clear filters"
- Show `Spinner` while loading

---

## Components Used

- `Button` — Next / Back / Skip / Clear filters
- `Select` — filter dropdowns
- `DestinationCard` — destination grid (with optional `matchScore`)
- `Badge` — category tags on cards
- `PageHeader` — page heading
- `Spinner` — loading state
- `FilterPanel` (from `components/sections/`) — filter bar

---

## Important Notes

- The algorithm runs server-side in `POST /api/recommendations` — never client-side
- `budget_level` values must match exactly: `'Budget'`, `'Mid-range'`, `'Luxury'` (capitalised, with hyphen)
- `historical_trips` table is **not used** by the recommendation engine — it is used only by the admin dashboard

---

---

# FEATURE: City Detail & AI Itinerary Planner

## Overview

The city detail page shows full destination information. The AI itinerary planner is a split-screen chat interface where the user builds a personalised day-by-day itinerary by talking to an AI assistant. The AI is aware of the user's profile (dietary restrictions, accessibility needs, travel style).

**Dependencies:** `01-project-setup`, `02-ui-components` (Button, Badge, Spinner, PageHeader, Modal), `04-auth` (user profile for AI context)

---

## Routes

| Page | Route |
|---|---|
| City Detail | `app/destinations/[id]/page.jsx` |
| AI Itinerary Planner | `app/itinerary/page.jsx` |

### API Routes
- `app/api/destinations/[id]/route.js` — GET single destination
- `app/api/itinerary/route.js` — POST to save itinerary
- `app/api/itinerary/chat/route.js` — POST chat message, get AI response

---

## Database Tables

```sql
destinations      -- full schema in System Context
chat_sessions     -- one session per user per destination
chat_messages     -- individual messages, role: 'user' | 'assistant'
itineraries       -- saved itinerary, content JSONB
```

---

## City Detail Page (`/destinations/[id]`)

Two-column layout — main content left (~65%), sidebar right (~35%).

**Main content:**
- Hero image: full-width, `h-[280px] object-cover rounded-xl`, dark gradient overlay, destination name + tags overlaid at bottom-left, match score badge at top-right (only if arriving from recommendation flow)
- Three stat cards (`grid-cols-3 gap-3`): "Est. Budget / Day" (from `budget_level`), "Best Season" (from `best_time_to_visit`), "Avg. Trip Duration" (from `ideal_durations` JSONB)
- About section: `short_description` as paragraph text
- Thematic Ratings: horizontal bar for each of the 9 thematic columns — label, amber fill bar proportional to value (0–5), number on right

**Sidebar:**
- Dark CTA card (charcoal background): "Ready to plan this trip?" + primary `Button` "Generate AI Itinerary" → `/itinerary?destination_id=[id]` + ghost `Button` "Save to My Profile"
- Booking Resources card: external links to Skyscanner, Booking.com, Klook — each opens `target="_blank"` with small disclaimer "External links — opens outside MyHoliday"

States: `Spinner` while loading, 404 message with "Back to Destinations" if not found.

---

## AI Itinerary Planner (`/itinerary`)

Read `?destination_id=` from URL params on load. Split-screen layout.

**Left panel — Itinerary display (~55% width):**
- Context chips: destination city, trip duration, budget level, dietary restrictions — read-only, pulled from user session
- Day-by-day accordion: each day is a collapsible row with activity list, times, estimated costs
- If not yet generated: "Start chatting to generate your plan" placeholder
- Primary `Button` "Save Itinerary" — `POST /api/itinerary` — disabled until itinerary has content
- Ghost `Button` "Post to Marketplace" — navigates to `/marketplace/new?itinerary_id=[id]` — disabled until itinerary is saved

**Right panel — AI Chat (uses `components/sections/ChatWindow.jsx`):**
- Header: green dot, "Wander AI", destination name in grey
- AI messages: left-aligned, `bg-muted` bubble
- User messages: right-aligned, `bg-charcoal text-warmwhite` bubble
- Context note above input: "AI is aware of your age, dietary restrictions, accessibility needs, and travel style."
- `Input` + primary `Button` "Send"
- On send: `POST /api/itinerary/chat` with message content
- On page load: auto-send an opening message to AI using user profile data from session: "Generate a [duration] itinerary for [city] for a [travel_style] traveller. Dietary preference: [dietary_restrictions]. Budget: [budget_level]."

---

## Components Used

- `Button` — save, post to marketplace, send message
- `Badge` — destination category tags, context chips
- `Spinner` — loading states
- `PageHeader` — city detail page header
- `ChatWindow` (from `components/sections/`) — AI chat interface

---

## Important Notes

- The `content` column in `itineraries` is JSONB — structure is determined by the AI prompt design
- `chat_sessions` links one user to one destination — check for an existing session before creating a new one
- The AI reads `dietary_restrictions`, `accessibility_needs`, and `language_preferences` from the `users` table — these must be passed in the API call to the AI

---

---

# FEATURE: Itinerary Management

## Overview

A dashboard of the logged-in traveller's saved itineraries. Protected route — traveller must be authenticated. Each itinerary can be viewed, edited, or posted to the marketplace.

**Dependencies:** `01-project-setup`, `02-ui-components` (Button, Badge, PageHeader, Spinner), `04-auth`, `05-city-detail-and-ai-itinerary` (itineraries to display)

---

## Routes

| Page | Route |
|---|---|
| My Plans | `app/itinerary/my-plans/page.jsx` |

### API Routes
- `app/api/itinerary/my-plans/route.js` — GET all itineraries for logged-in user

---

## Database Tables

```sql
itineraries
  id, user_id, destination_id, session_id,
  title, content JSONB, created_at, updated_at

-- JOIN to destinations for city name
-- LEFT JOIN to marketplace_listings on itinerary_id to get listing status
```

---

## My Plans Page (`/itinerary/my-plans`)

- Protect route: redirect to `/auth/login` if no session
- `PageHeader` tag: "My Plans", title: "Your Saved Itineraries"
- Two-column card grid: `grid-cols-1 md:grid-cols-2 gap-4`
- Each card shows:
  - Destination city name (JOINed from `destinations`)
  - Itinerary `title`
  - Created date: "Created 12 Mar 2025" (format `created_at`)
  - First day preview from `content` JSONB — e.g. "Day 1: Arrival & Gion District"
  - `Badge` for `budget_level` of the destination
  - If the itinerary has a linked marketplace listing: `StatusBadge` showing current listing status
  - Ghost `Button` "View & Edit" → `/itinerary?session_id=[session_id]`
  - Primary `Button` "Post to Marketplace" → `/marketplace/new?itinerary_id=[id]`

**Empty state:** "You haven't saved any itineraries yet." + primary `Button` "Start Planning" → `/destinations`

**API call:**
- `GET /api/itinerary/my-plans` — fetch all itineraries for logged-in user, JOIN `destinations` for city name, LEFT JOIN `marketplace_listings` on `itinerary_id` for listing status

---

## Components Used

- `Button` — view, post to marketplace
- `Badge` — budget level
- `StatusBadge` — listing status if itinerary is posted
- `PageHeader` — page header
- `Spinner` — loading state

---

---

# FEATURE: Marketplace

## Overview

The marketplace connects travellers with verified local tour guides. Travellers publish their finalised itinerary as a listing with a desired budget. Guides in the matching city browse listings, submit price proposals, and negotiate via in-platform chat. This is the final step in the MyHoliday journey.

**Dependencies:** `01-project-setup`, `02-ui-components` (Button, ListingCard, StatusBadge, Badge, Input, PageHeader, Modal, Avatar, Spinner), `04-auth` (authentication, role checks), `07-itinerary-management` (itineraries to post)

---

## Routes

| Page | Route |
|---|---|
| Listing Board | `app/marketplace/page.jsx` |
| Create Listing | `app/marketplace/new/page.jsx` |
| Listing Detail, Offers, Chat | `app/marketplace/[id]/page.jsx` |

### API Routes
- `app/api/marketplace/listings/route.js` — GET and POST listings
- `app/api/marketplace/listings/[id]/route.js` — GET single listing, PATCH status
- `app/api/marketplace/offers/route.js` — POST new offer
- `app/api/marketplace/offers/[listingId]/route.js` — GET all offers for a listing
- `app/api/marketplace/offers/[id]/route.js` — PATCH offer status
- `app/api/marketplace/messages/route.js` — POST message
- `app/api/marketplace/messages/[listingId]/route.js` — GET chat thread
- `app/api/marketplace/transactions/route.js` — POST transaction on booking confirmation

### Section Component
- `ListingForm.jsx` in `components/sections/` — used in the create listing page

---

## Database Tables

```sql
marketplace_listings
  id, user_id FK → users, itinerary_id FK → itineraries,
  destination_id FK → destinations,
  desired_budget NUMERIC(10,2),   -- !! NOT "budget" — exact column name is desired_budget
  status ('open'|'negotiating'|'confirmed'|'closed')

marketplace_offers
  id, listing_id FK → marketplace_listings,
  guide_id FK → tour_guides,
  proposed_price NUMERIC(10,2),
  status ('pending'|'accepted'|'rejected'|'withdrawn')

marketplace_messages
  id, listing_id FK → marketplace_listings,
  sender_type ('traveler'|'guide'),
  sender_id UUID,   -- NOT a FK — polymorphic (user UUID or tour_guide UUID)
  content TEXT

transactions
  id, offer_id FK → marketplace_offers RESTRICT,
  payer_id FK → users RESTRICT, payee_id FK → tour_guides RESTRICT,
  total_amount, service_charge,
  guide_payout,   -- CONSTRAINT: must equal total_amount - service_charge
  status ('pending'|'completed'|'refunded'),
  payment_reference VARCHAR(100) UNIQUE
  -- RESTRICT: cannot delete linked user/guide/offer if transaction exists
```

---

## Marketplace Status Lifecycle

```
Traveller posts itinerary    →  DB status: open   (offer_count = 0)
Guide submits offer          →  DB status: open   (offer_count > 0)
Traveller opens chat         →  DB status: negotiating
Traveller accepts offer      →  DB status: confirmed  +  transaction created
Listing expires or cancelled →  DB status: closed
```

The `has_offers` state does not exist in the database. Derive it in the frontend:

```js
function getDisplayStatus(dbStatus, offerCount) {
  if (dbStatus === 'open' && offerCount === 0) return 'awaiting'
  if (dbStatus === 'open' && offerCount > 0)  return 'has_offers'
  return dbStatus  // 'negotiating', 'confirmed', 'closed' pass through
}
```

| `displayStatus` | Traveller sees | Guide sees | Badge colour |
|---|---|---|---|
| `awaiting` | Awaiting Offers | Open Listing | Grey |
| `has_offers` | X Offers Received | Your Offer Submitted | Amber |
| `negotiating` | Negotiating | In Negotiation | Blue |
| `confirmed` | Booking Confirmed | Booking Confirmed | Green |
| `closed` | Listing Closed | Listing Closed | Grey |

Always pass `displayStatus` to `StatusBadge` — never the raw DB value.

---

## Traveller Side

### Create Listing (`/marketplace/new`)
- Protect route: traveller only
- Check for `?itinerary_id=` param — if present, pre-select that itinerary
- Fetch user's saved itineraries: `GET /api/itinerary/my-plans` → populate `Select` dropdown
- If no saved itineraries: show message "Save an itinerary first." + `Button` "Create an Itinerary" → `/itinerary`
- Uses `ListingForm.jsx` (from `components/sections/`)
- Fields: itinerary `Select`, `Input` for `desired_budget` (number, MYR)
- On submit: `POST /api/marketplace/listings` with `{ itinerary_id, destination_id, desired_budget }`
- On success: redirect to `/marketplace/[newListingId]`

### Listing Board (`/marketplace`) — Traveller view
- `PageHeader` tag: "Marketplace", title: "Your Listings"
- Primary `Button` "Post New Itinerary" → `/marketplace/new` — top right
- Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- Fetch: `GET /api/marketplace/listings` — traveller's own listings only
- `ListingCard` per listing — pass `desiredBudget={listing.desired_budget}`
- Derive `displayStatus` before rendering — pass to `ListingCard` → `StatusBadge`
- Empty state: "You haven't posted any listings yet." + primary `Button` "Post Your First Itinerary"

### Listing Detail (`/marketplace/[id]`) — Traveller view
- Fetch: `GET /api/marketplace/listings/[id]`
- Show: city, duration, group size, `desired_budget` as "Budget: RM X,XXX", `StatusBadge`
- Itinerary summary: collapsed first 2 days with "Expand" toggle
- Offers panel: fetch `GET /api/marketplace/offers/[listingId]`
  - Each offer: `Avatar` + guide name + city + proposed price + offer `StatusBadge`
  - "Accept" primary `Button` — opens `Modal` confirmation
  - "Reject" ghost `Button`
- On accept (3 sequential calls):
  1. `PATCH /api/marketplace/offers/[offerId]` → `{ status: 'accepted' }`
  2. `PATCH /api/marketplace/listings/[id]` → `{ status: 'confirmed' }`
  3. `POST /api/marketplace/transactions` → `{ offer_id, payer_id, payee_id, total_amount, service_charge: 0, guide_payout: total_amount, payment_reference }`
  - Validate: `guide_payout === total_amount - service_charge` before sending
  - After success: show confirmation panel with booking summary
- On reject: `PATCH /api/marketplace/offers/[offerId]` → `{ status: 'rejected' }`
- Chat: see Chat section below
- RESTRICT error handling: if delete fails due to completed transaction, show "This record cannot be removed as it is linked to a completed booking." — do not crash

### Booking Confirmation Panel
- Green success banner
- Summary: city, guide name, total amount, service charge, guide payout, `payment_reference`
- Ghost `Button` "Back to My Listings"
- Disclaimer: "Payment is simulated — no real transaction occurs."

---

## Tour Guide Side

### Listing Board (`/marketplace`) — Guide view
- Protect route: guide must be authenticated AND `verification_status = 'approved'`
- If pending/rejected: show "Your account is pending verification." — no listings shown
- `PageHeader` tag: "Marketplace", title: "Browse Listings"
- Destination filter dropdown — default to guide's registered city (`city_id`)
- Fetch: `GET /api/marketplace/listings?destination_id=[guide.city_id]` — city-scoped only
- Only show listings with `status = 'open'`
- Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- Empty state: "No open listings in your city right now."

### Listing Detail (`/marketplace/[id]`) — Guide view
- Same listing header as traveller view
- Itinerary summary section
- If guide has NOT submitted an offer:
  - `Input` "Your Proposed Price (MYR)" (type="number")
  - Primary `Button` "Submit Offer" → `POST /api/marketplace/offers` with `{ listing_id, guide_id, proposed_price }`
  - After submit: auto-update parent listing status to `negotiating` in the same request
- If guide HAS submitted an offer: show their offer read-only + ghost `Button` "Withdraw Offer" → `PATCH /api/marketplace/offers/[id]` with `{ status: 'withdrawn' }`
- Prevent duplicate offers: check if guide already has an offer on this listing before showing the form
- Chat: see Chat section below

---

## Chat (Both Sides — `app/marketplace/[id]/page.jsx`)

Used by both traveller and guide within the listing detail page.

- Fetch thread: `GET /api/marketplace/messages/[listingId]`
- Traveller messages: right-aligned, `bg-charcoal text-warmwhite`
- Guide messages: left-aligned, `bg-muted text-charcoal`
- Use `sender_type` to determine alignment and whose name/`Avatar` to show
- `sender_id` is polymorphic — if `sender_type === 'traveler'`, query `users` for name; if `'guide'`, query `tour_guides`
- Message `Input` + primary `Button` "Send"
- On send: `POST /api/marketplace/messages` with `{ listing_id, sender_id, sender_type, content }`
  - Traveller: `sender_type: 'traveler'`, `sender_id: user.id`
  - Guide: `sender_type: 'guide'`, `sender_id: guide.id`
- On traveller's first message: also `PATCH /api/marketplace/listings/[id]` → `{ status: 'negotiating' }`

---

## RLS Policies

- Travellers can only read and write their own `marketplace_listings`
- Guides can only SELECT listings where `destination_id = guide.city_id`
- Guides can only INSERT and SELECT their own `marketplace_offers`
- Travellers can SELECT all offers on their own listings and UPDATE offer status
- `marketplace_messages` are scoped to listing participants only (listing owner + guides with an offer on that listing)

---

## Components Used

- `Button` — submit listing, submit offer, accept/reject, send message, confirm booking
- `ListingCard` — listing board cards
- `StatusBadge` — status on listing cards and detail (always pass `displayStatus`, not raw DB value)
- `Badge` — tags on listings
- `Input` — budget field, message input, proposed price
- `PageHeader` — page heading
- `Modal` — confirm accept / reject offer
- `Avatar` — guide profile in offers and chat
- `Spinner` — loading states
- `ListingForm` (from `components/sections/`) — create listing form

---

## Important Notes

- MyHoliday facilitates the connection between travellers and guides but **does not process real payments** — transactions are simulated
- `desired_budget` is the column name — not `budget`
- Budget always displayed as "RM X,XXX" format
- Guides cannot access the marketplace until `verification_status = 'approved'`
- `marketplace_messages.sender_id` is intentionally not a FK — do not attempt to add a FK constraint

---

---

# FEATURE: Admin Dashboard

## Overview

An analytics and management dashboard accessible only to users with `role = 'admin'`. Provides descriptive statistics from the database and tools to manage users, approve tour guides, and moderate marketplace listings.

**Dependencies:** `01-project-setup`, `02-ui-components` (Button, Avatar, Badge, PageHeader, Spinner, Modal), `04-auth`, Recharts

---

## Routes

| Page | Route |
|---|---|
| Admin Dashboard | `app/dashboard/page.jsx` |

### API Routes
- `app/api/dashboard/stats/route.js` — aggregate counts
- `app/api/dashboard/destinations/route.js` — top destinations by itinerary count
- `app/api/dashboard/marketplace/route.js` — monthly bookings + transaction volume
- `app/api/dashboard/demographics/route.js` — dietary and budget distributions
- `app/api/dashboard/users/route.js` — paginated user list
- `app/api/dashboard/guides/[id]/route.js` — PATCH guide verification status

---

## Database Tables

```sql
users, tour_guides, destinations, itineraries,
marketplace_listings, transactions, historical_trips

-- historical_trips: standalone dataset, no FKs
-- match to destinations by city name string only (not by UUID)
```

---

## Dashboard Sections

**Protect route:** if `user.role !== 'admin'`, redirect to `/`.

**Stats Row** (`grid-cols-2 lg:grid-cols-4 gap-4`):
- "Total Travellers" — `SELECT COUNT(*) FROM users WHERE role = 'traveler'`
- "Total Itineraries" — `SELECT COUNT(*) FROM itineraries`
- "Active Listings" — `SELECT COUNT(*) FROM marketplace_listings WHERE status = 'open'`
- "Transaction Volume" — `SELECT SUM(total_amount) FROM transactions WHERE status = 'completed'` — display as "RM X,XXX"

**Popular Destinations Chart** (Recharts `BarChart` horizontal):
- Top 10 destinations by itinerary count
- Query: `SELECT d.city, COUNT(i.id) AS count FROM destinations d JOIN itineraries i ON i.destination_id = d.id GROUP BY d.city ORDER BY count DESC LIMIT 10`
- Bar fill: amber

**Marketplace Activity Chart** (Recharts `LineChart`):
- Monthly confirmed bookings + monthly transaction volume (two lines)
- Group `marketplace_listings` by `DATE_TRUNC('month', created_at)` where `status = 'confirmed'`

**User Demographics** (Recharts `PieChart`):
- Dietary restriction distribution — group `users` by `dietary_restrictions`
- Budget level distribution — group `itineraries` JOIN `destinations` by `budget_level`

**Historical Trips Chart** (Recharts `BarChart`):
- Average accommodation and transportation cost by destination
- Source: `historical_trips` table — match to destinations by city name string

**User Management Table**:
- Columns: Full Name, Email, Role, Joined Date, Action
- 20 rows per page
- Action: "Deactivate" `Button` (danger variant) per row

**Pending Guide Approvals**:
- All `tour_guides` where `verification_status = 'pending'`
- Each: guide name, email, city (JOINed), "View Document" link, "Approve" primary `Button`, "Reject" danger `Button`
- On Approve: `PATCH /api/dashboard/guides/[id]` → `{ verification_status: 'approved' }`
- On Reject: `PATCH /api/dashboard/guides/[id]` → `{ verification_status: 'rejected' }`

---

## Components Used

- `Button` — approve/reject, deactivate, pagination
- `Avatar` — user rows in management table
- `Badge` — role labels, verification status
- `PageHeader` — dashboard heading
- `Spinner` — loading states while charts fetch
- `Modal` — confirm destructive actions (deactivate user)
- Recharts `BarChart`, `LineChart`, `PieChart` — all statistics charts

---

## Important Notes

- `historical_trips` has no foreign keys — never attempt to JOIN by `id`. Match to `destinations` by city name string only
- All chart data is purely descriptive statistics — read-only, no user interaction
- The dashboard is completely hidden from traveller and guide sessions at the route level

---

*Maintained by ZX — Leader and Frontend/UI Designer*
*MyHoliday | AAPP011-4-2 Capstone Project | Group 1 | UCDF2407ICT(DI)*
*Repository: https://github.com/learnerxuan/myholiday*
*Last updated: Week 4*
