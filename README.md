# ✈️ MyHoliday — Travel & Tourism Recommendation System

> A web-based platform that takes you from *"I have no idea where to go"* to *"my trip is planned and my local guide is confirmed"* — entirely in one place.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%26%20Auth-3ECF8E?logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://vercel.com/)

---

## 📌 Table of Contents

- [The Problem](#-the-problem)
- [The Solution](#-the-solution)
- [How It Works](#-how-it-works)
- [System Modules](#-system-modules)
  - [User Authentication & Profiling](#1-user-authentication--profiling)
  - [Destination Recommendation Engine](#2-destination-recommendation-engine)
  - [AI Itinerary Planner](#3-ai-itinerary-planner)
  - [Marketplace](#4-marketplace)
  - [Admin Dashboard](#5-admin-dashboard)
- [User Roles](#-user-roles)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Database Schema](#-database-schema)
- [Environment Variables](#-environment-variables)
- [Scope & Limitations](#-scope--limitations)
- [Team](#-team)

---

## ❗ The Problem

The travel and tourism industry contributes 10% of global GDP and is projected to exceed USD 16.5 trillion by 2035. Online travel booking is growing at 8.2% CAGR, yet the experience of planning a trip remains fundamentally broken for the average traveller.

**Problem 1 — Choice Overload**

Platforms like TripAdvisor, Expedia, and Booking.com return broad, non-personalised results. A traveller who doesn't know where they want to go is met with hundreds of advertised destinations, none of which are filtered to their travel style, budget, group size, or preferences. Research shows that too many choices causes people to either make no decision at all, or make a poor one and regret it. The time spent researching does not justify the quality of the result.

**Problem 2 — No Bridge Between Travellers and Private Local Guides**

There is a growing preference for independent, private travel over generic group package tours. Travellers want customised experiences at their own pace. However, there is no structured platform where independent travellers can discover, communicate, and negotiate directly with verified local tour guides. Travellers end up paying for overpriced generic group tours, while local guides lose clients because they have no dedicated channel to reach independent travellers.

**Problem 3 — No End-to-End Solution Exists**

Existing platforms each solve only one piece of the puzzle:
- **Google Search** — broad, non-personalised results
- **TripAdvisor** — review-based, not preference-driven
- **Travel Blogs** — static content, no personalisation or interactivity
- **Expedia / Booking.com** — transaction-focused, not discovery-focused

None of these guide a traveller from *not knowing where to go* all the way to *confirming a private local guide* for the trip.

---

## 💡 The Solution

**MyHoliday** is a web application built for two primary user groups: **independent travellers** who want personalised trips, and **local tour guides** who are looking for clients.

It is structured around five interconnected modules that take a traveller through the full journey:

1. A **preference quiz** collects what the user actually wants and matches them to a destination
2. An **AI chatbot** generates a fully personalised, conversational day-by-day itinerary
3. A **marketplace** lets travellers publish their finalised plan and receive proposals from verified local guides
4. A **real-time chat system** lets travellers and guides negotiate directly before confirming
5. An **admin dashboard** keeps the platform safe, verified, and data-informed

---

## 🔄 How It Works

### For a Traveller

```
Register & Build Profile
        │
        ▼
Take the Preference Quiz
(Travel style, budget, group size, duration, climate)
        │
        ▼
View Ranked Destination Recommendations
(Match score calculated per city)
        │
        ▼
Select a City → View City Details
(Description, attractions, estimated costs)
        │
        ▼
Chat with AI Itinerary Planner
(Generate → Refine → Confirm day-by-day plan)
        │
        ▼
Save Plan to "My Plans" Dashboard
        │
        ▼
Post Plan to Marketplace with a Budget
        │
        ▼
Receive Proposals from Local Tour Guides
        │
        ▼
Negotiate via In-Platform Chat → Accept Offer
```

### For a Tour Guide

```
Register as Tour Guide
        │
        ▼
Upload Verification Documents
(Licence / Identification)
        │
        ▼
Wait for Admin Approval
        │
        ▼
Browse Marketplace Listings in Registered City
        │
        ▼
Submit Service Proposal with Quoted Price
        │
        ▼
Chat with Traveller to Finalise Details
        │
        ▼
Booking Confirmed
```

---

## 🧩 System Modules

### 1. User Authentication & Profiling

Handles account creation, session management, and personal profiling for all user types.

**Traveller accounts support:**
- Register, login, logout
- Password recovery via forgot password flow
- Personal profile: age, nationality, dietary restrictions, accessibility needs, preferred language
- Profile data is used downstream by the AI planner to personalise itineraries

**Tour guide accounts support:**
- Separate registration flow distinct from traveller registration
- City assignment — guides are locked to a single city they serve
- Document upload (licence or identification) for verification
- Profile editing post-approval

---

### 2. Destination Recommendation Engine

The core discovery feature of MyHoliday. Instead of showing the user a static catalogue of destinations, the engine offers two co-existing methods to discover travel locations: an explicit preference quiz, and a personalized discovery feed.

**1. The Preference Quiz (Primary)**

The system works backwards from the user's stated preferences. The user answers a quiz with the following inputs:

| Input | Options |
|---|---|
| Travel Style | Adventure, Cultural, Relaxation, Food & Dining, Nature, etc. |
| Budget Level | Backpacker / Mid-range / Luxury |
| Group Size | Solo / Couple / Small Group / Large Group |
| Trip Duration | Weekend / 1 Week / 2 Weeks / Extended |
| Climate Preference | Tropical / Temperate / Cold / Desert / Any |

The engine then analyzes the submitted preferences, filters the destination database, and returns a ranked list of cities explicitly matched with a **match score**.

**2. Explore Page Personalization (Discovery)**

Users who skip the quiz or simply want to browse arrive at the "Explore" page. Here, the engine uses **multi-signal personalization** to dynamically rank destinations based on implicit user behavior:
- **User Interactions (Clicks)**: Tracks which destinations a user views to boost affinity for specific regions and countries.
- **Saved Itineraries & Chat History**: Analyzes past travel planning behavior to refine recommendations.

To ensure a fresh experience, the engine avoids repetitive sorting, maintaining a mix of highly relevant personalized matches alongside randomized discovery.

**Destination dataset:** Both engines operate on a predefined, curated destination dataset rather than live travel data. Each destination entry includes thematic tags, allowing the scoring algorithm to compute reliable matches seamlessly.

---

### 3. AI Itinerary Planner

Once a traveller selects a destination, they enter the AI Itinerary Planner — a conversational interface powered by a large language model.

**City Detail Page**

Before entering the planner, users view a city detail page containing:
- City description and overview
- Popular attractions and points of interest
- Estimated travel costs for the destination

**Chatbot Interaction Flow**

The AI planner is not a form or a template generator. It is a full conversational interface where the user discusses the trip with the AI:

1. **Generate Draft** — The AI uses the user's profile (dietary restrictions, accessibility needs, language, group size, nationality) and the selected destination to produce an initial day-by-day itinerary
2. **Refine Plan** — The user can request changes through conversation: swap an activity, adjust pacing, add a specific type of restaurant, account for mobility needs, etc.
3. **Confirm Plan** — Once satisfied, the user confirms and saves the itinerary

**My Plans Dashboard**

All saved itineraries are accessible from the user's personal dashboard. Users can:
- Review any saved travel plan
- Edit the plan (re-enters the chatbot with existing context)
- Delete a plan

**External Booking Links**

City pages and itineraries include links to third-party sites for hotel and transport bookings. MyHoliday does not perform actual bookings — it redirects users to the appropriate external platforms.

---

### 4. Marketplace

The marketplace connects travellers with verified local tour guides. It is the final step in the MyHoliday journey.

**Traveller Side**

After saving a finalised itinerary, the traveller can publish it as a marketplace listing:
- Set a desired budget for the tour
- The listing becomes visible to tour guides in the matching city

Once listed, the traveller can:
- View all incoming proposals from guides
- See each guide's quoted price and profile
- Use the in-platform chat to discuss trip details, ask questions, and negotiate
- Accept a proposal to confirm the booking

**Tour Guide Side**

Verified guides see all active marketplace listings within their registered city:
- Browse listings and read the traveller's full itinerary
- Submit a service proposal with a custom quoted price
- Communicate with the traveller directly via in-platform chat

**Chat System**

Real-time messaging between traveller and tour guide is built into the marketplace. This allows both parties to negotiate, clarify details, and reach mutual agreement before committing.

> ⚠️ MyHoliday facilitates the connection and agreement between travellers and guides but does not process payments or guarantee service quality.

---

### 5. Admin Dashboard

The admin dashboard gives platform administrators full visibility and control over MyHoliday's operations.

**User Management**
- View and manage all registered traveller and tour guide accounts
- Suspend or deactivate accounts where necessary

**Tour Guide Verification**
- Review uploaded guide documents (licence, identification)
- Approve or reject verification requests
- Guides cannot access the marketplace until their account is approved

**Marketplace Moderation**
- View all active marketplace listings
- Remove or flag inappropriate listings

**Analytics & Reports**

The dashboard surfaces descriptive statistics from the platform database:

| Metric | Description |
|---|---|
| Popular Destinations | Which cities are most frequently selected by travellers |
| Itineraries Generated | Total count of AI-generated plans over time |
| Marketplace Activity | Number of active listings, offers submitted, bookings confirmed |
| User Demographics | Basic breakdown of user nationalities, group sizes, travel styles |

---

## 👥 User Roles

| Role | Access |
|---|---|
| **Traveller** | Quiz, recommendations, city pages, AI planner, my plans, marketplace (post & accept) |
| **Tour Guide** | Marketplace browser (city-scoped), proposal submission, guide chat |
| **Administrator** | Full platform access — user management, guide verification, marketplace moderation, analytics |

Access control is enforced at the database level using **Supabase Row Level Security (RLS)** policies, ensuring each role can only read and write data they are authorised for.

---

## 🛠️ Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router) | Full-stack in one codebase — API routes handle backend logic, SSR renders city and recommendation pages, route groups cleanly separate the three user role layouts |
| **Database** | [Supabase (PostgreSQL)](https://supabase.com/) | Relational database suits the structured, multi-role data model; built-in Row Level Security for access control; Realtime for marketplace chat; Storage for guide document uploads |
| **Authentication** | Supabase Auth | Email/password auth with session management; role-based access enforced via RLS policies and user metadata |
| **AI Chatbot** | OpenAI API / Gemini API | Powers the conversational itinerary planner via Next.js API routes — the LLM call is server-side, keeping the API key out of the client |
| **File Storage** | Supabase Storage | Stores tour guide verification documents with secure, access-controlled bucket policies |
| **Deployment** | [Vercel](https://vercel.com/) | Native Next.js deployment with zero config; environment variables managed in the Vercel dashboard; edge network for fast global access |

---

## 🏗️ System Architecture

### Application Structure

```
myholiday/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   │
│   ├── (traveller)/
│   │   ├── quiz/                  # Preference collection flow
│   │   ├── destinations/
│   │   │   ├── page.tsx           # Ranked recommendation results
│   │   │   └── [city]/            # Individual city detail page
│   │   ├── planner/               # AI chatbot itinerary interface
│   │   ├── my-plans/              # Saved itinerary dashboard
│   │   └── marketplace/
│   │       ├── new/               # Create a listing
│   │       └── [listingId]/       # View offers, accept, chat
│   │
│   ├── (guide)/
│   │   ├── register/              # Guide onboarding & document upload
│   │   ├── marketplace/           # Browse city listings
│   │   └── chat/[listingId]/      # Negotiate with traveller
│   │
│   ├── (admin)/
│   │   ├── users/                 # Account management
│   │   ├── verifications/         # Guide approval queue
│   │   ├── marketplace/           # Listing moderation
│   │   └── reports/               # Analytics dashboard
│   │
│   └── api/
│       ├── recommendation/        # Preference matching & scoring logic
│       ├── chat/                  # LLM proxy — AI itinerary generation
│       └── marketplace/           # Listing and offer CRUD
│
├── components/                    # Shared UI components
├── lib/
│   ├── supabase/                  # Supabase client (server & browser)
│   └── ai/                        # LLM client & system prompt templates
└── supabase/
    └── migrations/                # Database schema migrations
```

### Request Flow

```
Browser
  │
  ├─── Page Request ──► Next.js App Router (SSR/SSG)
  │                           │
  │                           ▼
  │                    Supabase (data fetch)
  │                           │```sql
-- ============================================================
-- MyHoliday — Consolidated Database Schema
-- Travel and Tourism Recommendation System
-- ============================================================

-- ── EXTENSIONS ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. DESTINATIONS
-- ============================================================
CREATE TABLE public.destinations (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    city                VARCHAR(100)  NOT NULL,
    country             VARCHAR(100)  NOT NULL,
    region              VARCHAR(100),
    short_description   TEXT,
    latitude            FLOAT,
    longitude           FLOAT,
    avg_temp_monthly    JSONB,
    ideal_durations     JSONB,
    budget_level        VARCHAR(20)   CHECK (budget_level IN ('Budget', 'Mid-range', 'Luxury')),
    culture             SMALLINT      CHECK (culture    BETWEEN 0 AND 5),
    adventure           SMALLINT      CHECK (adventure  BETWEEN 0 AND 5),
    nature              SMALLINT      CHECK (nature     BETWEEN 0 AND 5),
    beaches             SMALLINT      CHECK (beaches    BETWEEN 0 AND 5),
    nightlife           SMALLINT      CHECK (nightlife  BETWEEN 0 AND 5),
    cuisine             SMALLINT      CHECK (cuisine    BETWEEN 0 AND 5),
    wellness            SMALLINT      CHECK (wellness   BETWEEN 0 AND 5),
    urban               SMALLINT      CHECK (urban      BETWEEN 0 AND 5),
    seclusion           SMALLINT      CHECK (seclusion  BETWEEN 0 AND 5),
    categories          TEXT,
    best_time_to_visit  TEXT
);

-- ============================================================
-- 2. TRAVELLER PROFILES (Linked to auth.users)
-- ============================================================
CREATE TABLE public.traveller_profiles (
    id                      UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID          NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name               VARCHAR(150),
    age                     INTEGER,
    nationality             VARCHAR(100),
    dietary_restrictions    VARCHAR(100),
    accessibility_needs     BOOLEAN       DEFAULT FALSE,
    preferred_language      VARCHAR(50)   DEFAULT 'English',
    created_at              TIMESTAMP     DEFAULT NOW()
);

-- ============================================================
-- 3. TOUR_GUIDES (Linked to auth.users)
-- ============================================================
CREATE TABLE public.tour_guides (
    id                      UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID          NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name               VARCHAR(150),
    city_id                 UUID          REFERENCES public.destinations(id) ON DELETE SET NULL,
    document_url            VARCHAR(500),
    verification_status     VARCHAR(20)   NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    created_at              TIMESTAMP     DEFAULT NOW()
);

-- ============================================================
-- 4. CHAT_SESSIONS
-- ============================================================
CREATE TABLE public.chat_sessions (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    destination_id  UUID        NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    planner_state   JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMP   DEFAULT NOW()
);

-- ============================================================
-- 5. CHAT_MESSAGES
-- ============================================================
CREATE TABLE public.chat_messages (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id  UUID        NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT        NOT NULL,
    created_at  TIMESTAMP   DEFAULT NOW()
);

-- ============================================================
-- 6. ITINERARIES
-- ============================================================
CREATE TABLE public.itineraries (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    destination_id  UUID         NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
    session_id      UUID         REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    content         JSONB        NOT NULL,
    created_at      TIMESTAMP    DEFAULT NOW(),
    updated_at      TIMESTAMP    DEFAULT NOW()
);

-- ============================================================
-- 7. MARKETPLACE_LISTINGS
-- ============================================================
CREATE TABLE public.marketplace_listings (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    itinerary_id    UUID          NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
    destination_id  UUID          NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
    desired_budget  NUMERIC(10,2),
    status          VARCHAR(20)   NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'negotiating', 'confirmed', 'closed')),
    created_at      TIMESTAMP     DEFAULT NOW()
);

-- ============================================================
-- 8. MARKETPLACE_OFFERS
-- ============================================================
CREATE TABLE public.marketplace_offers (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id      UUID          NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
    guide_id        UUID          NOT NULL REFERENCES public.tour_guides(id) ON DELETE CASCADE,
    proposed_price  NUMERIC(10,2) NOT NULL,
    status          VARCHAR(20)   NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    created_at      TIMESTAMP     DEFAULT NOW()
);

-- ============================================================
-- 9. MARKETPLACE_MESSAGES
-- ============================================================
CREATE TABLE public.marketplace_messages (
    id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id  UUID          NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
    sender_type VARCHAR(20)   NOT NULL CHECK (sender_type IN ('traveler', 'guide')),
    sender_id   UUID          NOT NULL,
    content     TEXT          NOT NULL,
    created_at  TIMESTAMP     DEFAULT NOW()
);

-- ============================================================
-- 10. TRANSACTIONS
-- ============================================================
CREATE TABLE public.transactions (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id            UUID          NOT NULL REFERENCES marketplace_offers(id) ON DELETE RESTRICT,
    payer_id            UUID          NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    payee_id            UUID          NOT NULL REFERENCES public.tour_guides(id) ON DELETE RESTRICT,
    total_amount        NUMERIC(10,2) NOT NULL,
    service_charge      NUMERIC(10,2) NOT NULL DEFAULT 0,
    guide_payout        NUMERIC(10,2) NOT NULL,
    status              VARCHAR(20)   NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded')),
    payment_reference   VARCHAR(100)  UNIQUE,
    created_at          TIMESTAMP     DEFAULT NOW(),
    CONSTRAINT payout_check CHECK (guide_payout = total_amount - service_charge)
);

-- ============================================================
-- 11. HISTORICAL_TRIPS (ML Dataset)
-- ============================================================
CREATE TABLE public.historical_trips (
    id                      SERIAL        PRIMARY KEY,
    destination             VARCHAR(150),
    duration_days           FLOAT,
    traveler_age            FLOAT,
    traveler_gender         VARCHAR(20),
    traveler_nationality    VARCHAR(100),
    accommodation_type      VARCHAR(50),
    accommodation_cost      NUMERIC(10,2),
    transportation_type     VARCHAR(50),
    transportation_cost     NUMERIC(10,2)
);

-- ============================================================
-- 12. USER_INTERACTIONS
-- ============================================================
CREATE TABLE public.user_interactions (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
    destination_id  UUID        REFERENCES public.destinations(id) ON DELETE CASCADE,
    type            TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```


---

## 🔐 Environment Variables

```env
# ── Supabase ──────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=           # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Public anon key (safe for browser)
SUPABASE_SERVICE_ROLE_KEY=          # Service role key (server-side only, never expose)

# ── AI Chatbot (choose one) ───────────────────────
OPENAI_API_KEY=                     # OpenAI API key
# or
GEMINI_API_KEY=                     # Google Gemini API key

# ── App ───────────────────────────────────────────
NEXT_PUBLIC_APP_URL=                # e.g. https://myholiday.vercel.app
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` and AI API keys must **never** be exposed to the browser. These are used only inside Next.js API routes which run server-side.

---

## ⚠️ Scope & Limitations

### What MyHoliday Does Not Do

| Limitation | Detail |
|---|---|
| **No real payment processing** | The platform handle mock financial transactions |
| **No real bookings** | Hotel and transport links redirect to third-party platforms — no in-app booking |
| **Simulated guide verification** | Document review is performed by the admin within the system; not validated by actual licensing authorities |
| **Static destination data** | The recommendation engine uses a predefined dataset, not live travel APIs or real-time pricing |
| **No mobile app** | MyHoliday is web-only — no iOS or Android application |
| **English only** | The UI is English only; user language preference is recorded in the profile for AI personalisation purposes but does not change the UI language |
| **No service guarantees** | MyHoliday does not mediate or guarantee the quality of service between travellers and tour guides post-booking |

---

## 👥 Team

| Name |
|---|
| Laeu Zi-Li |
| Low Ze Xuan |
| Heng Ee Sern |
| Tan Hao Shuan |
| Muhammad Farris Bin Razman |
| Soo Jian Wen |

> **Course:** AAPP011-4-2 Capstone Project
> **Institution:** Asia Pacific University of Technology & Innovation
> **Intake:** UCDF2407ICT(DI) | 032026
