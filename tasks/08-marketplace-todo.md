# Todo: Marketplace
**Module owners:** FR (frontend) · HS (backend/data)

---

## Context

The marketplace connects travellers with verified local tour guides. Travellers publish a saved itinerary as a listing with a desired budget. Guides browse listings scoped to their registered city, submit price proposals, and negotiate via in-platform chat. The traveller accepts an offer to confirm a booking and create a transaction record.

**Relevant tables:** `marketplace_listings`, `marketplace_offers`, `marketplace_messages`, `transactions`
**Depends on:** Auth module (user session + role), Itinerary Management module (itineraries to post)

### Critical Column and Value Reference
```
marketplace_listings.desired_budget     ← NOT "budget"
marketplace_listings.status             ← 'open' | 'negotiating' | 'confirmed' | 'closed'
marketplace_offers.status               ← 'pending' | 'accepted' | 'rejected' | 'withdrawn'
marketplace_messages.sender_type        ← 'traveler' | 'guide'
marketplace_messages.sender_id          ← NOT a FK — polymorphic UUID
tour_guides.city_id                     ← FK to destinations — NOT "assigned_city"
transactions.guide_payout               ← MUST equal total_amount - service_charge
transactions (ON DELETE)                ← RESTRICT — handle gracefully, do not crash
```

### Status Derivation (frontend only)
The DB stores `'open'` for both "no offers yet" and "offers received" states.
FR must derive the display status in the frontend:
```js
function getDisplayStatus(dbStatus, offerCount) {
  if (dbStatus === 'open' && offerCount === 0) return 'awaiting'
  if (dbStatus === 'open' && offerCount > 0)  return 'has_offers'
  return dbStatus  // 'negotiating', 'confirmed', 'closed' pass through unchanged
}
```
Always pass `displayStatus` to `StatusBadge` — never the raw DB value.

---

---

## HS — Backend / Data

### API Routes

#### Listings
- [ ] Create `app/api/marketplace/listings/route.js`
- [ ] `POST` — insert new row into `marketplace_listings` with `user_id`, `itinerary_id`, `destination_id`, `desired_budget`, initial `status = 'open'` — return created listing object
- [ ] `GET` — fetch listings — if `?destination_id=` param present, filter by destination for guide view — JOIN `destinations` to return city name — return derived `offer_count` per listing so FR does not need a second request

#### Listing Detail
- [ ] Create `app/api/marketplace/listings/[id]/route.js`
- [ ] `GET` — fetch single listing by ID — JOIN `destinations` for city name, JOIN `users` for traveller name — return `offer_count` as derived field
- [ ] `PATCH` — update listing `status` — validate new value is one of `'open'`, `'negotiating'`, `'confirmed'`, `'closed'` before writing

#### Offers
- [ ] Create `app/api/marketplace/offers/route.js`
- [ ] `POST` — insert into `marketplace_offers` with `listing_id`, `guide_id`, `proposed_price`, initial `status = 'pending'` — return created offer object

- [ ] Create `app/api/marketplace/offers/[listingId]/route.js`
- [ ] `GET` — fetch all offers for a listing — JOIN `tour_guides` to return guide name and city — return `proposed_price` formatted to 2 decimal places

- [ ] Create `app/api/marketplace/offers/[id]/route.js`
- [ ] `PATCH` — update offer status to `'accepted'`, `'rejected'`, or `'withdrawn'` — if set to `'accepted'`, automatically set all other offers on the same listing to `'rejected'`

#### Messages
- [ ] Create `app/api/marketplace/messages/route.js`
- [ ] `POST` — insert into `marketplace_messages` with `listing_id`, `sender_id`, `sender_type`, `content` — do NOT validate `sender_id` as a FK, this is intentional (polymorphic design)

- [ ] Create `app/api/marketplace/messages/[listingId]/route.js`
- [ ] `GET` — fetch all messages for a listing ordered by `created_at` ASC — always return `sender_type` alongside each message so FR knows which table to query for name/avatar

