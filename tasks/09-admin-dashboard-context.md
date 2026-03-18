# Feature: Admin Dashboard

## Overview

The admin dashboard gives platform administrators full visibility and control over MyHoliday's operations: user management, tour guide verification, marketplace moderation, and analytics/reports.

**Dependencies:** Requires `01-project-setup` (Supabase client), `02-ui-components` (Button, PageHeader, Badge, Modal, Avatar, Spinner), `04-auth` (admin role authentication).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | Supabase (PostgreSQL) with service role key for admin operations |
| Styling | Tailwind CSS with custom tokens |

---

## Route Ownership

| Page | Route | Owner |
|---|---|---|
| Dashboard & Reports | `app/dashboard/page.jsx` | HS |

### Admin Route Group
```
app/(admin)/
├── users/              # Account management
├── verifications/      # Guide approval queue
├── marketplace/        # Listing moderation
└── reports/            # Analytics dashboard
```

---

## Design Tokens (Quick Reference)

### Colours
- Charcoal `charcoal` — primary text, table headers
- Warm White `warmwhite` — page background
- Amber `amber` — accent, pending states
- Success `success` / `success-bg` — approved, confirmed
- Warning `warning` / `warning-bg` — pending verification
- Error `error` / `error-bg` — rejected, suspended
- Border `border` — table borders, dividers
- Subtle `subtle` — alternate row backgrounds
- Secondary `secondary` — descriptions

### Grid Layout
- Admin stats row: `grid-cols-2 lg:grid-cols-4`

### Typography
- Section heading: `text-4xl font-extrabold font-display`
- Card heading: `text-xl font-semibold font-body`
- Body: `text-sm font-normal font-body`
- UI label: `text-xs font-semibold font-body`

---

## Database Schema (All Tables — Admin Has Full Access)

```sql
-- Core user accounts
users
  id, email, role, created_at

-- Traveller profiles
traveller_profiles
  id, user_id, full_name, age, nationality,
  dietary_restrictions, accessibility_needs, preferred_language

-- Tour guide profiles
tour_guides
  id, user_id, full_name, assigned_city,
  verification_status, created_at

-- Guide documents
guide_documents
  id, guide_id, file_url, document_type, uploaded_at

-- Destinations
destinations
  id, name, country, description, estimated_cost,
  climate_tags, style_tags, budget_range, image_url

-- Itineraries
itineraries
  id, user_id, destination_id, title,
  plan_content (JSON), created_at, updated_at

-- Marketplace listings
marketplace_listings
  id, itinerary_id, traveller_id, destination_id,
  budget, status (open/closed), created_at

-- Offers
offers
  id, listing_id, guide_id, quoted_price,
  status (pending/accepted/rejected), created_at

-- Messages
messages
  id, listing_id, sender_id, content, sent_at
```

---

## Admin Modules

### 1. User Management (`/admin/users`)

- View all registered traveller and tour guide accounts in a table
- Table columns: name, email, role, registration date, status
- Actions per user:
  - View profile details
  - Suspend account (disable login)
  - Reactivate suspended account
  - Delete account (with confirmation modal)
- Filter by role (traveller / guide / all)
- Search by name or email

### 2. Tour Guide Verification (`/admin/verifications`)

- View queue of guides with `verification_status: 'pending'`
- For each pending guide, display:
  - Guide name, email, assigned city
  - Uploaded documents (licence, identification) — view/download from Supabase Storage
- Actions:
  - **Approve** — sets `verification_status: 'approved'`, guide can now access marketplace
  - **Reject** — sets `verification_status: 'rejected'`, guide cannot access marketplace
- Also show previously approved and rejected guides for reference

### 3. Marketplace Moderation (`/admin/marketplace`)

- View all active marketplace listings across all cities
- Table/card view showing: traveller name, destination, budget, status, number of offers, date posted
- Actions:
  - View listing detail (full itinerary)
  - Remove listing (with reason — flags inappropriate content)
  - Flag listing for review

### 4. Analytics & Reports (`/admin/reports` or `/dashboard`)

Descriptive statistics from the platform database:

| Metric | Description |
|---|---|
| Popular Destinations | Which cities are most frequently selected by travellers |
| Itineraries Generated | Total count of AI-generated plans over time |
| Marketplace Activity | Number of active listings, offers submitted, bookings confirmed |
| User Demographics | Basic breakdown of user nationalities, group sizes, travel styles |

- Display as stat cards in a grid: `grid-cols-2 lg:grid-cols-4`
- Include simple charts or tables for trends (e.g., top 5 destinations, monthly itinerary count)
- All data is aggregated from existing tables — no external analytics service needed

---

## Access Control

- Only users with `role: 'admin'` can access the admin route group
- Admin routes should use the Supabase service role key for operations that bypass RLS (e.g., viewing all users, modifying any account)
- Never expose the service role key to the client — all admin API calls should go through server-side API routes or server components

---

## Components Used (from `@/components/ui/`)

- `Button` — approve, reject, suspend, delete, filter actions
- `PageHeader` — section titles
- `Badge` — role badges, verification status
- `Modal` — confirmation dialogs (delete account, remove listing)
- `Avatar` — user profile display in tables
- `Spinner` — loading states
- `StatusBadge` — marketplace listing statuses

---

## CSS Rules

- Never write inline `style={{}}`
- Never use arbitrary Tailwind values like `w-[347px]`
- Always use named colour tokens — never hardcode hex values
