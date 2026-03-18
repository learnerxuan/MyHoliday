# MyHoliday — Frontend Design Guide
### Travel and Tourism Recommendation System
### AAPP011-4-2 Capstone Project | Group 1 | UCDF2407ICT(DI)

> This document is the single source of truth for all frontend styling decisions.
> Every member must read this before writing any page or component code.
> Do not override, ignore, or substitute any value defined in this guide.

---

## Table of Contents

1. [Colour Palette](#1-colour-palette)
2. [Typography](#2-typography)
3. [Spacing and Layout Rules](#3-spacing-and-layout-rules)
4. [Component Library](#4-component-library)
5. [Page Ownership](#5-page-ownership)
6. [Naming Conventions](#6-naming-conventions)
7. [How the Layout Works](#7-how-the-layout-works)
8. [Marketplace Status Labels](#8-marketplace-status-labels)

---

## 1. Colour Palette

These are the only colours used in the entire project. Do not use any colour outside this list. All values are configured in `tailwind.config.js`. Always use the named token — never hardcode hex values.

### Primary Palette

| Name | Hex | Tailwind Token | Usage |
|---|---|---|---|
| Charcoal | `#1A1A1A` | `charcoal` | Primary text, buttons, navbar |
| Warm White | `#FAF9F7` | `warmwhite` | Page background, light surfaces |
| Amber | `#C4874A` | `amber` | Accent, highlights, active links, CTAs |
| Amber Dark | `#8B6A3E` | `amberdark` | Hover state for amber elements |

### Neutral Palette

| Name | Hex | Tailwind Token | Usage |
|---|---|---|---|
| Border | `#EBEBEB` | `border` | Card borders, dividers |
| Subtle | `#F5F2EE` | `subtle` | Alternate section backgrounds |
| Muted | `#F0EBE3` | `muted` | Tags, badges, form backgrounds |
| Text Secondary | `#666666` | `secondary` | Body text, descriptions |
| Text Tertiary | `#999999` | `tertiary` | Placeholders, metadata |
| Text Disabled | `#AAAAAA` | `disabled` | Disabled states |

### Semantic Palette

| Name | Hex | Tailwind Token | Usage |
|---|---|---|---|
| Success | `#059669` | `success` | Confirmed bookings, success messages |
| Success BG | `#ECFDF5` | `success-bg` | Success badge background |
| Warning | `#D97706` | `warning` | Pending offers, awaiting states |
| Warning BG | `#FEF3C7` | `warning-bg` | Warning badge background |
| Error | `#DC2626` | `error` | Form errors, destructive actions |
| Error BG | `#FEF2F2` | `error-bg` | Error message background |

### Tailwind Config

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        charcoal:  '#1A1A1A',
        warmwhite: '#FAF9F7',
        amber:     '#C4874A',
        amberdark: '#8B6A3E',
        border:    '#EBEBEB',
        subtle:    '#F5F2EE',
        muted:     '#F0EBE3',
        secondary: '#666666',
        tertiary:  '#999999',
        disabled:  '#AAAAAA',
        success: { DEFAULT: '#059669', bg: '#ECFDF5' },
        warning: { DEFAULT: '#D97706', bg: '#FEF3C7' },
        error:   { DEFAULT: '#DC2626', bg: '#FEF2F2' },
      },
      fontFamily: {
        display: ['Funnel Display', 'sans-serif'],
        body:    ['Noto Serif', 'serif'],
      },
    },
  },
}
```

---

## 2. Typography

### Font Pairing

| Font | Role | Class |
|---|---|---|
| Funnel Display (Extra Bold) | All headings and display text | `font-display` |
| Noto Serif | Body text, labels, buttons, inputs | `font-body` |

Fonts are already imported in `globals.css`. Do not re-import in your page files.

```css
/* globals.css — already added, do not re-add */
@import url('https://fonts.googleapis.com/css2?family=Funnel+Display:wght@800&family=Noto+Serif:ital,wght@0,400;0,600;1,400&display=swap');

/* Apply Noto Serif globally so it cascades without needing font-body on every element */
body {
  font-family: 'Noto Serif', serif;
}

/* Apply Funnel Display Extra Bold to all heading tags globally */
h1, h2, h3, h4, h5, h6 {
  font-family: 'Funnel Display', sans-serif;
  font-weight: 800;
}

/* Use this class for italic accent lines in the hero or anywhere a styled italic is needed.
   Funnel Display has no true italic — this uses Noto Serif italic instead to avoid
   a browser-synthesised fake italic which looks visually off. */
.italic-accent {
  font-family: 'Noto Serif', serif;
  font-style: italic;
  color: #C4874A;
}
```

### Type Scale

| Usage | Class to Use | Font | Size |
|---|---|---|---|
| Page hero heading | `text-5xl font-extrabold font-display` | Funnel Display | 48px |
| Section heading | `text-4xl font-extrabold font-display` | Funnel Display | 36px |
| Card heading | `text-xl font-semibold font-body` | Noto Serif | 20px |
| Body large | `text-base font-normal font-body` | Noto Serif | 16px |
| Body default | `text-sm font-normal font-body` | Noto Serif | 14px |
| UI label | `text-xs font-semibold font-body` | Noto Serif | 12px |
| Caption or metadata | `text-xs font-normal font-body` | Noto Serif | 11px |

### Italic Accent Text

Funnel Display does not have a true italic variant. Do not apply `italic` directly to `font-display` elements — the browser will synthesise a fake slant that looks visually incorrect. For any italic accent text such as the hero subheading, use the `.italic-accent` class instead, which switches to Noto Serif italic:

```jsx
// Correct — uses Noto Serif italic
<span className="italic-accent text-4xl">uniquely yours.</span>

// Wrong — Funnel Display has no real italic, browser fakes it
<h1 className="font-display italic">uniquely yours.</h1>
```

---

## 3. Spacing and Layout Rules

### Page Layout

| Rule | Value | Tailwind Class |
|---|---|---|
| Page max width | 1024px | `max-w-5xl mx-auto` |
| Page horizontal padding | 48px desktop, 16px mobile | `px-12 md:px-4` |
| Section vertical padding | 80px | `py-20` |
| Alternate section background | `#F5F2EE` | `bg-subtle` |

### Component Spacing

| Element | Padding | Tailwind Class |
|---|---|---|
| Card internal padding | 20px | `p-5` |
| Form field padding | 10px 14px | `py-2.5 px-3.5` |
| Button padding (default) | 8px 20px | `py-2 px-5` |
| Button padding (large) | 12px 28px | `py-3 px-7` |
| Gap between grid items | 16px | `gap-4` |
| Gap between sections | 24px | `gap-6` |

### Grid Layouts

| Context | Layout | Tailwind Class |
|---|---|---|
| Destination cards | 4 / 2 / 1 col | `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` |
| Marketplace listings | 3 / 2 / 1 col | `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` |
| How It Works steps | 3 / 1 col | `grid-cols-1 lg:grid-cols-3` |
| Hero section | 2 col split | `grid-cols-1 lg:grid-cols-2` |
| Admin stats row | 4 / 2 col | `grid-cols-2 lg:grid-cols-4` |

### Border Radius

| Element | Tailwind Class |
|---|---|
| Cards | `rounded-xl` |
| Buttons | `rounded-md` |
| Input fields | `rounded-lg` |
| Badges and tags | `rounded` |
| Avatars | `rounded-full` |
| Modals | `rounded-2xl` |

---

## 4. Component Library

All components below are built by ZX. Import from `@/components/ui/`. Never recreate these in your own files.

### Button

```jsx
import Button from '@/components/ui/Button'

// variant: 'primary' | 'secondary' | 'ghost' | 'danger'
// size: 'sm' | 'md' | 'lg'

<Button label="Find Destinations" variant="primary" size="md" onClick={handleClick} />
<Button label="Cancel"            variant="ghost"   size="sm" onClick={handleCancel} />
<Button label="Delete Account"    variant="danger"  size="md" onClick={handleDelete} />
```

### Input

```jsx
import Input from '@/components/ui/Input'

<Input
  label="Email Address"
  placeholder="you@email.com"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error="Please enter a valid email"   // optional
/>
```

### Select

```jsx
import Select from '@/components/ui/Select'

<Select
  label="Travel Style"
  options={["Solo", "Couple", "Family", "Group"]}
  value={travelStyle}
  onChange={(val) => setTravelStyle(val)}
/>
```

### DestinationCard

```jsx
import DestinationCard from '@/components/ui/DestinationCard'

<DestinationCard
  id={destination.id}
  name="Kyoto"
  country="Japan"
  tags={["Culture", "Food", "Temples"]}
  matchScore={98}          // optional — shows "98% match"
  imageUrl={destination.imageUrl}
/>
```

### ListingCard

```jsx
import ListingCard from '@/components/ui/ListingCard'

// status: 'awaiting' | 'has_offers' | 'negotiating' | 'confirmed'

<ListingCard
  id={listing.id}
  city="Kyoto, Japan"
  duration="5 days"
  groupSize="2 pax"
  budget={3200}            // MYR — displayed as "RM 3,200"
  tags={["Culture", "Halal food"]}
  status="has_offers"
  offerCount={3}
/>
```

### StatusBadge

```jsx
import StatusBadge from '@/components/ui/StatusBadge'

<StatusBadge status="has_offers" />   // amber — "3 Offers Received"
<StatusBadge status="confirmed" />    // green — "Booking Confirmed"
```

### Badge

```jsx
import Badge from '@/components/ui/Badge'

<Badge label="Beach" />
<Badge label="Halal-friendly" />
<Badge label="Family" />
```

### PageHeader

```jsx
import PageHeader from '@/components/ui/PageHeader'

<PageHeader
  tag="Marketplace"
  title="Find a Tour Guide"
  subtitle="Post your itinerary and receive offers."   // optional
/>
```

### Spinner

```jsx
import Spinner from '@/components/ui/Spinner'

{isLoading ? <Spinner /> : <YourContent />}
```

### Avatar

```jsx
import Avatar from '@/components/ui/Avatar'

// Falls back to initials if no imageUrl provided
<Avatar name="Ahmad Rashid" imageUrl={user.avatarUrl} size="md" />
```

### StarRating

```jsx
import StarRating from '@/components/ui/StarRating'

<StarRating value={4.5} mode="display" />                                // read-only
<StarRating value={rating} mode="input" onChange={(v) => setRating(v)} /> // interactive
```

### Modal

```jsx
import Modal from '@/components/ui/Modal'

<Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Confirm Booking">
  {/* modal content */}
</Modal>
```

---

## 5. Page Ownership

| Module | Page | Route | Owner |
|---|---|---|---|
| — | Root Layout | `app/layout.jsx` | ZX |
| — | Homepage | `app/page.jsx` | ZX |
| Auth & Profile | Login | `app/auth/login/page.jsx` | ZL |
| Auth & Profile | Register | `app/auth/register/page.jsx` | ZL |
| Auth & Profile | User Profile | `app/profile/page.jsx` | ZL |
| Recommendation Engine | Preference Quiz | `app/recommendations/page.jsx` | HS |
| Recommendation Engine | Matched City Results | `app/recommendations/results/page.jsx` | HS |
| City Detail & AI Itinerary | City Detail | `app/destinations/[id]/page.jsx` | ES |
| City Detail & AI Itinerary | AI Itinerary Chat | `app/itinerary/page.jsx` | ES |
| Itinerary Management | My Plans | `app/itinerary/my-plans/page.jsx` | JW |
| Marketplace | Listing Board | `app/marketplace/page.jsx` | JW |
| Marketplace | Listing Detail and Offers | `app/marketplace/[id]/page.jsx` | JW |
| Admin Dashboard | Dashboard and Reports | `app/dashboard/page.jsx` | HS |

**Notes:**
- ZX builds all `components/ui/` and `components/sections/` — everyone imports from there
- ZX builds `PreferenceForm.jsx` for HS, `ChatWindow.jsx` for ES, and `ListingForm.jsx` for JW
- FR owns project management, documentation, and the Gantt chart — no page ownership

---

## 6. Naming Conventions

### Files and Folders

| Type | Convention | Example |
|---|---|---|
| Page files | lowercase | `page.jsx` |
| Component files | PascalCase | `DestinationCard.jsx` |
| Utility files | camelCase | `formatCurrency.js` |
| API route files | lowercase | `route.js` |
| Folders | lowercase with hyphens | `my-plans/`, `auth/` |

### Variables and Functions

| Type | Convention | Example |
|---|---|---|
| Variables | camelCase | `listingData` |
| Functions and handlers | camelCase | `handleSubmit()` |
| React components | PascalCase | `ListingCard` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| API endpoints | kebab-case | `/api/marketplace-listings` |
| Database columns | snake_case | `created_at`, `user_id` |

### CSS and Tailwind

- Never write inline `style={{}}` unless no alternative exists
- Never create a separate `.css` file for a component
- Never use arbitrary Tailwind values like `w-[347px]`
- Always use named colour tokens — never hardcode hex values

---

## 7. How the Layout Works

`app/layout.jsx` wraps every page with the Navbar and Footer automatically. You never need to import or add these yourself.

```jsx
// app/layout.jsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-warmwhite font-body text-charcoal">
        <Navbar />
        <main className="max-w-5xl mx-auto px-12">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
```

Your page file only needs to contain your content:

```jsx
// app/marketplace/page.jsx
import PageHeader from '@/components/ui/PageHeader'
import ListingCard from '@/components/ui/ListingCard'

export default function MarketplacePage() {
  return (
    <section className="py-20">
      <PageHeader tag="Marketplace" title="Find a Tour Guide" />
      {/* listing grid here */}
    </section>
  )
}
```

Navbar and Footer appear automatically — do not add them inside your page files.

---

## 8. Marketplace Status Labels

Use exactly these four status values across all pages. Do not use the old label "Offer sent".

| Status Value | Traveller Sees | Guide Sees | Colour |
|---|---|---|---|
| `awaiting` | Awaiting Offers | Open Listing | Grey |
| `has_offers` | X Offers Received | Your Offer Submitted | Amber |
| `negotiating` | Negotiating | In Negotiation | Blue |
| `confirmed` | Booking Confirmed | Booking Confirmed | Green |

Full listing lifecycle:

```
Traveller posts itinerary   →  status: awaiting
Guide submits price offer   →  status: has_offers
Traveller opens chat        →  status: negotiating
Traveller accepts offer     →  status: confirmed
```

---

*MyHoliday | AAPP011-4-2 Capstone Project | Group 1 | UCDF2407ICT(DI)*
*Last updated: Week 4*
