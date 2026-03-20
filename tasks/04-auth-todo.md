# Todo: Authentication & User Profile

## Decisions
- **Auth method:** Google OAuth only (no email/password, no forgot-password)
- **Schema:** `auth.users` managed by Supabase; app tables are `traveller_profiles` + `tour_guides`
- **Admin:** Seeded manually via Supabase Dashboard / SQL — no app-side creation flow

---

## Checklist

### Google Cloud Console Setup (One-time, done by any team member)
- [x] Create a project in [Google Cloud Console](https://console.cloud.google.com/)
- [x] Enable the **Google Identity** OAuth API
- [x] Create OAuth 2.0 credentials → copy **Client ID** and **Client Secret**
- [x] Add authorised redirect URI: `https://wdpnhtkgozigmphmwmnt.supabase.co/auth/v1/callback`
- [x] Add authorised JavaScript origin: `http://localhost:3000`

### Supabase Dashboard Setup (One-time)
- [x] Go to Authentication → Providers → Enable **Google**
- [x] Paste **Client ID** and **Client Secret** from Google Cloud Console
- [x] Copy the Supabase callback URL → paste it back into Google Console as an authorised redirect URI
- [ ] Create Storage bucket `guide-documents` (private, RLS-protected)

### Database Migration
- [x] Drop the `users` table (the one with `password_hash`) — replaced by `auth.users`
- [x] Create `traveller_profiles` table (`id`, `user_id REFERENCES auth.users`, `full_name`, `age`, `nationality`, `dietary_restrictions`, `accessibility_needs`, `preferred_language`, `created_at`)
- [x] Create `tour_guides` table (`id`, `user_id REFERENCES auth.users`, `full_name`, `city_id REFERENCES destinations`, `document_url`, `verification_status`, `created_at`)
- [x] Add RLS policies (see RLS section below)

### Admin Account (Seed manually — no UI needed)
- [ ] Create admin user in Supabase Auth → Authentication → Users → Add User
- [ ] Set metadata to `{ "role": "admin" }` via SQL:
  ```sql
  UPDATE auth.users SET raw_user_meta_data = '{"role": "admin"}' WHERE email = 'admin@myholiday.com';
  ```

### Login / Register Page (`app/auth/login/page.tsx`)
- [x] Create the page file
- [x] Add "Sign in with Google" Button (primary) → calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/auth/callback' } })`
- [x] Add "Register as Tour Guide with Google" Button (secondary) → same OAuth call with `redirectTo: '/auth/callback?intent=guide'`
- [x] Add a brief explainer: "New users will be guided through a quick setup after signing in"
- [x] Show `Spinner` while OAuth redirect is in progress

### Auth Callback Route (`app/auth/callback/route.ts`)
- [x] Create `app/auth/callback/route.ts`
- [x] Exchange the OAuth `code` for a Supabase session using `exchangeCodeForSession`
- [x] Read `intent` query param from the redirect URL
- [x] Check if a profile row already exists for this `user_id`:
  - No row + `intent === 'guide'` → redirect to `/auth/onboarding/guide`
  - No row + no intent → redirect to `/auth/onboarding/traveller`
  - Row exists → redirect to homepage (or guide marketplace / admin based on role)

### Traveller Onboarding (`app/auth/onboarding/traveller/page.tsx`)
- [x] Create the page file
- [x] Protect: if `traveller_profiles` row already exists → redirect to `/`
- [x] Pre-fill full name from Google (`user.user_metadata.full_name`)
- [x] Show form: full name, nationality (`Select`), dietary restrictions (`Input`), accessibility needs (checkbox), preferred language (`Select`)
- [x] On submit: `INSERT INTO traveller_profiles (...)` + `supabase.auth.updateUser({ data: { role: 'traveller' } })`
- [x] Redirect to homepage on success

### Guide Onboarding (`app/auth/onboarding/guide/page.tsx`)
- [x] Create the page file
- [x] Protect: if `tour_guides` row already exists → redirect to `/guide/marketplace`
- [x] Pre-fill full name from Google
- [x] Show form: full name, assigned city (`Select` — fetch all cities from `destinations` table), document upload (licence/ID)
- [x] Upload document to Supabase Storage bucket `guide-documents` → get public URL
- [x] On submit: `INSERT INTO tour_guides (...)` with `verification_status: 'pending'` + set `role: 'guide'` in metadata
- [x] Show confirmation: *"Your account is pending admin approval. We'll notify you once verified."*
- [x] Do NOT redirect to marketplace yet — guide cannot access it until approved

### User Profile Page (`app/profile/page.tsx`)
- [x] Create the page file
- [x] Protect route — redirect to `/auth/login` if not authenticated
- [x] Read role from `user.user_metadata.role`
- [x] **Traveller view:**
  - [x] Display `Avatar` with Google profile photo + full name
  - [x] Editable fields: full name, age, nationality, dietary restrictions, accessibility needs, preferred language
  - [x] "Save Changes" Button → `UPDATE traveller_profiles SET ... WHERE user_id = ...`
  - [x] Show success/error feedback after save
- [x] **Guide view:**
  - [x] Display `Avatar`, full name
  - [x] Assigned city — read-only text (no editing after registration)
  - [x] `StatusBadge` for verification status (`pending` / `approved` / `rejected`)
  - [x] Document re-upload section → replaces file in Supabase Storage + updates `document_url`

### Middleware (`middleware.ts` — project root)
- [x] Create `middleware.ts` at the project root (not inside `app/`)
- [x] Read Supabase session from cookies on every request
- [x] Unauthenticated users accessing protected routes → redirect to `/auth/login`
- [x] Role-based blocks:
  - [x] Travellers blocked from `/guide/*` and `/admin/*`
  - [x] Guides blocked from `/admin/*` and traveller-only routes (`/quiz`, `/planner`, `/my-plans`)
  - [x] Admins pass through all routes
- [x] Public routes (no auth required): `/`, `/auth/*`, `/destinations` (read-only view)

### Logout
- [x] Add logout function in Navbar → calls `supabase.auth.signOut()` → redirect to `/`
- [x] Show logout button only when session is active

### RLS Policies
- [ ] `traveller_profiles`: users can only read/update their own row
- [ ] `traveller_profiles`: admins can read all rows (needed for admin dashboard)
- [ ] `tour_guides`: guides can only read/update their own row
- [ ] `tour_guides`: admins can read all rows + update `verification_status`
- [ ] Supabase Storage `guide-documents` bucket: guide can upload/read own files; admins can read all
- [ ] Test: log in as traveller → confirm cannot read another user's profile row
- [ ] Test: log in as guide → confirm blocked from `/admin/*` routes

### Final Testing
- [ ] Test full OAuth flow: click → Google popup → redirect back → profile created → correct page
- [ ] Test returning user: re-login → skips onboarding → lands on correct page by role
- [ ] Test guide onboarding: city dropdown populated, doc upload works, pending badge shown
- [ ] Test middleware: unauthenticated user hitting `/my-plans` → redirected to login
- [ ] Test role cross-access: traveller URL-hacks to `/admin` → blocked
- [ ] Test logout: session cleared, redirected to homepage
- [ ] Verify no session leaks between browser tabs
