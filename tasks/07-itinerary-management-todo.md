# Todo: Itinerary Management (My Plans)

## Checklist

### My Plans Dashboard Page
- [ ] Create `app/itinerary/my-plans/page.jsx`
- [ ] Protect route — redirect to login if not authenticated
- [ ] Add PageHeader with title "My Plans"
- [ ] Fetch all itineraries for the logged-in user from Supabase (join with `destinations` for city/country info)
- [ ] Sort itineraries by `updated_at` descending (most recent first)
- [ ] Show Spinner while loading

### Plan Cards
- [ ] Create a PlanCard component (or inline in the page)
- [ ] Display: plan title, destination city & country, created date, updated date
- [ ] Show a preview snippet of the itinerary content
- [ ] Add destination tags as Badge components
- [ ] Make cards clickable to view full plan detail
- [ ] Style cards: `rounded-xl border border-border p-5`

### View Plan Detail
- [ ] Implement plan detail view (expand card or navigate to a detail sub-page)
- [ ] Render the full day-by-day itinerary from `plan_content` JSON
- [ ] Display destination info (city, country, image)
- [ ] Show created and last updated timestamps

### Edit Plan
- [ ] Add "Edit" Button (secondary or ghost variant) on each plan card
- [ ] On click, navigate to the AI itinerary planner (`/itinerary`) with the existing plan loaded
- [ ] Pass the itinerary ID and destination ID so the chatbot can load context
- [ ] After user saves edits, update the same `itineraries` row (update `plan_content` and `updated_at`)

### Delete Plan
- [ ] Add "Delete" Button (danger variant) on each plan card
- [ ] On click, open a Modal confirmation: "Are you sure you want to delete this plan?"
- [ ] On confirm, delete the row from `itineraries` table in Supabase
- [ ] Check if the plan has an associated marketplace listing — warn user if so
- [ ] Remove the card from the UI after successful deletion
- [ ] Show success feedback

### Post to Marketplace
- [ ] Add "Post to Marketplace" Button on each plan card
- [ ] Only show this button if the plan hasn't already been posted (check `marketplace_listings` for matching `itinerary_id`)
- [ ] On click, navigate to `/marketplace/new` with the itinerary pre-selected
- [ ] If already posted, show a disabled button or "Already Listed" badge

### Empty State
- [ ] Handle zero plans case — show friendly empty state message
- [ ] Display "You haven't created any plans yet"
- [ ] Add CTA buttons: "Take the Quiz" → `/recommendations`, "Browse Destinations" → `/destinations`

### RLS Policies
- [ ] Write RLS policy: users can only SELECT their own itineraries
- [ ] Write RLS policy: users can only UPDATE their own itineraries
- [ ] Write RLS policy: users can only DELETE their own itineraries
- [ ] Test that cross-user access is blocked

### Final
- [ ] Test full flow: view plans → expand detail → edit → save → verify update
- [ ] Test delete flow with confirmation modal
- [ ] Test empty state when no plans exist
- [ ] Verify "Post to Marketplace" correctly links to listing creation
