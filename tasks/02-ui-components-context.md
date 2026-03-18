# Feature: Shared UI Components

## Overview

Build all reusable UI components used across MyHoliday. These live in `components/ui/` and are imported by every other feature. No page should recreate these — they import from `@/components/ui/`.

This task has **no dependency on Supabase or any backend** — it is purely frontend component work.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS with custom tokens |
| Fonts | Funnel Display (headings), Noto Serif (body) |

---

## Design Tokens

### Colour Palette

| Name | Hex | Tailwind Token | Usage |
|---|---|---|---|
| Charcoal | `#1A1A1A` | `charcoal` | Primary text, buttons, navbar |
| Warm White | `#FAF9F7` | `warmwhite` | Page background, light surfaces |
| Amber | `#C4874A` | `amber` | Accent, highlights, active links, CTAs |
| Amber Dark | `#8B6A3E` | `amberdark` | Hover state for amber elements |
| Border | `#EBEBEB` | `border` | Card borders, dividers |
| Subtle | `#F5F2EE` | `subtle` | Alternate section backgrounds |
| Muted | `#F0EBE3` | `muted` | Tags, badges, form backgrounds |
| Text Secondary | `#666666` | `secondary` | Body text, descriptions |
| Text Tertiary | `#999999` | `tertiary` | Placeholders, metadata |
| Text Disabled | `#AAAAAA` | `disabled` | Disabled states |
| Success | `#059669` | `success` | Confirmed bookings, success messages |
| Success BG | `#ECFDF5` | `success-bg` | Success badge background |
| Warning | `#D97706` | `warning` | Pending offers, awaiting states |
| Warning BG | `#FEF3C7` | `warning-bg` | Warning badge background |
| Error | `#DC2626` | `error` | Form errors, destructive actions |
| Error BG | `#FEF2F2` | `error-bg` | Error message background |

### Typography

| Usage | Class | Font | Size |
|---|---|---|---|
| Page hero heading | `text-5xl font-extrabold font-display` | Funnel Display | 48px |
| Section heading | `text-4xl font-extrabold font-display` | Funnel Display | 36px |
| Card heading | `text-xl font-semibold font-body` | Noto Serif | 20px |
| Body large | `text-base font-normal font-body` | Noto Serif | 16px |
| Body default | `text-sm font-normal font-body` | Noto Serif | 14px |
| UI label | `text-xs font-semibold font-body` | Noto Serif | 12px |
| Caption/metadata | `text-xs font-normal font-body` | Noto Serif | 11px |

### Spacing

| Element | Padding | Tailwind Class |
|---|---|---|
| Card internal padding | 20px | `p-5` |
| Form field padding | 10px 14px | `py-2.5 px-3.5` |
| Button padding (default) | 8px 20px | `py-2 px-5` |
| Button padding (large) | 12px 28px | `py-3 px-7` |
| Gap between grid items | 16px | `gap-4` |
| Gap between sections | 24px | `gap-6` |

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

## Components to Build

All components go in `components/ui/`. File names are PascalCase.

### 1. Button

```jsx
import Button from '@/components/ui/Button'

// variant: 'primary' | 'secondary' | 'ghost' | 'danger'
// size: 'sm' | 'md' | 'lg'

<Button label="Find Destinations" variant="primary" size="md" onClick={handleClick} />
<Button label="Cancel"            variant="ghost"   size="sm" onClick={handleCancel} />
<Button label="Delete Account"    variant="danger"  size="md" onClick={handleDelete} />
```

**Variant styles:**
- `primary`: `bg-charcoal text-warmwhite hover:bg-amber`
- `secondary`: `bg-muted text-charcoal hover:bg-border`
- `ghost`: `bg-transparent text-charcoal hover:bg-subtle`
- `danger`: `bg-error text-white hover:bg-red-700`

**Size styles:**
- `sm`: `py-1.5 px-4 text-sm`
- `md`: `py-2 px-5 text-sm`
- `lg`: `py-3 px-7 text-base`

### 2. Input

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

- Field padding: `py-2.5 px-3.5`
- Border: `border border-border rounded-lg`
- Focus: `focus:ring-2 focus:ring-amber`
- Error state: red border + error message text below in `text-error`

### 3. Select

```jsx
import Select from '@/components/ui/Select'

<Select
  label="Travel Style"
  options={["Solo", "Couple", "Family", "Group"]}
  value={travelStyle}
  onChange={(val) => setTravelStyle(val)}
/>
```

### 4. DestinationCard

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

- Grid layout: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` with `gap-4`
- Card: `rounded-xl border border-border p-5`
- Tags use the Badge component

### 5. ListingCard

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

- Grid layout: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` with `gap-4`

### 6. StatusBadge

```jsx
import StatusBadge from '@/components/ui/StatusBadge'

<StatusBadge status="has_offers" />   // amber — "3 Offers Received"
<StatusBadge status="confirmed" />    // green — "Booking Confirmed"
```

**Status values and labels:**

| Status | Traveller Label | Guide Label | Colour |
|---|---|---|---|
| `awaiting` | Awaiting Offers | Open Listing | Grey |
| `has_offers` | X Offers Received | Your Offer Submitted | Amber |
| `negotiating` | Negotiating | In Negotiation | Blue |
| `confirmed` | Booking Confirmed | Booking Confirmed | Green |

### 7. Badge

```jsx
import Badge from '@/components/ui/Badge'

<Badge label="Beach" />
<Badge label="Halal-friendly" />
```

- Style: `bg-muted text-charcoal rounded text-xs px-2 py-0.5`

### 8. PageHeader

```jsx
import PageHeader from '@/components/ui/PageHeader'

<PageHeader
  tag="Marketplace"
  title="Find a Tour Guide"
  subtitle="Post your itinerary and receive offers."   // optional
/>
```

- Tag: small label above the title
- Title: `text-4xl font-extrabold font-display`
- Subtitle: `text-secondary`

### 9. Spinner

```jsx
import Spinner from '@/components/ui/Spinner'

{isLoading ? <Spinner /> : <YourContent />}
```

### 10. Avatar

```jsx
import Avatar from '@/components/ui/Avatar'

// Falls back to initials if no imageUrl provided
<Avatar name="Ahmad Rashid" imageUrl={user.avatarUrl} size="md" />
```

- Style: `rounded-full`
- Sizes: sm (32px), md (40px), lg (56px)

### 11. StarRating

```jsx
import StarRating from '@/components/ui/StarRating'

<StarRating value={4.5} mode="display" />                                // read-only
<StarRating value={rating} mode="input" onChange={(v) => setRating(v)} /> // interactive
```

### 12. Modal

```jsx
import Modal from '@/components/ui/Modal'

<Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Confirm Booking">
  {/* modal content */}
</Modal>
```

- Style: `rounded-2xl` overlay with backdrop

---

## CSS Rules

- Never write inline `style={{}}`
- Never create a separate `.css` file for a component
- Never use arbitrary Tailwind values like `w-[347px]`
- Always use named colour tokens — never hardcode hex values
