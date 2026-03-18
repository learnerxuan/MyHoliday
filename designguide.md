# MyHoliday — Design Guide
### Travel and Tourism Recommendation System
### AAPP011-4-2 Capstone Project | Group 1 | UCDF2407ICT(DI)

> This document is the single source of truth for all frontend decisions.
> Every member must read this before writing any page or component code.
> Do not override, ignore, or substitute any value defined in this guide.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Structure](#2-project-structure)
3. [Colour Palette](#3-colour-palette)
4. [Typography](#4-typography)
5. [Spacing and Layout Rules](#5-spacing-and-layout-rules)
6. [Component Library](#6-component-library)
7. [Page Ownership](#7-page-ownership)
8. [Naming Conventions](#8-naming-conventions)
9. [How the Layout Works](#9-how-the-layout-works)
10. [Marketplace Status Labels](#10-marketplace-status-labels)
11. [Do Not Do List](#11-do-not-do-list)
12. [Git Workflow](#12-git-workflow)
13. [Environment Variables](#13-environment-variables)

---

## 1. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend and Backend | Next.js 14 (App Router) | Single project — no separate backend server needed |
| UI Library | React 18 | Bundled with Next.js — do not install separately |
| Styling | Tailwind CSS 3 | All tokens configured in `tailwind.config.js` |
| Database | PostgreSQL via Supabase | Free hosted tier — shared by all members |
| Database Client | pg (node-postgres) | Used inside Next.js API routes |
| Charts and Dashboard | Recharts | For Admin Dashboard module |
| Hosting | Vercel | Free tier — one-click deploy from GitHub |
| Version Control | GitHub | All members work on separate branches |

> The database is **PostgreSQL via Supabase** — not MySQL.
> Do not install any MySQL client or use any other database tool.
> Ask the Database lead for the Supabase connection string.

---

## 2. Project Structure

```
myholiday/
│
├── app/
│   ├── layout.jsx
│   ├── globals.css
│   ├── page.jsx
│   │
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.jsx
│   │   └── register/
│   │       └── page.jsx
│   │
│   ├── profile/
│   │   └── page.jsx
│   │
│   ├── recommendations/
│   │   ├── page.jsx
│   │   └── results/
│   │       └── page.jsx
│   │
│   ├── destinations/
│   │   └── [id]/
│   │       └── page.jsx
│   │
│   ├── itinerary/
│   │   ├── page.jsx
│   │   └── my-plans/
│   │       └── page.jsx
│   │
│   ├── marketplace/
│   │   ├── page.jsx
│   │   └── [id]/
│   │       └── page.jsx
│   │
│   ├── dashboard/
│   │   └── page.jsx
│   │
│   └── api/
│       ├── auth/route.js
│       ├── profile/route.js
│       ├── recommendations/route.js
│       ├── destinations/route.js
│       ├── itinerary/route.js
│       ├── marketplace/route.js
│       └── dashboard/route.js
│
├── components/
│   ├── ui/
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Select.jsx
│   │   ├── DestinationCard.jsx
│   │   ├── ListingCard.jsx
│   │   ├── Badge.jsx
│   │   ├── StatusBadge.jsx
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── Spinner.jsx
│   │   ├── Modal.jsx
│   │   ├── Avatar.jsx
│   │   ├── StarRating.jsx
│   │   └── PageHeader.jsx
│   │
│   └── sections/
│       ├── HeroSection.jsx
│       ├── FeaturedDestinations.jsx
│       ├── SearchBar.jsx
│       ├── FilterPanel.jsx
│       ├── PreferenceForm.jsx
│       ├── ChatWindow.jsx
│       └── ListingForm.jsx
│
├── lib/
│   ├── db.js
│   └── utils.js
│
├── public/
│   ├── images/
│   └── icons/
│
├── .env.local
├── tailwind.config.js
├── next.config.js
└── package.json
```

---

## 3. Colour Palette

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

## 4. Typography

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

## 5. Spacing and Layout Rules

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

## 6. Component Library

All components are built and maintained by ZX. Import from `@/components/ui/`. Never recreate these in your own files.

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

// Renders correct colour and label based on status
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

<StarRating value={4.5} mode="display" />                               // read-only
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

## 7. Page Ownership

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

## 8. Naming Conventions

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

### CSS

- Never write inline `style={{}}` unless no alternative exists
- Never create a separate `.css` file for a component
- Never use arbitrary Tailwind values like `w-[347px]`
- Always use named colour tokens — never hardcode hex values

---

## 9. How the Layout Works

`app/layout.jsx` wraps every page with the Navbar and Footer automatically. You never need to import or add these yourself.

```jsx
// app/layout.jsx — DO NOT edit without asking ZX
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
// app/marketplace/page.jsx — JW's file
import PageHeader from '@/components/ui/PageHeader'
import ListingCard from '@/components/ui/ListingCard'

export default function MarketplacePage() {
  return (
    <section className="py-20">
      <PageHeader tag="Marketplace" title="Find a Tour Guide" />
      {/* JW's listing grid here */}
    </section>
  )
}
// Navbar and Footer are added automatically by layout.jsx — do not add them here
```

---

## 10. Marketplace Status Labels

Use exactly these four status values across all pages. Do not use the old label "Offer sent" — it has been removed.

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

## 11. Do Not Do List

- **Do not install new packages** without informing ZX — conflicts break everyone's build
- **Do not edit `tailwind.config.js`** — ask ZX if a token is missing
- **Do not edit `app/layout.jsx`** — changes affect every page
- **Do not edit `app/globals.css`** — base styles are already set
- **Do not use `<form>` tags** — use `div` wrappers with `onClick` and `onChange` handlers
- **Do not use `localStorage` or `sessionStorage`** — use React state or Supabase auth
- **Do not hardcode hex colours** — use named tokens like `text-amber` not `text-[#C4874A]`
- **Do not build your own Button, Input, or Card** — import from `@/components/ui/`
- **Do not push directly to `main`** — always use a feature branch and open a pull request
- **Do not use `<img>` tags** — use Next.js `<Image>` from `next/image`
- **Do not commit `.env.local`** — it contains Supabase credentials and must stay private
- **Do not leave `console.log` statements** before pushing

---

## 12. Git Workflow

### Branch Naming

```
feature/[initials]-[feature-name]

feature/zx-homepage
feature/zx-components
feature/zl-auth
feature/hs-recommendations
feature/es-city-detail
feature/jw-marketplace
feature/hs-dashboard
```

### Commit Message Format

```
[type]: short description

feat      — new feature or page
fix       — bug fix
style     — UI or styling change
refactor  — restructured code, no behaviour change
docs      — documentation update
chore     — config, dependencies, setup

Examples:
feat: add DestinationCard component
fix: correct StatusBadge colour for negotiating state
style: update hero section spacing on mobile
feat: add marketplace listing board page
```

### Pull Request Rules

- Never merge your own pull request — tag another member to review
- All pull requests merge into `dev` first, not `main`
- `main` is only updated at three milestones: proposal handoff, integration checkpoint, final submission
- Fix any broken pages before your PR is merged

---

## 13. Environment Variables

Each member must create a `.env.local` file in the project root. This file is in `.gitignore` and must never be committed to GitHub.

```env
# .env.local — never commit this file
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_postgresql_connection_string
```

Contact the Database lead for the correct values. Do not share these credentials anywhere publicly.

---

*Maintained by ZX — Frontend / UI Designer*
*MyHoliday | AAPP011-4-2 Capstone Project | Group 1 | UCDF2407ICT(DI)*
*Update the date below when making changes to this file.*
*Last updated: Week 4*
