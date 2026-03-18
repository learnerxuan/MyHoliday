# Todo: Destination Recommendation Engine

## Checklist

### Destination Data
- [ ] Define the destination data schema with fields: id, name, country, description, estimated_cost, climate_tags, style_tags, budget_range, image_url
- [ ] Create a seed dataset of curated destinations (at least 15-20 cities) with appropriate tags for all preference axes
- [ ] Write a migration or seed script to populate the `destinations` table in Supabase

### Preference Quiz Page
- [ ] Create `app/recommendations/page.jsx`
- [ ] Add PageHeader with title and description
- [ ] Build quiz form with 5 Select inputs:
  - [ ] Travel Style (Adventure, Cultural, Relaxation, Food & Dining, Nature, etc.)
  - [ ] Budget Level (Backpacker, Mid-range, Luxury)
  - [ ] Group Size (Solo, Couple, Small Group, Large Group)
  - [ ] Trip Duration (Weekend, 1 Week, 2 Weeks, Extended)
  - [ ] Climate Preference (Tropical, Temperate, Cold, Desert, Any)
- [ ] Add form validation — ensure all fields are filled before submit
- [ ] Add "Find My Destinations" Button (primary variant)
- [ ] On submit, send preferences to the API route
- [ ] Show Spinner while waiting for results
- [ ] On success, redirect to results page with the scored data

### Scoring API Route
- [ ] Create `app/api/recommendation/route.js`
- [ ] Accept POST request with user preferences (travel style, budget, group size, duration, climate)
- [ ] Query the `destinations` table from Supabase
- [ ] Implement filtering: exclude destinations that match none of the criteria
- [ ] Implement scoring algorithm:
  - [ ] Compare destination `style_tags` with selected travel style — award points for matches
  - [ ] Compare `budget_range` with selected budget level — award points for match
  - [ ] Compare `climate_tags` with selected climate — award points for match
  - [ ] Factor in group size and duration suitability
  - [ ] Calculate percentage match score (0-100)
- [ ] Sort results by match score descending
- [ ] Return ranked destination list with scores as JSON

### Results Page
- [ ] Create `app/recommendations/results/page.jsx`
- [ ] Read scored destinations from query params, state, or re-fetch
- [ ] Display results in a grid using DestinationCard (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`)
- [ ] Pass `matchScore` prop to each DestinationCard so it shows "X% match"
- [ ] Each card links to `/destinations/[id]`
- [ ] Add "Retake Quiz" button linking back to the quiz page
- [ ] Add "Browse All Destinations" link for users who want to skip scoring
- [ ] Handle empty results — show a friendly message if no destinations match

### Browse All Destinations
- [ ] Ensure there's a way to view all destinations without quiz (e.g., a destinations index page or an "all" mode on the results page)
- [ ] Display all destinations in the same card grid format, without match scores

### Final
- [ ] Test quiz → API → results flow end to end
- [ ] Verify match scores are reasonable for different preference combinations
- [ ] Verify cards link correctly to city detail pages
