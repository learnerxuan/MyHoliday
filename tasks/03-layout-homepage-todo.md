# Todo: Root Layout & Homepage

## Checklist

### Navbar Component
- [ ] Create `components/sections/Navbar.jsx`
- [ ] Style with charcoal background, warm white text
- [ ] Add "MyHoliday" brand/logo text on the left
- [ ] Add navigation links on the right (conditionally rendered by auth state and role)
- [ ] Unauthenticated: show Login and Register buttons
- [ ] Traveller: show Quiz, Destinations, My Plans, Marketplace, Profile links
- [ ] Guide: show Marketplace, Chat, Profile links
- [ ] Admin: show Users, Verifications, Marketplace, Reports links
- [ ] Add mobile responsive hamburger menu

### Footer Component
- [ ] Create `components/sections/Footer.jsx`
- [ ] Style with charcoal background, warm white text
- [ ] Include project name, copyright line, and any relevant links

### Root Layout
- [ ] Create `app/layout.jsx`
- [ ] Import and render Navbar above `{children}`
- [ ] Import and render Footer below `{children}`
- [ ] Wrap children in `<main className="max-w-5xl mx-auto px-12">`
- [ ] Set body className: `bg-warmwhite font-body text-charcoal`
- [ ] Add `<html lang="en">` wrapper
- [ ] Add metadata (title, description) for SEO

### Homepage — Hero Section
- [ ] Create `app/page.jsx`
- [ ] Build hero section with 2-column grid (`grid-cols-1 lg:grid-cols-2`)
- [ ] Left column: heading (`text-5xl font-extrabold font-display`), italic accent subheading, CTA button
- [ ] Right column: hero image or illustration placeholder
- [ ] CTA button: "Start the Quiz" linking to `/quiz`
- [ ] Use `.italic-accent` class for the subheading (never `font-display italic`)

### Homepage — How It Works
- [ ] Build "How It Works" section with `bg-subtle` background
- [ ] 3-column grid (`grid-cols-1 lg:grid-cols-3`)
- [ ] Step 1: Take the Quiz
- [ ] Step 2: Get Matched
- [ ] Step 3: Plan with AI
- [ ] Add icons or step numbers for visual clarity

### Homepage — Popular Destinations
- [ ] Create a section showcasing 4 featured destinations
- [ ] Use DestinationCard component in a 4-column grid
- [ ] Add "Explore All Destinations" CTA button linking to `/destinations`

### Homepage — Marketplace Teaser
- [ ] Create a brief section explaining the guide marketplace concept
- [ ] Add CTA to register as a guide or learn more

### Final
- [ ] Verify layout renders Navbar and Footer on all pages
- [ ] Verify homepage sections display correctly at desktop and mobile breakpoints
- [ ] Confirm no Navbar/Footer imports inside any page files
