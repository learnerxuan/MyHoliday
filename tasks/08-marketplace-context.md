# Feature: Marketplace

## Overview

The marketplace connects travellers with verified local tour guides. Travellers publish their finalised itinerary as a listing with a budget. Guides in the matching city can browse listings, submit proposals with quoted prices, and negotiate via real-time in-platform chat. This is the final step in the MyHoliday journey.

**Dependencies:** Requires `01-project-setup` (Supabase client with Realtime), `02-ui-components` (Button, ListingCard, StatusBadge, Badge, Input, PageHeader, Modal, Avatar, Spinner), `04-auth` (authentication, role checks), `07-itinerary-management` (itineraries to post).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | Supabase (PostgreSQL) with Realtime |
| Real-time Chat | Supabase Realtime (subscriptions on `messages` table) |
| Styling | Tailwind CSS with custom tokens |

---

## Route Ownership

| Page | Route | Owner |
|---|---|---|
| Listing Board | `app/marketplace/page.jsx` | JW |
| Listing Detail & Offers | `app/marketplace/[id]/page.jsx` | JW |

### Guide Routes
| Page | Route |
|---|---|
| Guide Marketplace | `app/(guide)/marketplace/page.jsx` |
| Guide Chat | `app/(guide)/chat/[listingId]/page.jsx` |

### API Route
- `app/api/marketplace/route.js` — Listing and offer CRUD

### Section Component
- ZX builds `ListingForm.jsx` in `components/sections/` for JW to use

---

## Design Tokens (Quick Reference)

### Colours
- Charcoal `charcoal` — primary text
- Warm White `warmwhite` — page background
- Amber `amber` — accent, offer badges
- Amber Dark `amberdark` — hover states
- Success `success` / `success-bg` — confirmed bookings
- Warning `warning` / `warning-bg` — pending states
- Error `error` — destructive actions
- Border `border` — card borders
- Secondary `secondary` — descriptions
- Muted `muted` — tags, badges

### Grid Layout
- Marketplace listings: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` with `gap-4`

---

## Database Schema (Relevant Tables)

```sql
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

-- Tour guide profiles (for displaying guide info on offers)
tour_guides
  id, user_id, full_name, assigned_city,
  verification_status, created_at

-- Destination dataset
destinations
  id, name, country, description, image_url
```

---

## Marketplace Status Lifecycle

| Status Value | Traveller Sees | Guide Sees | Colour |
|---|---|---|---|
| `awaiting` | Awaiting Offers | Open Listing | Grey |
| `has_offers` | X Offers Received | Your Offer Submitted | Amber |
| `negotiating` | Negotiating | In Negotiation | Blue |
| `confirmed` | Booking Confirmed | Booking Confirmed | Green |

```
Traveller posts itinerary   →  status: awaiting
Guide submits price offer   →  status: has_offers
Traveller opens chat        →  status: negotiating
Traveller accepts offer     →  status: confirmed
```

---

## Traveller Side

### Create Listing (`/marketplace/new`)
- Select a saved itinerary from My Plans
- Set a desired budget for the tour (MYR)
- Submit creates a row in `marketplace_listings` with `status: 'awaiting'`
- Uses `ListingForm.jsx` component (built by ZX)

### Listing Board (`/marketplace`)
- View all listings the traveller has posted
- Each listing displayed as a ListingCard showing: city, duration, group size, budget, tags, status, offer count
- Grid layout: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

### Listing Detail (`/marketplace/[id]`)
- View the full itinerary associated with the listing
- View all incoming offers from guides
- Each offer shows: guide name, profile, quoted price, status
- Actions per offer:
  - Open chat with the guide
  - Accept offer → status becomes `confirmed`
  - Reject offer

### Chat with Guide
- In-platform real-time messaging
- Built on Supabase Realtime subscriptions on the `messages` table
- Messages filtered by `listing_id`
- Both parties see messages instantly
- Chat allows negotiation, clarification, and agreement before committing

---

## Tour Guide Side

### Browse Listings (`/guide/marketplace`)
- Verified guides see all active marketplace listings within their registered city only
- City-scoped: guides only see listings for their `assigned_city`
- Each listing shows the traveller's full itinerary, budget, and trip details

### Submit Proposal
- Guide submits a service proposal with a custom quoted price
- Creates a row in `offers` table with `status: 'pending'`
- Listing status updates to `has_offers`

### Chat with Traveller (`/guide/chat/[listingId]`)
- Same real-time chat system as traveller side
- Guide can discuss trip details, ask questions, negotiate price

---

## Important Notes

- MyHoliday facilitates the connection and agreement between travellers and guides but **does not process payments** or guarantee service quality
- Budget is displayed in MYR format: "RM X,XXX"
- Guides **cannot** access the marketplace until their account is verified by admin
- Only use the four status values defined above — do not use "Offer sent" or any other labels

---

## Components Used (from `@/components/ui/`)

- `Button` — submit listing, submit offer, accept/reject, send message
- `ListingCard` — listing board cards
- `StatusBadge` — status on listing cards and detail
- `Badge` — tags on listings
- `Input` — budget field, message input, quote price
- `PageHeader` — page titles
- `Modal` — confirm accept/reject offer
- `Avatar` — guide profile in offers
- `Spinner` — loading states
- `ListingForm` (from `components/sections/`) — create listing form

---

## RLS Policies

- Travellers can only read/write their own marketplace listings
- Guides can read listings for their assigned city
- Guides can only create/read their own offers
- Travellers can read offers on their own listings
- Messages are scoped to listing participants (traveller + guide with an offer on that listing)

---

## CSS Rules

- Never write inline `style={{}}`
- Never use arbitrary Tailwind values like `w-[347px]`
- Always use named colour tokens — never hardcode hex values