#### Transactions
- [ ] Create `app/api/marketplace/transactions/route.js`
- [ ] `POST` — insert into `transactions` with `offer_id`, `payer_id`, `payee_id`, `total_amount`, `service_charge`, `guide_payout`, `payment_reference`
- [ ] Before inserting, validate at application level: `guide_payout === total_amount - service_charge` — reject with 400 if mismatch
- [ ] Set initial `status = 'pending'`
- [ ] After successful insert, automatically update the parent listing status to `'confirmed'`
- [ ] Handle RESTRICT violations cleanly — return `{ error: 'Cannot remove record linked to a completed transaction' }` with status 409 — do not let it throw a 500

### Database Indexes (already created — verify they exist)
- [ ] `idx_listings_user` on `marketplace_listings.user_id`
- [ ] `idx_listings_dest` on `marketplace_listings.destination_id`
- [ ] `idx_listings_status` on `marketplace_listings.status`
- [ ] `idx_offers_listing` on `marketplace_offers.listing_id`
- [ ] `idx_offers_guide` on `marketplace_offers.guide_id`
- [ ] `idx_messages_listing` on `marketplace_messages.listing_id`
- [ ] `idx_transactions_offer` on `transactions.offer_id`
- [ ] `idx_transactions_payer` on `transactions.payer_id`

### RLS Policies
- [ ] `marketplace_listings` — travellers can only SELECT/INSERT/UPDATE/DELETE their own rows (`user_id = auth.uid()`)
- [ ] `marketplace_listings` — guides can SELECT listings where `destination_id = (SELECT city_id FROM tour_guides WHERE id = auth.uid())`
- [ ] `marketplace_offers` — guides can INSERT and SELECT only their own offers (`guide_id = auth.uid()`)
- [ ] `marketplace_offers` — travellers can SELECT all offers on their own listings and UPDATE offer status
- [ ] `marketplace_messages` — scoped to listing participants only: the listing owner (traveller) and guides who have an offer on that listing
- [ ] `transactions` — travellers can INSERT and SELECT their own transactions (`payer_id = auth.uid()`)
- [ ] Test: cross-user access to another traveller's listing returns empty — not an error
- [ ] Test: guide in City A cannot see listings for City B
- [ ] Test: guide cannot submit two offers on the same listing

### Admin Dashboard Statistics (Week 10)
- [ ] Create `app/api/dashboard/marketplace/route.js`
- [ ] `GET` — return: total active listings grouped by destination city, confirmed bookings per month, transaction volume (`SUM(total_amount)`) per month, top 5 guides by number of accepted offers
- [ ] Coordinate with dashboard page on exact JSON shape needed for Recharts

### Documentation
- [ ] Write ERD entries for all four marketplace tables — `marketplace_listings`, `marketplace_offers`, `marketplace_messages`, `transactions` — all columns, types, PKs, FKs, CHECK constraints, CASCADE/RESTRICT behaviours
- [ ] Write Data Dictionary entries for all columns in all four tables
- [ ] Update `schema.sql` in GitHub to reflect final production state

### Testing
- [ ] Unit test all API routes — success case and failure case for each
- [ ] Test RESTRICT constraint on transactions — verify graceful error response, not a crash
- [ ] Test polymorphic message sender — messages from both `'traveler'` and `'guide'` sender types insert and retrieve correctly
- [ ] Document all test cases and results in the Test Plan

---

---

## FR — Frontend / UI

### Preparation (Week 7 — before building pages)
- [ ] Confirm with HS the exact JSON response shape for every route before building pages
- [ ] Confirm with ES (city detail + itinerary module) how saved itineraries are returned from `GET /api/itinerary/my-plans` so the listing creation dropdown is correct
- [ ] Review `ListingCard` and `StatusBadge` from ZX — confirm props align with listing data shape from HS

