# MyHoliday — Frontend Design & Context Guide
**Travel and Tourism Recommendation System**
**AAPP011-4-2 Capstone Project | Group 1 | UCDF2407ICT(DI)**
**Repository:** https://github.com/learnerxuan/myholiday

---

## How to Use This Document

Paste the **System Context** section plus your **own module section** as the opening message when using an LLM to help you code. The LLM will then have accurate knowledge of the stack, database, components, and conventions before you ask it anything.

| Module | Jump to |
|---|---|
| Leader + Frontend/UI | Section 4 (Design Tokens) + Section 5 (Components) + Section 6.1 (Homepage) |
| Auth & Profile | Section 6.2 |
| Recommendation Engine + Admin Dashboard | Section 6.3 + Section 6.8 |
| City Detail + AI Itinerary | Section 6.4 + Section 6.5 |
| Itinerary Management | Section 6.6 |
| Marketplace | Section 6.7 |

---

---

# SECTION 1 — SYSTEM CONTEXT
*Paste this entire section when starting any LLM session*

---

## 1.1 Project Summary

MyHoliday is a Next.js 14 web application. It is a travel recommendation and tour guide marketplace system. Users answer preference questions to get destination recommendations, chat with an AI to build an itinerary, then post that itinerary to a marketplace where local tour guides submit price offers. There are three user roles: **traveller** (stored in `users` table), **tour guide** (stored in `tour_guides` table), and **admin** (`users` table with `role = 'admin'`).

## 1.2 Tech Stack

```
Frontend + Backend:  Next.js 14 with App Router
Styling:             Tailwind CSS 3
Database:            PostgreSQL hosted on Supabase (already live — do not recreate tables)
Database client:     pg (node-postgres) — connection in lib/supabase/
Charts:              Recharts
Deployment:          Vercel
Repository:          https://github.com/learnerxuan/myholiday
```

## 1.3 File Structure

```
myholiday/
├── app/
│   ├── layout.jsx                        ← Root layout — auto-adds Navbar + Footer to ALL pages
│   ├── globals.css                       ← Base styles + font imports — do not re-import fonts
│   ├── page.jsx                          ← Homepage (ZX)
│   ├── auth/
│   │   ├── login/page.jsx                ← Login (ZL)
│   │   └── register/page.jsx             ← Register traveller + guide (ZL)
│   ├── profile/page.jsx                  ← User profile (ZL)
│   ├── destinations/
│   │   ├── page.jsx                      ← Destination listing + recommendation results (ZX/HS)
│   │   └── [id]/page.jsx                 ← City detail (ES)
│   ├── recommendations/page.jsx          ← Preference quiz (HS)
│   ├── itinerary/
│   │   ├── page.jsx                      ← AI itinerary planner / chat (ES)
│   │   └── my-plans/page.jsx             ← Saved itineraries (JW)
│   ├── marketplace/
│   │   ├── page.jsx                      ← Listing board — traveller + guide views (FR)
│   │   ├── new/page.jsx                  ← Create listing form (FR)
│   │   └── [id]/page.jsx                 ← Listing detail + offers + chat (FR)
│   ├── dashboard/page.jsx                ← Admin dashboard (HS)
│   └── api/                              ← All API routes — one file per resource
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
│       └── dashboard/marketplace/route.js
├── components/
│   ├── ui/                               ← ZX owns all of these — import, never recreate
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
│   └── sections/                         ← ZX owns all of these
│       ├── HeroSection.jsx
│       ├── FeaturedDestinations.jsx
│       ├── SearchBar.jsx
│       ├── FilterPanel.jsx
│       ├── PreferenceForm.jsx
│       ├── ChatWindow.jsx
│       └── ListingForm.jsx
├── lib/supabase/                         ← DB connection — import from here, never new client
├── tailwind.config.js                    ← Design tokens — do not edit without ZX
└── .env.example                          ← Copy to .env.local and fill Supabase credentials
```

## 1.4 Root Layout Behaviour

`app/layout.jsx` wraps **every** page automatically. Do not import `Navbar` or `Footer` inside any page file — they are already there.

```jsx
// This is already done in layout.jsx — you do not need to replicate it
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-warmwhite font-body text-charcoal">
        <Navbar />
        <main className="max-w-5xl mx-auto px-12">{children}</main>
        <Footer />
      </body>
    </html>
  )
}

// Your page file only needs this:
export default function YourPage() {
  return (
    <section className="py-20">
      {/* your content */}
    </section>
  )
}
```

## 1.5 Database Tables (already live — do not recreate)

### `destinations`
```sql
id UUID PK, city VARCHAR(100), country VARCHAR(100), region VARCHAR(100),
short_description TEXT, latitude FLOAT, longitude FLOAT,
avg_temp_monthly JSONB,   -- {"1": {"avg": 28.1, "max": 32.5, "min": 25.5}, ...}
ideal_durations JSONB,    -- ["Short trip", "One week"]
budget_level VARCHAR CHECK ('Budget','Mid-range','Luxury'),
culture SMALLINT 0-5, adventure SMALLINT 0-5, nature SMALLINT 0-5,
beaches SMALLINT 0-5, nightlife SMALLINT 0-5, cuisine SMALLINT 0-5,
wellness SMALLINT 0-5, urban SMALLINT 0-5, seclusion SMALLINT 0-5,
categories TEXT, best_time_to_visit TEXT
```

