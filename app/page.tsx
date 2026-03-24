import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// ── Types ──────────────────────────────────────────────────────
interface Destination {
  id: string
  city: string
  country: string
  region: string | null
  short_description: string | null
  budget_level: string | null
  culture: number | null
  adventure: number | null
  nature: number | null
  beaches: number | null
}

// ── Data fetching ──────────────────────────────────────────────
async function getFeaturedDestinations(): Promise<Destination[]> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase
      .from('destinations')
      .select('id, city, country, region, short_description, budget_level, culture, adventure, nature, beaches')
      .limit(4)
    return data ?? []
  } catch {
    return []
  }
}

// ── Page ───────────────────────────────────────────────────────
export default async function HomePage() {
  const destinations = await getFeaturedDestinations()

  return (
    <div className="min-h-screen">

      {/* ── 1. Hero ──────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h1 className="text-5xl font-extrabold font-display text-charcoal leading-tight">
            Your next holiday,{' '}
            <span className="italic-accent text-amber">uniquely yours.</span>
          </h1>
          <p className="text-base font-body text-secondary leading-relaxed max-w-md">
            Tell us your travel style and budget. Our AI matches you with destinations
            you'll love, then builds your perfect day-by-day itinerary — in minutes.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link
              href="/quiz"
              className="inline-block bg-charcoal text-warmwhite font-semibold font-body text-sm py-3 px-7 rounded-md hover:bg-amber transition-colors"
            >
              Start the Quiz
            </Link>
            <Link
              href="/destinations"
              className="inline-block bg-muted text-charcoal font-semibold font-body text-sm py-3 px-7 rounded-md hover:bg-border transition-colors"
            >
              Browse Destinations
            </Link>
          </div>
        </div>

        {/* Decorative placeholder — replace with illustration/photo later */}
        <div className="hidden lg:flex items-center justify-center">
          <div className="w-full max-w-sm aspect-square rounded-2xl bg-subtle flex flex-col items-center justify-center gap-4 border border-border">
            <span className="text-7xl">✈️</span>
            <p className="text-sm font-body text-tertiary text-center px-6">
              Personalised travel planning powered by AI
            </p>
          </div>
        </div>
      </section>

      {/* ── 2. How It Works ──────────────────────────────────── */}
      <section className="bg-subtle py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-4xl font-extrabold font-display text-charcoal text-center mb-12">
            How it works
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.number} className="bg-warmwhite rounded-xl p-6 border border-border text-center space-y-3">
                <span className="text-4xl">{step.icon}</span>
                <div className="w-8 h-8 rounded-full bg-charcoal text-warmwhite text-sm font-bold font-display flex items-center justify-center mx-auto">
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold font-body text-charcoal">{step.title}</h3>
                <p className="text-sm font-body text-secondary leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Popular Destinations ──────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between mb-8 gap-4">
          <h2 className="text-4xl font-extrabold font-display text-charcoal">
            Popular destinations
          </h2>
          <Link
            href="/destinations"
            className="text-sm font-semibold font-body text-amber hover:text-amberdark transition-colors shrink-0"
          >
            Explore all →
          </Link>
        </div>

        {destinations.length === 0 ? (
          <div className="text-center py-16 text-secondary font-body text-sm">
            No destinations found. Add some in the admin panel.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {destinations.map((dest) => (
              <DestinationCard key={dest.id} destination={dest} />
            ))}
          </div>
        )}
      </section>

      {/* ── 4. Marketplace Teaser ────────────────────────────── */}
      <section className="bg-charcoal py-20">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <h2 className="text-4xl font-extrabold font-display text-warmwhite leading-tight">
              Travel with a local guide
            </h2>
            <p className="text-base font-body text-disabled leading-relaxed">
              Hire verified local guides who know their city inside-out.
              Browse portfolios, read reviews, and book directly — no middlemen.
            </p>
            <Link
              href="/guide/marketplace"
              className="inline-block bg-amber text-warmwhite font-semibold font-body text-sm py-3 px-7 rounded-md hover:bg-amberdark transition-colors"
            >
              Browse Guides
            </Link>
          </div>
          <div className="hidden lg:grid grid-cols-3 gap-3">
            {GUIDE_BADGES.map((b) => (
              <div key={b.label} className="bg-white/10 rounded-xl p-4 text-center space-y-1">
                <span className="text-3xl">{b.icon}</span>
                <p className="text-xs font-body text-warmwhite font-semibold">{b.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-charcoal border-t border-white/10 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-body text-disabled">
            © 2026 MyHoliday. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm font-body text-disabled">
            <Link href="/destinations" className="hover:text-warmwhite transition-colors">Destinations</Link>
            <Link href="/guide/marketplace" className="hover:text-warmwhite transition-colors">Guides</Link>
            <Link href="/auth/login" className="hover:text-warmwhite transition-colors">Login</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────

function DestinationCard({ destination }: { destination: Destination }) {
  const topTag = getTopTag(destination)
  const budgetColour =
    destination.budget_level === 'Budget'   ? 'bg-success-bg text-success' :
    destination.budget_level === 'Luxury'   ? 'bg-warning-bg text-warning' :
    'bg-muted text-secondary'

  return (
    <Link
      href={`/destinations/${destination.id}`}
      className="group block border border-border rounded-xl overflow-hidden bg-white hover:border-amber hover:shadow-sm transition-all"
    >
      {/* Image placeholder */}
      <div className="w-full h-36 bg-subtle flex items-center justify-center text-4xl">
        {topTag?.icon ?? '🌍'}
      </div>

      <div className="p-4 space-y-1.5">
        <h3 className="text-base font-semibold font-body text-charcoal group-hover:text-amber transition-colors leading-snug">
          {destination.city}
        </h3>
        <p className="text-xs font-body text-tertiary">
          {destination.country}{destination.region ? `, ${destination.region}` : ''}
        </p>
        {destination.short_description && (
          <p className="text-xs font-body text-secondary leading-snug line-clamp-2">
            {destination.short_description}
          </p>
        )}
        {destination.budget_level && (
          <span className={`inline-block text-xs font-semibold font-body px-2 py-0.5 rounded mt-1 ${budgetColour}`}>
            {destination.budget_level}
          </span>
        )}
      </div>
    </Link>
  )
}

// ── Static data ────────────────────────────────────────────────

const STEPS = [
  {
    number: 1,
    icon: '📝',
    title: 'Take the Quiz',
    description: 'Tell us your travel style, budget, preferred activities, and any special requirements.',
  },
  {
    number: 2,
    icon: '🎯',
    title: 'Get Matched',
    description: 'Our recommendation engine scores every destination against your profile and surfaces the best fits.',
  },
  {
    number: 3,
    icon: '🤖',
    title: 'Plan with AI',
    description: 'Chat with our AI planner to build a personalised day-by-day itinerary, with real hotel and restaurant options.',
  },
]

const GUIDE_BADGES = [
  { icon: '🏅', label: 'Verified guides' },
  { icon: '🗺️', label: 'Local expertise' },
  { icon: '💬', label: 'Direct booking' },
  { icon: '⭐', label: 'Reviewed' },
  { icon: '🔒', label: 'Secure payment' },
  { icon: '📱', label: 'In-app chat' },
]

// Returns a representative tag+icon based on the highest-scoring category
function getTopTag(dest: Destination) {
  const scores: { key: keyof Destination; icon: string; label: string }[] = [
    { key: 'culture',   icon: '🏛️', label: 'Culture' },
    { key: 'adventure', icon: '🏔️', label: 'Adventure' },
    { key: 'nature',    icon: '🌿', label: 'Nature' },
    { key: 'beaches',   icon: '🏖️', label: 'Beach' },
  ]
  const best = scores.reduce((acc, cur) => {
    const v = (dest[cur.key] as number | null) ?? 0
    const a = (dest[acc.key] as number | null) ?? 0
    return v > a ? cur : acc
  }, scores[0])
  return ((dest[best.key] as number | null) ?? 0) > 0 ? best : null
}