### Create Listing Page
- [ ] Create `app/marketplace/new/page.jsx`
- [ ] Protect route — redirect to `/auth/login` if no session, redirect to `/` if guide role
- [ ] Check for `?itinerary_id=` URL param — if present, pre-select that itinerary in the dropdown
- [ ] Fetch user's saved itineraries: `GET /api/itinerary/my-plans` — populate `Select` dropdown with itinerary titles, value = itinerary UUID
- [ ] If no saved itineraries exist: show message "You need to save an itinerary first." + `Button` "Create an Itinerary" → `/itinerary` — do not show the form
- [ ] Use `ListingForm.jsx` from `components/sections/` (built by ZX)
- [ ] Form fields: itinerary `Select`, `Input` for `desired_budget` (type="number", MYR) — field name must be `desired_budget` in submit payload
- [ ] Auto-populate read-only destination city from the selected itinerary
- [ ] On submit: `POST /api/marketplace/listings` with `{ itinerary_id, destination_id, desired_budget }`
- [ ] Initial status is set by HS's API — do not pass `status` from the frontend
- [ ] On success: redirect to `/marketplace/[newListingId]`
- [ ] On error: show error message below the form using `error` colour token
- [ ] Show `Spinner` on submit button while POST is in progress

### Traveller Listing Board
- [ ] Create `app/marketplace/page.jsx` — render different content based on user role
- [ ] Protect route — redirect to `/auth/login` if no session
- [ ] Traveller view: `PageHeader` tag "Marketplace", title "Your Listings" + primary `Button` "Post New Itinerary" → `/marketplace/new`
- [ ] Fetch traveller's listings: `GET /api/marketplace/listings`
- [ ] Render each listing as `ListingCard` — pass `desiredBudget={listing.desired_budget}`
- [ ] Derive `displayStatus` using `getDisplayStatus(listing.status, listing.offer_count)` — pass to `ListingCard` which passes it to `StatusBadge`
- [ ] Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- [ ] Each card links to `/marketplace/[id]`
- [ ] Empty state: "You haven't posted any listings yet." + `Button` "Post Your First Itinerary"
- [ ] Show `Spinner` while loading
- [ ] Guide view: `PageHeader` tag "Marketplace", title "Browse Listings"
- [ ] If guide `verification_status !== 'approved'`: show "Your account is pending verification." — no listings shown
- [ ] Destination filter `Select` — default to guide's registered city
- [ ] Fetch: `GET /api/marketplace/listings?destination_id=[guide.city_id]`
- [ ] Only show listings with `status = 'open'`
- [ ] Empty state: "No open listings in your city right now."

### Traveller Listing Detail
- [ ] Create `app/marketplace/[id]/page.jsx`
- [ ] Fetch listing: `GET /api/marketplace/listings/[id]`
- [ ] Protect route — traveller view only accessible to listing owner, guide view only to verified guides
- [ ] Display: city, duration, group size, `desired_budget` as "Budget: RM X,XXX"
- [ ] Display `StatusBadge` using derived `displayStatus`
- [ ] Itinerary summary: collapsed — show first 2 days, "Expand full itinerary" toggle
- [ ] Fetch offers: `GET /api/marketplace/offers/[listingId]`
- [ ] For each offer display: `Avatar` + guide name + city + proposed price + offer `StatusBadge`
- [ ] "Accept" primary `Button` — opens `Modal` confirmation before proceeding
- [ ] "Reject" ghost `Button` — calls `PATCH /api/marketplace/offers/[offerId]` with `{ status: 'rejected' }`
- [ ] On accept confirmed (3 sequential API calls):
  - `PATCH /api/marketplace/offers/[offerId]` → `{ status: 'accepted' }`
  - `PATCH /api/marketplace/listings/[id]` → `{ status: 'confirmed' }`
  - `POST /api/marketplace/transactions` → `{ offer_id, payer_id: user.id, payee_id: guide.id, total_amount: offer.proposed_price, service_charge: 0, guide_payout: offer.proposed_price, payment_reference: crypto.randomUUID() }`
  - Validate before sending: `guide_payout === total_amount - service_charge`
  - On success: show booking confirmation panel