### `historical_trips`
```sql
id SERIAL PK,  -- integer, NOT UUID
destination VARCHAR(150),  -- plain string, NOT a FK to destinations
duration_days FLOAT, traveler_age FLOAT, traveler_gender VARCHAR(20),
traveler_nationality VARCHAR(100), accommodation_type VARCHAR(50),
accommodation_cost NUMERIC(10,2), transportation_type VARCHAR(50),
transportation_cost NUMERIC(10,2)
-- NOTE: No foreign keys. Admin dashboard only. Match to destinations by city name string.
```

### `users`
```sql
id UUID PK, email VARCHAR(255) UNIQUE, password_hash VARCHAR(255),
full_name VARCHAR(150), phone VARCHAR(20), date_of_birth DATE,
nationality VARCHAR(100), dietary_restrictions VARCHAR(100),
accessibility_needs BOOLEAN DEFAULT FALSE,
language_preferences VARCHAR(50) DEFAULT 'English',
role VARCHAR CHECK ('traveler','admin') DEFAULT 'traveler',
created_at TIMESTAMP DEFAULT NOW()
```

### `tour_guides`
```sql
id UUID PK, email VARCHAR(255) UNIQUE, password_hash VARCHAR(255),
full_name VARCHAR(150), phone VARCHAR(20),
city_id UUID FK → destinations ON DELETE SET NULL,
document_url VARCHAR(500),
verification_status VARCHAR CHECK ('pending','approved','rejected') DEFAULT 'pending',
created_at TIMESTAMP DEFAULT NOW()
```

### `chat_sessions`
```sql
id UUID PK,
user_id UUID FK → users CASCADE,
destination_id UUID FK → destinations CASCADE,
status VARCHAR CHECK ('active','completed') DEFAULT 'active',
created_at TIMESTAMP DEFAULT NOW()
```

### `chat_messages`
```sql
id UUID PK,
session_id UUID FK → chat_sessions CASCADE,
role VARCHAR CHECK ('user','assistant'),
content TEXT,
created_at TIMESTAMP DEFAULT NOW()
```

### `itineraries`
```sql
id UUID PK,
user_id UUID FK → users CASCADE,
destination_id UUID FK → destinations CASCADE,
session_id UUID FK → chat_sessions ON DELETE SET NULL,
title VARCHAR(255),
content JSONB,   -- full day-by-day object, structure defined by AI prompt
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW()
```

### `marketplace_listings`
```sql
id UUID PK,
user_id UUID FK → users CASCADE,
itinerary_id UUID FK → itineraries CASCADE,
destination_id UUID FK → destinations CASCADE,
desired_budget NUMERIC(10,2),   -- !! column is desired_budget, NOT budget
status VARCHAR CHECK ('open','negotiating','confirmed','closed') DEFAULT 'open',
created_at TIMESTAMP DEFAULT NOW()
```

### `marketplace_offers`
```sql
id UUID PK,
listing_id UUID FK → marketplace_listings CASCADE,
guide_id UUID FK → tour_guides CASCADE,
proposed_price NUMERIC(10,2),
status VARCHAR CHECK ('pending','accepted','rejected','withdrawn') DEFAULT 'pending',
created_at TIMESTAMP DEFAULT NOW()
```

### `marketplace_messages`
```sql
id UUID PK,
listing_id UUID FK → marketplace_listings CASCADE,
sender_type VARCHAR CHECK ('traveler','guide'),
sender_id UUID,   -- NOT a FK (polymorphic — UUID of user OR tour_guide)
content TEXT,
created_at TIMESTAMP DEFAULT NOW()
-- IMPORTANT: sender_id is intentionally not a FK. Use sender_type to know which
-- table (users or tour_guides) to query for the sender's name/avatar.
```

### `transactions`
```sql
id UUID PK,
offer_id UUID FK → marketplace_offers RESTRICT,
payer_id UUID FK → users RESTRICT,
payee_id UUID FK → tour_guides RESTRICT,
total_amount NUMERIC(10,2),
service_charge NUMERIC(10,2),
guide_payout NUMERIC(10,2),   -- CONSTRAINT: must equal total_amount - service_charge
status VARCHAR CHECK ('pending','completed','refunded') DEFAULT 'pending',
payment_reference VARCHAR(100) UNIQUE,
created_at TIMESTAMP DEFAULT NOW()
-- RESTRICT: Cannot delete a user/guide/offer with a completed transaction.
-- Handle this error gracefully — show a message, do not crash.
```

## 1.6 API Route Pattern

