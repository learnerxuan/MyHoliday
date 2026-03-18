# Todo: Marketplace

## Checklist

### Marketplace API Route
- [ ] Create `app/api/marketplace/route.js`
- [ ] Implement POST: create a new marketplace listing (traveller only)
- [ ] Implement GET: fetch listings (traveller's own, or city-scoped for guides)
- [ ] Implement offer CRUD: create offer (guide), update offer status (traveller accepts/rejects)
- [ ] Validate that guides can only submit offers if their account is verified

### Create Listing Page
- [ ] Create `app/marketplace/new/page.jsx` (or integrate with ListingForm component)
- [ ] Protect route — require authenticated traveller role
- [ ] Fetch user's saved itineraries from `itineraries` table
- [ ] Let user select which itinerary to post
- [ ] Add budget input field (MYR currency)
- [ ] Use `ListingForm.jsx` component (built by ZX)
- [ ] On submit, create row in `marketplace_listings` with `status: 'awaiting'`
- [ ] Redirect to listing board after creation

### Traveller Listing Board
- [ ] Create `app/marketplace/page.jsx`
- [ ] Protect route — require authenticated traveller role
- [ ] Add PageHeader: "Marketplace" / "Find a Tour Guide"
- [ ] Fetch all marketplace listings belonging to the logged-in traveller
- [ ] Display each listing as a ListingCard (city, duration, group size, budget, tags, status, offer count)
- [ ] Grid layout: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- [ ] Each card links to `/marketplace/[id]`
- [ ] Show empty state if no listings exist

### Traveller Listing Detail
- [ ] Create `app/marketplace/[id]/page.jsx`
- [ ] Protect route — only the listing owner can view
- [ ] Display the full itinerary associated with the listing
- [ ] Display listing status using StatusBadge
- [ ] Show all incoming offers from guides
- [ ] For each offer, display: guide name (with Avatar), quoted price, offer status
- [ ] Add "Accept" button on each offer (opens Modal confirmation)
- [ ] Add "Reject" button on each offer
- [ ] On accept: update offer status to `accepted`, listing status to `confirmed`
- [ ] On reject: update offer status to `rejected`
- [ ] Add "Chat" button next to each offer to open chat with that guide

### Guide Marketplace
- [ ] Create `app/(guide)/marketplace/page.jsx`
- [ ] Protect route — require authenticated, verified guide role
- [ ] Fetch active marketplace listings scoped to the guide's `assigned_city`
- [ ] Display listings as ListingCard components
- [ ] Each card links to a detail view where the guide can read the full itinerary
- [ ] Show empty state if no listings in their city

### Guide Submit Proposal
- [ ] On listing detail (guide view), add form to submit a quoted price
- [ ] Create row in `offers` table with `status: 'pending'`
- [ ] Update listing status to `has_offers` (if first offer)
- [ ] Show confirmation after submission
- [ ] Prevent duplicate offers from the same guide on the same listing

### Real-Time Chat
- [ ] Create chat UI for traveller side (within listing detail or separate route)
- [ ] Create `app/(guide)/chat/[listingId]/page.jsx` for guide side
- [ ] Set up Supabase Realtime subscription on `messages` table filtered by `listing_id`
- [ ] Display message history with sender identification (use Avatar component)
- [ ] Add message input field and send button
- [ ] On send, insert row into `messages` table
- [ ] Messages appear in real-time for both parties
- [ ] Auto-scroll to newest message
- [ ] Update listing status to `negotiating` when chat is initiated

### Status Management
- [ ] Implement status transitions: `awaiting` → `has_offers` → `negotiating` → `confirmed`
- [ ] Display correct labels per role (traveller sees "Awaiting Offers", guide sees "Open Listing", etc.)
- [ ] Use StatusBadge component with correct colours (grey/amber/blue/green)

### RLS Policies
- [ ] Write RLS: travellers can only CRUD their own marketplace_listings
- [ ] Write RLS: guides can SELECT listings matching their assigned_city
- [ ] Write RLS: guides can only INSERT/SELECT their own offers
- [ ] Write RLS: travellers can SELECT offers on their own listings and UPDATE offer status
- [ ] Write RLS: messages scoped to listing participants only (sender or receiver)
- [ ] Test cross-user and cross-role access is blocked

### Final
- [ ] Test full traveller flow: create listing → receive offers → chat → accept offer
- [ ] Test full guide flow: browse listings → submit offer → chat → booking confirmed
- [ ] Verify real-time chat works bidirectionally
- [ ] Verify status labels are correct per role at each stage
- [ ] Verify budget displays as "RM X,XXX" format