- [ ] If `status = 'confirmed'`, show booking confirmation banner with summary (city, guide name, total amount, `payment_reference`)
- [ ] Offer panel empty state: "Awaiting offers from guides..."
- [ ] Handle RESTRICT error (409 from HS's API): show "This record cannot be removed as it is linked to a completed booking." — do not crash
- [ ] Show `Spinner` while fetching

### Guide Listing Detail
- [ ] On same `app/marketplace/[id]/page.jsx`, render guide view when logged-in user is a tour guide
- [ ] Show same listing header and itinerary summary
- [ ] Check if guide has already submitted an offer on this listing (from offers list)
- [ ] If no offer yet: show `Input` "Your Proposed Price (MYR)" + primary `Button` "Submit Offer"
  - On submit: `POST /api/marketplace/offers` with `{ listing_id, guide_id: guide.id, proposed_price }`
  - On success: replace form with read-only offer display
- [ ] If offer exists: show read-only offer (price + status) + ghost `Button` "Withdraw Offer"
  - On withdraw: `PATCH /api/marketplace/offers/[offerId]` with `{ status: 'withdrawn' }`
- [ ] Prevent showing submit form if offer already exists — check before rendering

### Chat UI (Both Roles — within listing detail page)
- [ ] Fetch thread: `GET /api/marketplace/messages/[listingId]`
- [ ] Use `ChatWindow.jsx` from `components/sections/` (built by ZX) — do not build custom chat UI
- [ ] Traveller messages: right-aligned, `bg-charcoal text-warmwhite`
- [ ] Guide messages: left-aligned, `bg-muted text-charcoal`
- [ ] Use `sender_type` to determine alignment and `Avatar` display per message
- [ ] `sender_id` is polymorphic: if `sender_type === 'traveler'` query name from `users`; if `'guide'` query from `tour_guides`
- [ ] `Input` + primary `Button` "Send"
- [ ] On send: `POST /api/marketplace/messages` with `{ listing_id, sender_id: currentUser.id, sender_type: role, content }`
- [ ] On traveller's first message: also call `PATCH /api/marketplace/listings/[id]` → `{ status: 'negotiating' }`
- [ ] Auto-scroll to newest message on load and on new message received
- [ ] Show `Spinner` while initial thread loads

### Screen Designs and Documentation (Week 6)
- [ ] Produce wireframes for all marketplace screens: listing board (traveller view), listing board (guide view), create listing form, listing detail with offers (traveller view), listing detail with offer form (guide view), chat, booking confirmation panel
- [ ] Review wireframes with ZX for visual consistency before Week 7
- [ ] Produce final high-fidelity screen designs for all screens
- [ ] Write Screen Design and User Manual entries — one per screen: screenshot + description + step-by-step user instructions

### Integration and Polish (Week 9–10)
- [ ] Replace all placeholder/hardcoded data with live API calls
- [ ] Add `Spinner` for every API call in progress
- [ ] Add error state message for every failed API call
- [ ] Verify all form field names match HS's expected request body exactly
- [ ] Verify budget always displays as "RM X,XXX" format throughout all marketplace screens
- [ ] Run full end-to-end flow with HS: create listing → guide submits offer → traveller accepts → transaction created → booking confirmed

### Testing (Week 11)
- [ ] Unit test all marketplace frontend flows — create listing, submit offer, accept offer, reject offer, send message, withdraw offer, confirm booking
- [ ] Document all test cases and results in the Test Plan
- [ ] Take final screenshots of all marketplace screens for Screen Design documentation
- [ ] Verify status labels are correct per role at each stage of the lifecycle
- [ ] Verify budget displays as "RM X,XXX" format
- [ ] Verify guide cannot see offer form if they already submitted
- [ ] Verify traveller cannot see submit form — only offers panel

---

---

## Shared — Both FR and HS

### Handoff 1 — End of Week 6
- [ ] HS shares final schema for all four marketplace tables with FR
- [ ] FR confirms all form fields (`desired_budget`, `itinerary_id`, `destination_id`) are accounted for in ListingForm
- [ ] Both agree on exact JSON response shape for every API route

### Handoff 2 — End of Week 8
- [ ] HS shares all API route URLs and example JSON responses
- [ ] FR begins connecting frontend pages to live routes

### Handoff 3 — Week 9
- [ ] Run full flow together: traveller creates listing → guide submits offer → traveller accepts → transaction created → booking confirmed
- [ ] Verify real-time updates work correctly for both sides
- [ ] Verify status labels are correct at every stage for both roles