```js
// Every API route follows this pattern
import { NextResponse } from 'next/server'
import { db } from '@/lib/supabase'  // always import from here

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const someParam = searchParams.get('someParam')
    const result = await db.query('SELECT * FROM table WHERE col = $1', [someParam])
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

## 1.7 Marketplace Status Label Derivation

The database stores `marketplace_listings.status` as `open`, `negotiating`, `confirmed`, or `closed`. The frontend derives the human-readable display status from the raw DB value **plus** the offer count. Pass `displayStatus` to `StatusBadge`, not the raw DB value.

```js
function getDisplayStatus(dbStatus, offerCount) {
  if (dbStatus === 'open' && offerCount === 0) return 'awaiting'
  if (dbStatus === 'open' && offerCount > 0)  return 'has_offers'
  return dbStatus  // 'negotiating', 'confirmed', 'closed' pass through unchanged
}
```

| `displayStatus` | Traveller sees | Guide sees | Badge colour |
|---|---|---|---|
| `awaiting` | Awaiting Offers | Open Listing | Grey |
| `has_offers` | X Offers Received | Your Offer Submitted | Amber |
| `negotiating` | Negotiating | In Negotiation | Blue |
| `confirmed` | Booking Confirmed | Booking Confirmed | Green |
| `closed` | Listing Closed | Listing Closed | Grey |

---

---

# SECTION 2 — DESIGN TOKENS
*ZX owns tailwind.config.js — all tokens are already configured*

---

## 2.1 Colour Tokens

```
bg-warmwhite    #FAF9F7   Page backgrounds
bg-charcoal     #1A1A1A   Primary buttons, navbar
text-charcoal   #1A1A1A   Primary body text
bg-amber        #C4874A   CTAs, active links, brand accent
text-amber      #C4874A   Highlighted text, match scores
bg-amberdark    #8B6A3E   Hover state on amber
border-border   #EBEBEB   Card borders, dividers
bg-subtle       #F5F2EE   Alternate section backgrounds
bg-muted        #F0EBE3   Tags, badges, form backgrounds
text-secondary  #666666   Subtitles, body descriptions
text-tertiary   #999999   Timestamps, metadata, placeholders
text-disabled   #AAAAAA   Disabled form states
text-success    #059669   / bg-success-bg #ECFDF5
text-warning    #D97706   / bg-warning-bg #FEF3C7
text-error      #DC2626   / bg-error-bg   #FEF2F2
```

## 2.2 Typography

```
Funnel Display (800) → font-display font-extrabold → ALL headings h1–h6
Noto Serif (400/600)  → font-body                   → ALL body text, labels, buttons

Already set globally in globals.css — no need to add these to every element.

ITALIC RULE: Funnel Display has no true italic. Use .italic-accent class for italic
accent text (e.g. homepage hero "uniquely yours."). This class uses Noto Serif italic
with amber colour. Never apply italic directly to font-display elements.
```

## 2.3 Spacing

```
Page max width:        max-w-5xl mx-auto
Page horizontal pad:   px-12 (desktop)  px-4 (mobile)
Section vertical pad:  py-20
Card internal pad:     p-5
Card border radius:    rounded-xl
Button border radius:  rounded-md
Input border radius:   rounded-lg
Badge border radius:   rounded
Avatar:                rounded-full
Modal:                 rounded-2xl
Grid gap:              gap-4
Section gap:           gap-6
```

---

---

# SECTION 3 — COMPONENT REFERENCE
*Import all components from @/components/ui/ — never rebuild them*

---

## Button
```jsx
import Button from '@/components/ui/Button'
// variant: 'primary' | 'ghost' | 'danger'   size: 'sm' | 'md' | 'lg'
<Button label="Save Itinerary" variant="primary" size="md" onClick={handleSave} />
<Button label="Cancel" variant="ghost" size="sm" onClick={handleCancel} />
<Button label="Delete" variant="danger" size="md" onClick={handleDelete} />
```

## Input
```jsx
import Input from '@/components/ui/Input'
<Input
  label="Email Address"
  placeholder="you@email.com"
  type="email"             // 'text' | 'email' | 'password' | 'number'
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error="Invalid email"    // optional — red text below field
  helper="Hint text"       // optional — grey text below field
/>
```

## Select
```jsx
import Select from '@/components/ui/Select'
<Select
  label="Travel Style"
  options={["Solo", "Couple", "Family", "Group"]}
  value={style}
  onChange={(val) => setStyle(val)}
  placeholder="Select one..."
/>
```

## PageHeader
```jsx
import PageHeader from '@/components/ui/PageHeader'
// tag: small amber uppercase label above title
// title: large Funnel Display heading
// subtitle: optional body text below title
<PageHeader tag="Marketplace" title="Find a Tour Guide" subtitle="Post your itinerary and receive offers." />
```

## DestinationCard
```jsx
import DestinationCard from '@/components/ui/DestinationCard'
<DestinationCard
  id={destination.id}
  name="Kyoto"
  country="Japan"
  tags={["Culture", "Food", "Temples"]}
  matchScore={98}          // optional — shows "98% match" badge on image
  imageUrl={destination.imageUrl}
  budgetLevel="Mid-range"  // optional
/>
```

## ListingCard
```jsx
import ListingCard from '@/components/ui/ListingCard'
// Use desired_budget — NOT budget (matches DB column name)
<ListingCard
  id={listing.id}
  city="Kyoto, Japan"
  duration="5 days"
  groupSize="2 pax"
  desiredBudget={3200}     // displayed as "RM 3,200"
  tags={["Culture", "Halal food"]}
  status={listing.status}
  offerCount={listing.offer_count}
/>
```

## StatusBadge
```jsx
import StatusBadge from '@/components/ui/StatusBadge'
// Pass displayStatus (derived) — NOT the raw DB status value
// See Section 1.7 for the derivation logic
<StatusBadge displayStatus="has_offers" offerCount={3} />
<StatusBadge displayStatus="confirmed" />
```

## Spinner
```jsx
import Spinner from '@/components/ui/Spinner'
// Always show while any API call is in progress
{isLoading ? <Spinner /> : <YourContent />}
```

## Avatar
```jsx
import Avatar from '@/components/ui/Avatar'
// Falls back to user's initials if imageUrl is null
<Avatar name="Ahmad Rashid" imageUrl={user.avatarUrl} size="md" />
// size: 'sm' | 'md' | 'lg'
```

## Modal
```jsx
import Modal from '@/components/ui/Modal'
<Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Accept this offer?">
  <p>This will confirm the booking.</p>
  <div className="flex gap-2 mt-4">
    <Button label="Confirm" variant="primary" onClick={handleConfirm} />
    <Button label="Cancel" variant="ghost" onClick={() => setShowModal(false)} />
  </div>
