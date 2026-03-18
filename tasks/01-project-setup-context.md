# Feature: Project Setup

## Overview

Initialize the MyHoliday Next.js project with all foundational configuration. This is the first task — nothing else can start until this is complete.

MyHoliday is a travel & tourism recommendation system: a web platform that takes users from "I don't know where to go" to "my trip is planned and my local guide is confirmed." It has three user roles: Traveller, Tour Guide, and Administrator.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth |
| AI Chatbot | OpenAI API / Gemini API |
| File Storage | Supabase Storage |
| Deployment | Vercel |
| Styling | Tailwind CSS |
| Fonts | Funnel Display (headings), Noto Serif (body) |

---

## Folder Structure

```
myholiday/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (traveller)/
│   │   ├── quiz/
│   │   ├── destinations/
│   │   │   ├── page.tsx
│   │   │   └── [city]/
│   │   ├── planner/
│   │   ├── my-plans/
│   │   └── marketplace/
│   │       ├── new/
│   │       └── [listingId]/
│   ├── (guide)/
│   │   ├── register/
│   │   ├── marketplace/
│   │   └── chat/[listingId]/
│   ├── (admin)/
│   │   ├── users/
│   │   ├── verifications/
│   │   ├── marketplace/
│   │   └── reports/
│   └── api/
│       ├── recommendation/
│       ├── chat/
│       └── marketplace/
├── components/
│   └── ui/
├── lib/
│   ├── supabase/
│   └── ai/
└── supabase/
    └── migrations/
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=           # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Public anon key (safe for browser)
SUPABASE_SERVICE_ROLE_KEY=          # Service role key (server-side only, never expose)

# AI Chatbot (choose one)
OPENAI_API_KEY=                     # OpenAI API key
# or
GEMINI_API_KEY=                     # Google Gemini API key

# App
NEXT_PUBLIC_APP_URL=                # e.g. https://myholiday.vercel.app
```

> `SUPABASE_SERVICE_ROLE_KEY` and AI API keys must never be exposed to the browser. These are used only inside Next.js API routes which run server-side.

---

## Tailwind Configuration

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        charcoal:  '#1A1A1A',
        warmwhite: '#FAF9F7',
        amber:     '#C4874A',
        amberdark: '#8B6A3E',
        border:    '#EBEBEB',
        subtle:    '#F5F2EE',
        muted:     '#F0EBE3',
        secondary: '#666666',
        tertiary:  '#999999',
        disabled:  '#AAAAAA',
        success: { DEFAULT: '#059669', bg: '#ECFDF5' },
        warning: { DEFAULT: '#D97706', bg: '#FEF3C7' },
        error:   { DEFAULT: '#DC2626', bg: '#FEF2F2' },
      },
      fontFamily: {
        display: ['Funnel Display', 'sans-serif'],
        body:    ['Noto Serif', 'serif'],
      },
    },
  },
}
```

---

## Global CSS

```css
/* globals.css */
@import url('https://fonts.googleapis.com/css2?family=Funnel+Display:wght@800&family=Noto+Serif:ital,wght@0,400;0,600;1,400&display=swap');

body {
  font-family: 'Noto Serif', serif;
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Funnel Display', sans-serif;
  font-weight: 800;
}

.italic-accent {
  font-family: 'Noto Serif', serif;
  font-style: italic;
  color: #C4874A;
}
```

---

## Supabase Client Setup

Create two Supabase clients in `lib/supabase/`:

1. **Browser client** (`client.ts`) — uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. **Server client** (`server.ts`) — uses `SUPABASE_SERVICE_ROLE_KEY` for server-side operations (API routes, server components)

---

## Database Schema (Full)

```sql
-- Core user accounts (managed by Supabase Auth)
users
  id, email, role, created_at

-- Traveller profile details
traveller_profiles
  id, user_id, full_name, age, nationality,
  dietary_restrictions, accessibility_needs, preferred_language

-- Tour guide profiles
tour_guides
  id, user_id, full_name, assigned_city,
  verification_status, created_at

-- Guide uploaded documents (stored in Supabase Storage)
guide_documents
  id, guide_id, file_url, document_type, uploaded_at

-- Destination dataset
destinations
  id, name, country, description, estimated_cost,
  climate_tags, style_tags, budget_range, image_url

-- AI-generated saved itineraries
itineraries
  id, user_id, destination_id, title,
  plan_content (JSON), created_at, updated_at

-- Marketplace listings
marketplace_listings
  id, itinerary_id, traveller_id, destination_id,
  budget, status (open/closed), created_at

-- Tour guide proposals on listings
offers
  id, listing_id, guide_id, quoted_price,
  status (pending/accepted/rejected), created_at

-- In-platform messages between traveller and guide
messages
  id, listing_id, sender_id, content, sent_at
```

---

## Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Page files | lowercase | `page.jsx` |
| Component files | PascalCase | `DestinationCard.jsx` |
| Utility files | camelCase | `formatCurrency.js` |
| API route files | lowercase | `route.js` |
| Folders | lowercase with hyphens | `my-plans/`, `auth/` |
| Variables | camelCase | `listingData` |
| Functions/handlers | camelCase | `handleSubmit()` |
| React components | PascalCase | `ListingCard` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| API endpoints | kebab-case | `/api/marketplace-listings` |
| Database columns | snake_case | `created_at`, `user_id` |

---

## CSS Rules

- Never write inline `style={{}}`
- Never create a separate `.css` file for a component
- Never use arbitrary Tailwind values like `w-[347px]`
- Always use named colour tokens — never hardcode hex values
