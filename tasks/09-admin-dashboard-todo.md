# Todo: Admin Dashboard

## Checklist

### Route Protection
- [ ] Protect all `(admin)` routes — only allow access if user role is `admin`
- [ ] Redirect non-admin users to homepage or show 403 error
- [ ] Use Supabase service role key for server-side admin operations (never expose to client)

### Admin Layout
- [ ] Create admin layout with sidebar navigation linking to: Users, Verifications, Marketplace, Reports
- [ ] Highlight the active section in the sidebar
- [ ] Include PageHeader on each admin page

### User Management (`/admin/users`)
- [ ] Create `app/(admin)/users/page.jsx`
- [ ] Fetch all users from Supabase (travellers and guides)
- [ ] Display users in a table: name, email, role, registration date, status
- [ ] Add role filter (All / Traveller / Guide)
- [ ] Add search bar to filter by name or email
- [ ] Add "View Profile" action — shows user details in a modal or expanded row
- [ ] Add "Suspend" action — disables the user's account (with confirmation Modal)
- [ ] Add "Reactivate" action — re-enables a suspended account
- [ ] Add "Delete" action — removes the account (with confirmation Modal)
- [ ] Show appropriate Badge for each user's role and status

### Tour Guide Verification (`/admin/verifications`)
- [ ] Create `app/(admin)/verifications/page.jsx`
- [ ] Fetch guides with `verification_status: 'pending'` (show as primary queue)
- [ ] Display each pending guide: name, email, assigned city, registration date
- [ ] Show uploaded documents — fetch from Supabase Storage, display as viewable/downloadable links
- [ ] Add "Approve" Button (success style) — updates `verification_status` to `approved`
- [ ] Add "Reject" Button (danger style) — updates `verification_status` to `rejected`
- [ ] After action, move guide out of pending queue and into approved/rejected section
- [ ] Add tabs or filters: Pending / Approved / Rejected
- [ ] Show empty state when no pending verifications

### Marketplace Moderation (`/admin/marketplace`)
- [ ] Create `app/(admin)/marketplace/page.jsx`
- [ ] Fetch all marketplace listings across all cities
- [ ] Display in a table or card grid: traveller name, destination, budget, status, offer count, date posted
- [ ] Add "View Detail" action — shows full listing and itinerary
- [ ] Add "Remove Listing" action with confirmation Modal and optional reason field
- [ ] Add "Flag" action for review without removal
- [ ] Filter by status (awaiting / has_offers / negotiating / confirmed)
- [ ] Filter by city

### Analytics & Reports (`/admin/reports` or `/dashboard`)
- [ ] Create `app/(admin)/reports/page.jsx` (or `app/dashboard/page.jsx`)
- [ ] Build stat cards row: `grid-cols-2 lg:grid-cols-4`
  - [ ] Total users count (travellers + guides)
  - [ ] Total itineraries generated
  - [ ] Active marketplace listings
  - [ ] Confirmed bookings count
- [ ] Build "Popular Destinations" section — query top 5 most selected cities from `itineraries` table
- [ ] Build "Itineraries Over Time" section — count of plans created per month
- [ ] Build "Marketplace Activity" section — listings, offers, and confirmed bookings counts
- [ ] Build "User Demographics" section — breakdown by nationality, group size, travel style from `traveller_profiles` and quiz data
- [ ] Display data as simple tables, stat numbers, or basic charts

### Final
- [ ] Test admin can view and manage all user accounts
- [ ] Test guide approval flow: pending → approve → guide can access marketplace
- [ ] Test guide rejection flow: pending → reject → guide cannot access marketplace
- [ ] Test listing removal from admin marketplace moderation
- [ ] Verify analytics numbers are accurate against database counts
- [ ] Verify non-admin users cannot access any admin routes