</Modal>
```

## Badge
```jsx
import Badge from '@/components/ui/Badge'
<Badge label="Beach" />
<Badge label="Halal-friendly" />
<Badge label="Mid-range" />
```

## StarRating
```jsx
import StarRating from '@/components/ui/StarRating'
<StarRating value={4.5} mode="display" />               // read-only stars
<StarRating value={rating} mode="input" onChange={(v) => setRating(v)} /> // clickable
```

---

---

# SECTION 4 — ABSOLUTE RULES
*These apply to every member without exception*

---

- Never import Navbar or Footer in your page files — layout.jsx adds them automatically
- Never hardcode hex colours — use Tailwind tokens (bg-amber not bg-[#C4874A])
- Never use the `<form>` HTML tag — use `<div>` with onClick/onChange handlers
- Never use localStorage or sessionStorage — use React state or Supabase auth
- Never use `<img>` — use Next.js `<Image>` from `next/image`
- Never use arbitrary Tailwind values like w-[347px] — use standard scale
- Never apply `italic` to `font-display` — use `.italic-accent` class
- Never pass raw DB status to StatusBadge — derive displayStatus first
- Never reference a `budget` column in marketplace_listings — it is `desired_budget`
- Never create a new DB connection — import from `@/lib/supabase`
- Never rebuild Button, Input, Card, or any existing UI component
- Never push directly to main — use a feature branch then open a PR into dev
- Never commit .env.local — it contains credentials and is gitignored

---

---

# SECTION 5 — NAMING CONVENTIONS
*Follow these exactly so everyone's code is consistent*

---

```
Page files:            lowercase                   page.jsx
Component files:       PascalCase                  DestinationCard.jsx
Section files:         PascalCase                  HeroSection.jsx
Utility files:         camelCase                   formatCurrency.js
API route files:       lowercase                   route.js
Folders:               lowercase-with-hyphens      my-plans/  auth/
Variables / state:     camelCase                   listingData  isLoading
Event handlers:        camelCase, handle prefix    handleSubmit()  handleAccept()
React components:      PascalCase                  ListingCard  StatusBadge
Constants:             UPPER_SNAKE_CASE            MAX_OFFER_PRICE
API route paths:       kebab-case                  /api/marketplace-listings
DB column references:  snake_case (exact as in DB) desired_budget  sender_type  created_at
```

---

---

# SECTION 6 — MODULE SPECIFICATIONS
*Each member reads only their own section below*

---

## 6.1 Homepage

**File:** `app/page.jsx`

**What it is:** The landing page. Must communicate the platform's value immediately and direct both types of users (those with a destination in mind and those without) to the right next step.

### Sections (in order)

**Hero Section** — uses `components/sections/HeroSection.jsx`
- Left side: sparkle icon, heading "Travel that feels" + italic accent "uniquely yours." (use `.italic-accent` class, NOT `font-display italic`)
- Subtext: "Answer a few simple questions and our system recommends destinations that suit your style, budget, and needs — then plans your trip with AI."
- Search bar: Input + Button side by side — for users who already know their destination, submitting navigates to `/destinations/[id]` if a match is found or `/destinations?search=query` for a list
- Below search bar: small link "No idea where to go? Start with your preferences →" — links to `/recommendations`
- Three stats below: "200+ Destinations", "1.2k+ Itineraries Generated", "300+ Verified Guides" — hardcoded values
- Right side: hero image card — city name, category tags, match score badge overlaid on image; a floating card below showing "AI Itinerary Ready · 5-day trip · RM 2,400 est."

**How It Works Section**
- Three-column grid (`grid-cols-1 lg:grid-cols-3 gap-4`)
- Each step: numbered circle (charcoal bg, white text), step title, two-line description
- Steps: "1 Set Your Preferences", "2 Get City Recommendations", "3 Plan with AI"
- No buttons — purely informational

**Featured Destinations Section** — uses `components/sections/FeaturedDestinations.jsx`
- Section tag: "Featured Cities", title: "Popular destinations"
- Fetch from `GET /api/destinations?featured=true` or top 4 by some ranking
- Four-column grid of `DestinationCard` — `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`
- "View all cities →" link to `/destinations`
- Show `Spinner` while loading

**Marketplace Teaser Section**
- Two-column layout (`grid-cols-1 lg:grid-cols-2 gap-12`)
- Left: tag "Marketplace", title "Connect with verified tour guides", description, "Browse Marketplace" primary Button linking to `/marketplace`
- Right: 3 miniature `ListingCard` previews — hardcoded placeholder data is fine here

**Footer** — uses `components/ui/Footer.jsx` — already in layout, no action needed

### States
- Loading: `Spinner` while destinations fetch
- Error: show "Destinations unavailable right now" with a retry button

---

## 6.2 Auth & Profile

**Files:**
- `app/auth/login/page.jsx`
- `app/auth/register/page.jsx`
- `app/profile/page.jsx`

**What it is:** Authentication and user profile management. Two separate registration flows — one for travellers, one for tour guides.

### Login Page (`app/auth/login/page.jsx`)
- Centred card layout: `max-w-md mx-auto`
- myholiday logo at top, centred
- `Input` for email (type="email"), `Input` for password (type="password")
- "Forgot password?" link — grey, small, right-aligned below password field
- Primary `Button` "Log In" — full width
- Divider line with "or"
- Ghost `Button` "Register as Traveller" — links to `/auth/register?role=traveler`
- Ghost `Button` "Register as Tour Guide" — links to `/auth/register?role=guide`
- On submit: POST to `/api/auth` with `{ email, password }`
- On success: redirect to `/` for travellers, `/marketplace` for guides
- On error: show error message below the submit button using error colour

### Register Page (`app/auth/register/page.jsx`)
Read `?role=` query param to determine which flow to show.

**Traveller registration — 3 steps with a progress bar**

Step 1 — Account details:
- `Input` full name (required)
- `Input` email (required, type="email")
- `Input` password (required, type="password")
- `Input` confirm password (required, type="password") — validate match client-side
- "Next" primary `Button`

Step 2 — Personal profile (used by AI for personalised itineraries):
- `Input` date of birth (type="date")
- `Input` nationality
- `Select` dietary restrictions — options: ["None", "Halal", "Vegetarian", "Vegan", "Other"]
- Toggle / checkbox for accessibility needs — label: "I have accessibility requirements"
- `Select` language preference — options: ["English", "Bahasa Malaysia", "Mandarin", "Tamil"]
- "Back" ghost Button + "Next" primary Button

Step 3 — Confirmation:
- Summary of entered details (read-only display)
- Primary `Button` "Create Account" — submits to `POST /api/auth/register`
- On success: redirect to `/` with welcome message

**Tour Guide registration — single form:**
- `Input` full name
- `Input` email
- `Input` password + confirm password
- `Input` phone number
- `Select` city — fetch all destinations from `GET /api/destinations` and display as city name options. On selection, store the destination's UUID as `city_id`
- File input for verification document — label: "Upload Verification Document (License or ID)" — store the URL after upload as `document_url`
- Primary `Button` "Submit Application"
- On success: show a non-redirecting success message — "Your application is pending approval by an administrator." and a "Back to Home" link

### Profile Page (`app/profile/page.jsx`)
- `PageHeader` tag: "Account", title: "Your Profile"
- `Avatar` component (large size) with user's full name and email below it
- Editable form fields matching the user's profile — same fields as registration Step 2
- Primary `Button` "Save Changes" — submits `PATCH /api/profile`
- Section below: "Saved Itineraries" — list of itinerary titles linking to `/itinerary/my-plans`
- Protect route: if no session, redirect to `/auth/login`

### API calls
- `POST /api/auth` — login
- `POST /api/auth/register` — register
- `GET /api/profile` — fetch current user profile
- `PATCH /api/profile` — update profile

---

## 6.3 Recommendation Engine

**Files:**
- `app/recommendations/page.jsx` — preference quiz
- `app/destinations/page.jsx` — destination listing + recommendation results (shared with ZX's homepage data)

**What it is:** A multi-step preference quiz that collects travel preferences and matches them against the `destinations` table using weighted scoring against the 9 thematic columns (culture, adventure, nature, beaches, nightlife, cuisine, wellness, urban, seclusion).

### Preference Quiz (`app/recommendations/page.jsx`)
- Progress bar at top — shows current step / total steps (e.g. "Step 3 of 6")
- One question per screen — do not show all fields at once
- Back and Next buttons — Next disabled until a selection is made

Step 1 — Travel Style:
- `Select` or large pill buttons: Solo / Couple / Family / Group
- Maps to group_size logic in the algorithm

Step 2 — Budget Range:
- Pill buttons: Budget / Mid-range / Luxury
- Maps to `budget_level` in `destinations` table

Step 3 — Group Size:
- Slider or number `Input`: 1–10 people

Step 4 — Trip Duration:
- Pill buttons: Weekend (1–3 days) / One Week / Two Weeks / One Month+
- Maps to `ideal_durations` JSONB in `destinations` table

Step 5 — Climate Preference:
- Pill buttons: Tropical / Temperate / Cold / Any
- Maps to `avg_temp_monthly` JSONB in `destinations` table

Step 6 — Interests (multi-select):
- Checkbox grid of 9 categories: Culture / Adventure / Nature / Beaches / Nightlife / Cuisine / Wellness / Urban / Seclusion
- Each directly maps to the corresponding SMALLINT column in `destinations`
- User selects all that apply — the algorithm weights these higher

On submit:
- `POST /api/recommendations` with collected preferences
- On success: redirect to `/destinations` — the results page renders destination cards with `matchScore` badges
- Show `Spinner` while processing

Skip option:
- "I already know where I want to go →" link at the top — navigates to `/destinations` without match scores

### Destinations Page (`app/destinations/page.jsx`)
- `PageHeader` tag: "Browse", title: "All Destinations"
- If arriving from recommendation engine: show "Recommended for you" header variant, all `DestinationCard` components show `matchScore` badge
- If browsing normally: `matchScore` prop not passed — badge is hidden
- Filter bar (horizontal row of pills):
  - Category: All / Beach / City / Nature / Culture / Adventure
  - Budget: Any / Budget / Mid-range / Luxury
  - Climate: Any / Tropical / Temperate / Cold
  - Active filter: charcoal background, white text
- Four-column `DestinationCard` grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`
- Fetch from `GET /api/destinations` with optional query params `?budget_level=&category=`
- Empty state: "No destinations match your filters." with a "Clear filters" Button (ghost)
- Show `Spinner` while loading

