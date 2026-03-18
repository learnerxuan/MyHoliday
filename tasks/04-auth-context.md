# Feature: Authentication & User Profile

## Overview

Build the authentication flow (Login, Register, Forgot Password) and User Profile page using Supabase Auth. MyHoliday has three user roles: Traveller, Tour Guide, and Administrator. Access control is enforced via Supabase Row Level Security (RLS).

**Dependencies:** Requires `01-project-setup` (Supabase client) and `02-ui-components` (Button, Input, Select).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Auth | Supabase Auth (email/password) |
| Database | Supabase (PostgreSQL) with RLS |
| Styling | Tailwind CSS with custom tokens |

---

## Route Ownership

| Page | Route | Owner |
|---|---|---|
| Login | `app/auth/login/page.jsx` | ZL |
| Register | `app/auth/register/page.jsx` | ZL |
| Forgot Password | `app/auth/forgot-password/page.jsx` | ZL |
| User Profile | `app/profile/page.jsx` | ZL |

---

## Design Tokens (Quick Reference)

### Colours
- Charcoal `charcoal` — primary text, buttons
- Warm White `warmwhite` — page background
- Amber `amber` — accent, CTAs, active links
- Amber Dark `amberdark` — hover on amber elements
- Error `error` — form errors
- Error BG `error-bg` — error message background
- Border `border` — form field borders
- Secondary `secondary` — descriptions
- Tertiary `tertiary` — placeholders

### Typography
- Section heading: `text-4xl font-extrabold font-display`
- Body: `text-sm font-normal font-body`
- UI label: `text-xs font-semibold font-body`

### Spacing
- Section vertical padding: `py-20`
- Form field padding: `py-2.5 px-3.5`
- Button padding: `py-2 px-5`

---

## User Roles

| Role | Access |
|---|---|
| Traveller | Quiz, recommendations, city pages, AI planner, my plans, marketplace (post & accept) |
| Tour Guide | Marketplace browser (city-scoped), proposal submission, guide chat |
| Administrator | Full platform access — user management, guide verification, marketplace moderation, analytics |

---

## Database Schema (Relevant Tables)

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
```

---

## Authentication Flows

### Register (Traveller)
1. User fills in email, password, full name
2. Call Supabase Auth `signUp` with email/password
3. Set `role: 'traveller'` in user metadata
4. Create a row in `traveller_profiles` with the user_id
5. Redirect to profile page to complete optional fields

### Register (Tour Guide)
- Separate registration flow from traveller registration
- Collects: email, password, full name, assigned city
- Sets `role: 'guide'` in user metadata
- Creates a row in `tour_guides` with `verification_status: 'pending'`
- Guide must upload verification documents (licence/identification)
- Documents stored in Supabase Storage
- Guide cannot access marketplace until admin approves their account

### Login
1. Email + password form
2. Call Supabase Auth `signInWithPassword`
3. On success, redirect based on role:
   - Traveller → homepage or quiz
   - Guide → guide marketplace
   - Admin → admin dashboard
4. Show error message on failure

### Forgot Password
1. User enters email
2. Call Supabase Auth `resetPasswordForEmail`
3. Show confirmation message that reset email has been sent

### Logout
- Call Supabase Auth `signOut`
- Redirect to homepage

---

## User Profile Page

Accessible at `app/profile/page.jsx`. Requires authentication.

### Traveller Profile Fields
- Full name
- Age
- Nationality
- Dietary restrictions (free text)
- Accessibility needs (free text)
- Preferred language

These profile fields are used by the AI itinerary planner to personalise generated itineraries.

### Tour Guide Profile Fields
- Full name
- Assigned city (read-only after registration)
- Verification status (read-only — shown as badge)
- Upload/replace verification documents

---

## Session Management

- Use Supabase Auth session handling
- Persist session across page refreshes
- Protect routes: redirect unauthenticated users to login
- Role-based route protection: prevent travellers from accessing guide/admin routes and vice versa

---

## Components Used (from `@/components/ui/`)

- `Button` — form submit buttons, navigation
- `Input` — email, password, name, text fields
- `Select` — nationality, language dropdowns
- `PageHeader` — page titles
- `Spinner` — loading states
- `Avatar` — profile picture display
- `Badge` — verification status display

---

## CSS Rules

- Never write inline `style={{}}`
- Never create a separate `.css` file for a component
- Never use arbitrary Tailwind values like `w-[347px]`
- Always use named colour tokens — never hardcode hex values
