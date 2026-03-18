# Todo: Shared UI Components

## Checklist

### Button
- [ ] Create `components/ui/Button.jsx`
- [ ] Implement `variant` prop: `primary`, `secondary`, `ghost`, `danger`
- [ ] Implement `size` prop: `sm`, `md`, `lg`
- [ ] Accept `label`, `onClick`, `disabled`, and `type` props
- [ ] Apply correct Tailwind classes for each variant and size combination
- [ ] Add hover states per variant

### Input
- [ ] Create `components/ui/Input.jsx`
- [ ] Accept `label`, `placeholder`, `type`, `value`, `onChange`, `error` props
- [ ] Render label above the input field
- [ ] Style input with `py-2.5 px-3.5 border border-border rounded-lg`
- [ ] Add focus ring: `focus:ring-2 focus:ring-amber`
- [ ] Show error message below field in `text-error` when `error` prop is provided

### Select
- [ ] Create `components/ui/Select.jsx`
- [ ] Accept `label`, `options` (array of strings), `value`, `onChange` props
- [ ] Style consistently with the Input component

### DestinationCard
- [ ] Create `components/ui/DestinationCard.jsx`
- [ ] Accept `id`, `name`, `country`, `tags`, `matchScore` (optional), `imageUrl` props
- [ ] Display image, city name, country, tag badges
- [ ] Conditionally render match score as "X% match" when provided
- [ ] Use Badge component for tags
- [ ] Make the entire card a clickable link to `/destinations/[id]`

### ListingCard
- [ ] Create `components/ui/ListingCard.jsx`
- [ ] Accept `id`, `city`, `duration`, `groupSize`, `budget`, `tags`, `status`, `offerCount` props
- [ ] Format budget as "RM X,XXX" (MYR currency)
- [ ] Display StatusBadge based on `status` prop
- [ ] Use Badge component for tags
- [ ] Make the card a clickable link to `/marketplace/[id]`

### StatusBadge
- [ ] Create `components/ui/StatusBadge.jsx`
- [ ] Accept `status` and optional `perspective` (`traveller` | `guide`) props
- [ ] Map status values to correct labels and colours (grey/amber/blue/green)

### Badge
- [ ] Create `components/ui/Badge.jsx`
- [ ] Accept `label` prop
- [ ] Style: `bg-muted text-charcoal rounded text-xs px-2 py-0.5`

### PageHeader
- [ ] Create `components/ui/PageHeader.jsx`
- [ ] Accept `tag`, `title`, `subtitle` (optional) props
- [ ] Render tag as small uppercase label, title as section heading, subtitle in secondary text

### Spinner
- [ ] Create `components/ui/Spinner.jsx`
- [ ] Implement a simple CSS animated loading spinner using Tailwind's `animate-spin`

### Avatar
- [ ] Create `components/ui/Avatar.jsx`
- [ ] Accept `name`, `imageUrl` (optional), `size` (`sm` | `md` | `lg`) props
- [ ] Show image if `imageUrl` provided, otherwise show initials from `name`
- [ ] Apply `rounded-full` and size-based dimensions

### StarRating
- [ ] Create `components/ui/StarRating.jsx`
- [ ] Accept `value`, `mode` (`display` | `input`), `onChange` (optional) props
- [ ] In `display` mode: render read-only filled/empty stars
- [ ] In `input` mode: allow clicking stars to set rating, call `onChange`

### Modal
- [ ] Create `components/ui/Modal.jsx`
- [ ] Accept `isOpen`, `onClose`, `title`, `children` props
- [ ] Render overlay backdrop when open
- [ ] Style modal container with `rounded-2xl`
- [ ] Close on backdrop click and escape key

### Final
- [ ] Create an `index.js` barrel export file in `components/ui/` (optional, for convenience)
- [ ] Verify all components render correctly with no console errors