### API routes to build
- `POST /api/recommendations` — accept preference object, run scoring algorithm against `destinations` table, return array of `{ destination, matchScore }` sorted descending
- `GET /api/destinations` — accept optional `?budget_level=&category=&search=` query params

---

## 6.4 City Detail Page

**File:** `app/destinations/[id]/page.jsx`

**What it is:** Full detail view of a single destination. Two-column layout — main content left, sidebar right.

### Main Content (left column, approx 65% width)

Hero image area:
- Large image at full column width, height `280px`, `object-cover`, `rounded-xl`
- Dark gradient overlay from bottom
- Destination name (Funnel Display, white, large) overlaid at bottom-left
- Category tags as `Badge` components overlaid at bottom-left below name
- Match score badge overlaid at top-right (only shown if arriving from recommendation flow)

Three stat cards below image (`grid-cols-3 gap-3`):
- "Est. Budget / Day" — from `destinations` table, derived from `budget_level`
- "Best Season" — from `best_time_to_visit`
- "Avg. Trip Duration" — from `ideal_durations` JSONB

About section:
- `short_description` from database — full paragraph text

Thematic Ratings section:
- Title: "What this destination is known for"
- Nine ratings displayed as horizontal bar indicators: Culture, Adventure, Nature, Beaches, Nightlife, Cuisine, Wellness, Urban, Seclusion
- Each bar: label on left, filled bar in amber proportional to value (0–5), number on right

