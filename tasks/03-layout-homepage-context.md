# Feature: Root Layout & Homepage

## Overview

Build the root layout (`app/layout.jsx`) which wraps every page with the Navbar and Footer, and the Homepage (`app/page.jsx`) which is the landing page of MyHoliday.

**Dependencies:** Requires `02-ui-components` to be complete (uses Button, Badge, DestinationCard components).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS with custom tokens |
| Fonts | Funnel Display (headings), Noto Serif (body) |

---

## Route Ownership

| Page | Route | Owner |
|---|---|---|
| Root Layout | `app/layout.jsx` | ZX |
| Homepage | `app/page.jsx` | ZX |

---

## Design Tokens (Quick Reference)

### Colours
- Charcoal `#1A1A1A` — primary text, navbar
- Warm White `#FAF9F7` — page background
- Amber `#C4874A` — accent, CTAs
- Amber Dark `#8B6A3E` — hover state for amber elements
- Subtle `#F5F2EE` — alternate section backgrounds

### Typography
- Page hero heading: `text-5xl font-extrabold font-display`
- Section heading: `text-4xl font-extrabold font-display`
- Body: `text-sm font-normal font-body` / `text-base font-normal font-body`

### Layout Rules
- Page max width: `max-w-5xl mx-auto`
- Page horizontal padding: `px-12 md:px-4`
- Section vertical padding: `py-20`
- Alternate section background: `bg-subtle`

---

## Root Layout

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

- Navbar and Footer appear on **every page** automatically
- Individual pages never import Navbar or Footer — the layout handles it
- The `<main>` wrapper applies max-width and horizontal padding globally

### Navbar
- Background: charcoal
- Logo/brand text: "MyHoliday" in warm white
- Navigation links (vary by auth state/role)
- For unauthenticated users: Login / Register buttons
- For travellers: Quiz, Destinations, My Plans, Marketplace, Profile
- For guides: Marketplace, Chat, Profile
- For admin: Users, Verifications, Marketplace, Reports

### Footer
- Simple footer with project name, copyright, and relevant links
- Background: charcoal, text: warm white

---

## Homepage

The homepage is the public-facing landing page. It should convey what MyHoliday does and drive users to register or take the quiz.

### Sections

**1. Hero Section**
- Layout: `grid-cols-1 lg:grid-cols-2`
- Left side: headline, subheading with `.italic-accent`, CTA button ("Start the Quiz" → links to `/quiz`)
- Right side: hero image or illustration
- Headline example: "Your next holiday," with italic accent "uniquely yours."
- Use `text-5xl font-extrabold font-display` for the heading

**2. How It Works**
- Layout: `grid-cols-1 lg:grid-cols-3`
- Three steps with icons/numbers:
  1. Take the Quiz — Tell us your travel style, budget, and preferences
  2. Get Matched — Our engine ranks destinations just for you
  3. Plan with AI — Chat with our AI to build your perfect day-by-day itinerary
- Background: `bg-subtle` for visual contrast

**3. Popular Destinations (Preview)**
- Show 4 featured destination cards using DestinationCard component
- Layout: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` with `gap-4`
- CTA: "Explore All Destinations" button linking to `/destinations`

**4. Marketplace Teaser**
- Brief section explaining the guide marketplace
- CTA to learn more or register as a guide

---

## Italic Accent Rule

Funnel Display has no true italic variant. For italic accent text (e.g., hero subheading), use the `.italic-accent` class which switches to Noto Serif italic:

```jsx
// Correct
<span className="italic-accent text-4xl">uniquely yours.</span>

// Wrong — Funnel Display has no real italic, browser fakes it
<h1 className="font-display italic">uniquely yours.</h1>
```

---

## CSS Rules

- Never write inline `style={{}}`
- Never create a separate `.css` file for a component
- Never use arbitrary Tailwind values like `w-[347px]`
- Always use named colour tokens — never hardcode hex values
- Navbar and Footer are in the layout — never add them inside page files