Temperature chart (optional):
- Small bar chart using Recharts — `avg_temp_monthly` JSONB parsed into monthly data points
- X-axis: Jan–Dec, Y-axis: temperature (°C)

### Sidebar (right column, approx 35% width)

CTA card (dark charcoal background):
- Title: "Ready to plan this trip?"
- Small description: "Chat with our AI to generate a personalised day-by-day itinerary."
- Primary `Button` "Generate AI Itinerary" — navigates to `/itinerary?destination_id=[id]`
- Ghost `Button` "Save to My Profile" — calls API to save destination

Booking Resources card:
- Title: "Useful Links"
- List of external links: Flights (Skyscanner), Hotels (Booking.com), Activities (Klook), Transport
- Each link opens in new tab — `target="_blank" rel="noopener noreferrer"`
- Small disclaimer: "External links — opens outside MyHoliday"

### States
- Loading: `Spinner` centred on page
- Not found: show "Destination not found" with "Back to Destinations" link
- Fetch: `GET /api/destinations/[id]`

---

## 6.5 AI Itinerary Planner

**File:** `app/itinerary/page.jsx`

**What it is:** Split-screen AI chat interface. Left panel shows the generated itinerary. Right panel is the chat window. Read `?destination_id=` from URL params on load.

### Left Panel (itinerary display, approx 55% width)

Top section — trip context chips:
- Small pill badges showing: destination city, trip duration, budget level, dietary restrictions (pulled from user profile in session)
- These are read-only — the user set them in their profile

Generated itinerary display:
- Day-by-day accordion list — each day is a collapsible row
- Day header: "Day 1 — Arrival & [City] Old Town" — bold
- Expanded content: list of activities with time, name, description, estimated cost
- If itinerary not yet generated: show placeholder with a "Start chatting to generate your plan" message

Action buttons below itinerary:
- Primary `Button` "Save Itinerary" — calls `POST /api/itinerary` — disabled until itinerary has content
- Ghost `Button` "Post to Marketplace" — navigates to `/marketplace/new?itinerary_id=[id]` — disabled until itinerary is saved
- Show `Spinner` on Save button while POST is in progress

### Right Panel — AI Chat (uses `components/sections/ChatWindow.jsx`)
- Chat header: green status dot, "Wander AI", destination name on the right in grey
- Message thread:
  - AI messages: left-aligned, `bg-muted` bubble, Noto Serif, no avatar
  - User messages: right-aligned, `bg-charcoal text-warmwhite` bubble
  - Show `Spinner` below last AI message while AI is responding
- Context note above input field: "AI is aware of your age, dietary restrictions, accessibility needs, and travel style."
- Message input (`Input` component) + "Send" primary `Button`
- On send: insert to `chat_messages` via `POST /api/itinerary/chat`, update UI optimistically

### On page load
- If `?destination_id=` param present: auto-send an initial message to the AI: "Generate a [X]-day itinerary for [city] for a [travel_style] traveller. My dietary preference is [dietary_restrictions]. Budget: [budget_level]." — pull all values from user profile session
- Fetch existing `chat_sessions` for this user + destination — resume if one exists

### API calls
- `POST /api/itinerary/chat` — send message, get AI response (chat_messages table)
- `POST /api/itinerary` — save itinerary (creates row in itineraries table)
- `GET /api/itinerary/[sessionId]` — fetch existing session messages

---

## 6.6 Itinerary Management

**File:** `app/itinerary/my-plans/page.jsx`

**What it is:** Dashboard of the logged-in traveller's saved itineraries. Protected route — redirect to `/auth/login` if no session.

### Page Layout
- `PageHeader` tag: "My Plans", title: "Your Saved Itineraries"
- Two-column grid: `grid-cols-1 md:grid-cols-2 gap-4`
- Each itinerary shown as a card with:
  - Destination city name (from JOINed `destinations` table)
  - Itinerary title
  - Trip creation date (`created_at` formatted as "Created 12 Mar 2025")
  - Brief preview: first day title from `content` JSONB — e.g. "Day 1: Arrival & Gion District"
  - Two buttons per card:
    - Ghost `Button` "View & Edit" — navigates to `/itinerary?session_id=[session_id]`
    - Primary `Button` "Post to Marketplace" — navigates to `/marketplace/new?itinerary_id=[id]`
  - A `Badge` showing the `budget_level` of the destination

### Marketplace Listing Status
- If an itinerary has already been posted to the marketplace, show a `StatusBadge` on the card showing the current listing status
- Fetch listing status by joining `itineraries.id` to `marketplace_listings.itinerary_id`

### Empty State
- If user has no saved itineraries: show a centred message
  - "You haven't saved any itineraries yet."
  - Primary `Button` "Start Planning" — links to `/destinations`

### API calls
- `GET /api/itinerary/my-plans` — fetch all itineraries for the logged-in user, JOIN with `destinations` to get city name, LEFT JOIN with `marketplace_listings` to get listing status if any

---

## 6.7 Marketplace

**Files:**
- `app/marketplace/page.jsx` — listing board (different views for traveller and guide)
- `app/marketplace/new/page.jsx` — create listing form
- `app/marketplace/[id]/page.jsx` — listing detail, offers, chat

**What it is:** A two-sided marketplace. Travellers post itineraries. Tour guides browse and submit price offers. Both parties negotiate via chat. The traveller accepts an offer to confirm the booking and create a transaction.

**IMPORTANT column name:** The budget field in `marketplace_listings` is `desired_budget` — NOT `budget`. Use this exact name everywhere.

---

### Listing Board (`app/marketplace/page.jsx`)

Protect route: redirect to `/auth/login` if no session.

**Traveller view** (user.role === 'traveler'):
- `PageHeader` tag: "Marketplace", title: "Your Listings"
- Primary `Button` "Post New Itinerary" — links to `/marketplace/new` — top right of header
- Three-column grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- Fetch: `GET /api/marketplace/listings` — returns traveller's own listings
- Render each as `ListingCard` — pass `desiredBudget={listing.desired_budget}`
- Derive `displayStatus` using `getDisplayStatus(listing.status, listing.offer_count)` — see Section 1.7
- Pass `displayStatus` to `ListingCard` which passes it to `StatusBadge`
- Each card links to `/marketplace/[id]`
- Empty state: "You haven't posted any listings yet." + primary `Button` "Post Your First Itinerary"
- Show `Spinner` while loading

**Guide view** (user is a tour guide, verified):
- `PageHeader` tag: "Marketplace", title: "Browse Listings"
- Destination filter dropdown — fetch destinations from `GET /api/destinations`, default to guide's registered city
- Three-column grid of `ListingCard` components
- Fetch: `GET /api/marketplace/listings?destination_id=[guide.city_id]` — only listings for their city
- Empty state: "No open listings in your city right now."
- Only show listings with `status = 'open'`
- Each card links to `/marketplace/[id]`

---

### Create Listing Page (`app/marketplace/new/page.jsx`)

Protect route: redirect to `/auth/login` if no session. Traveller role only.

Uses `components/sections/ListingForm.jsx` built by ZX.

- Check if `?itinerary_id=` param is present in URL — if so, pre-select that itinerary
- Fetch user's saved itineraries: `GET /api/itinerary/my-plans` — populate `Select` dropdown
- If no saved itineraries exist: show message "You need to save an itinerary first before posting." + primary `Button` "Create an Itinerary" linking to `/itinerary`
- Form fields:
  - `Select` "Which itinerary are you posting?" — options are user's saved itinerary titles, value is itinerary UUID
  - Auto-populate read-only fields from selected itinerary: destination city, estimated duration
  - `Input` "Your Budget (MYR)" — type="number", maps to `desired_budget`
- Primary `Button` "Post Listing" — calls `POST /api/marketplace/listings` with `{ itinerary_id, destination_id, desired_budget }`
- On success: redirect to `/marketplace/[newListingId]`
- On error: show error message below the submit button

---

### Listing Detail Page (`app/marketplace/[id]/page.jsx`)

Fetch listing: `GET /api/marketplace/listings/[id]`

**Traveller view** (logged-in user is the listing owner):

Top section:
- Destination city, duration, group size
- `desired_budget` displayed as "Budget: RM X,XXX"
- `StatusBadge` with derived `displayStatus`

Itinerary summary section:
- Collapsed preview of the attached itinerary — first 2 days visible
- "Expand full itinerary" toggle button

Offers section:
- Title: "Offers from Guides" (or "Awaiting Offers..." if none yet)
- Fetch: `GET /api/marketplace/offers/[listingId]`
- For each offer render:
  - `Avatar` + guide full name + guide city
  - Proposed price formatted as "RM X,XXX"
  - `StatusBadge` for offer status (pending / accepted / rejected)
  - "Accept" primary `Button` — opens `Modal` confirmation
  - "Reject" ghost `Button`
- On Accept confirm:
  1. `PATCH /api/marketplace/offers/[offerId]` — set status to `accepted`
  2. `PATCH /api/marketplace/listings/[id]` — set status to `confirmed`
  3. `POST /api/marketplace/transactions` — body: `{ offer_id, payer_id: user.id, payee_id: offer.guide_id, total_amount: offer.proposed_price, service_charge: 0, guide_payout: offer.proposed_price, payment_reference: uuid }` — validate `guide_payout === total_amount - service_charge` before sending
  4. Show booking confirmation panel (see below)
- On Reject: `PATCH /api/marketplace/offers/[offerId]` — set status to `rejected`

Chat section (always visible at bottom):
- Title: "Negotiate with Guides"
- Uses `components/sections/ChatWindow.jsx`
- Fetch messages: `GET /api/marketplace/messages/[listingId]`
- Distinguish bubbles by `sender_type` — traveller on right (charcoal), guide on left (muted)
- Use `sender_type` to determine name and `Avatar` per message
- Message input + Send button — `POST /api/marketplace/messages` with `{ listing_id, sender_id: user.id, sender_type: 'traveler', content }`
- On first message send: also `PATCH /api/marketplace/listings/[id]` to set status to `negotiating`

Booking confirmation panel (shown after successful accept):
- Green success banner at top of page
- Summary card: city, guide name, total amount, service charge, guide payout, `payment_reference`
- Ghost `Button` "Back to My Listings"
- Note: "Payment is simulated — no real transaction occurs."
- Handle RESTRICT error: if any delete operation is blocked by a completed transaction, catch the error and show "This record cannot be removed as it is linked to a completed booking."

**Guide view** (logged-in user is a tour guide):

Top section: same listing header as traveller view

Itinerary section: same itinerary summary

Offer submission (if guide has NOT submitted an offer yet):
- `Input` "Your Proposed Price (MYR)" — type="number"
- Primary `Button` "Submit Offer" — `POST /api/marketplace/offers` with `{ listing_id, guide_id: guide.id, proposed_price }`
- On success: show guide's submitted offer read-only with a "Withdraw Offer" ghost `Button`
- On withdraw: `PATCH /api/marketplace/offers/[id]` with `status: 'withdrawn'`

If guide has already submitted: show their offer (price + status) in read-only mode with "Withdraw Offer" button.

Chat section: same as traveller view but `sender_type: 'guide'` in POST body.

---

## 6.8 Admin Dashboard

**File:** `app/dashboard/page.jsx`

**What it is:** Admin-only page. Protect route — if `user.role !== 'admin'`, redirect to `/`. Accessible only to users with `role = 'admin'` in the `users` table.

### Layout Sections

**Stats Row** (`grid-cols-2 lg:grid-cols-4 gap-4`):
Four metric cards — each shows a large number with a small label below:
- "Total Users" — `SELECT COUNT(*) FROM users WHERE role = 'traveler'`
- "Total Itineraries" — `SELECT COUNT(*) FROM itineraries`
- "Active Listings" — `SELECT COUNT(*) FROM marketplace_listings WHERE status = 'open'`
- "Transaction Volume" — `SELECT SUM(total_amount) FROM transactions WHERE status = 'completed'` — displayed as "RM X,XXX"

**Popular Destinations Chart** (Recharts `BarChart`, horizontal):
- X-axis: count of itineraries, Y-axis: city names
- Query: `SELECT d.city, COUNT(i.id) as itinerary_count FROM destinations d JOIN itineraries i ON i.destination_id = d.id GROUP BY d.city ORDER BY itinerary_count DESC LIMIT 10`
- Bar colour: amber

**Marketplace Activity Chart** (Recharts `LineChart`):
- Two lines: confirmed bookings per month, transaction volume per month
- X-axis: month labels (Jan–Dec), Y-axis: count / amount
- Query: group `marketplace_listings` by `DATE_TRUNC('month', created_at)` where `status = 'confirmed'`

**User Demographics** (Recharts `PieChart`):
- Two pie charts side by side:
  - Dietary restriction distribution — group `users` by `dietary_restrictions`
  - Budget level distribution — group `itineraries` joined to `destinations` by `budget_level`

**`historical_trips` Statistics** (Recharts `BarChart`):
- Fetch from `historical_trips` table — average `accommodation_cost` and `transportation_cost` by destination
- Note: this table has no FK — match destination names as plain strings

**User Management Table**:
- Columns: Full Name, Email, Role, Joined Date, Actions
- Fetch: `GET /api/dashboard/users`
- Actions per row: "Deactivate" button (guide/traveller rows)
- Pagination: 20 rows per page

**Pending Guide Approvals Section**:
- Card list of all `tour_guides` where `verification_status = 'pending'`
- Each card: guide name, email, city name (JOIN to destinations), "View Document" link, "Approve" primary `Button`, "Reject" danger `Button`
- On Approve: `PATCH /api/dashboard/guides/[id]` with `{ verification_status: 'approved' }`
- On Reject: `PATCH /api/dashboard/guides/[id]` with `{ verification_status: 'rejected' }`

### API routes to build
- `GET /api/dashboard/stats` — aggregate counts for the four metric cards
- `GET /api/dashboard/destinations` — top destinations by itinerary count
- `GET /api/dashboard/marketplace` — monthly bookings and transaction volume
- `GET /api/dashboard/demographics` — dietary and budget level distributions
- `GET /api/dashboard/users` — paginated user list
- `PATCH /api/dashboard/guides/[id]` — update guide verification status

---

*Maintained by ZX — Low Ze Xuan | Leader and Frontend/UI Designer*
*MyHoliday | AAPP011-4-2 Capstone Project | Group 1 | UCDF2407ICT(DI)*
*Repository: https://github.com/learnerxuan/myholiday*
*Last updated: Week 4*
