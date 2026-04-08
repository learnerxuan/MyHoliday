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

// ── Helpers ────────────────────────────────────────────────────
function formatRegion(s: string | null | undefined): string {
  if (!s) return ''
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── Data fetching ──────────────────────────────────────────────
async function getFeaturedDestinations(): Promise<(Destination & { imageUrl: string | null })[]> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase
      .from('destinations')
      .select('id, city, country, region, short_description, budget_level, culture, adventure, nature, beaches')
      .in('city', ['Tokyo', 'Barcelona', 'Bali', 'Dubai'])
      .limit(4)

    const destinations = data ?? []

    // Fetch Wikipedia images for each city in parallel
    const withImages = await Promise.all(
      destinations.map(async (dest) => {
        let imageUrl: string | null = null
        for (const q of [`${dest.city}, ${dest.country}`, dest.city]) {
          try {
            const res = await fetch(
              `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`,
              { headers: { 'User-Agent': 'MyHoliday/1.0' }, signal: AbortSignal.timeout(3000), next: { revalidate: 86400 } }
            )
            if (res.ok) {
              const json = await res.json()
              imageUrl = json?.originalimage?.source ?? json?.thumbnail?.source ?? null
              if (imageUrl) break
            }
          } catch { /* skip */ }
        }
        return { ...dest, imageUrl }
      })
    )

    return withImages
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
      <section
        className="text-warmwhite relative overflow-hidden"
        style={{
          background: '#0f0f0f',
        }}
      >
        {/* Ambient amber glow top-right */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 55% at 75% 20%, rgba(196,135,74,0.22) 0%, transparent 70%),' +
              'radial-gradient(ellipse 40% 40% at 20% 80%, rgba(196,135,74,0.10) 0%, transparent 65%)',
          }}
        />
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-white/10 text-amber text-xs font-semibold font-body px-3 py-1.5 rounded-full border border-amber/20">
              ✨ Powered by AI
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display leading-tight">
              Travel that feels<br />
              <span className="text-amber italic">uniquely yours.</span>
            </h1>
            <p className="text-base font-body text-disabled leading-relaxed max-w-md">
              MyHoliday takes a 2-minute quiz — your travel style, budget, climate preference, and dates — then ranks
              300+ destinations by how well they match <em>you</em>. No ads. No bias. Just your best trips.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/quiz"
                className="inline-block bg-amber text-warmwhite font-semibold font-body text-sm py-3 px-7 rounded-md hover:bg-amberdark transition-all hover:shadow-lg hover:shadow-amber/30 hover:-translate-y-0.5"
              >
                Start the Quiz →
              </Link>
              <Link
                href="/destinations"
                className="inline-block bg-white/10 text-warmwhite font-semibold font-body text-sm py-3 px-7 rounded-md hover:bg-white/20 transition-colors border border-white/10 hover:border-white/30"
              >
                Browse Destinations
              </Link>
            </div>
          </div>

          {/* Stats panel — 2×2 on mobile, 2×2 on desktop */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-start-2">
            {STATS.map(s => (
              <div
                key={s.label}
                className="bg-white/8 border border-white/10 rounded-2xl p-6 flex flex-col gap-2 hover:bg-white/15 hover:border-amber/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-amber/10 transition-all duration-200 cursor-default"
              >
                <span className="text-3xl">{s.icon}</span>
                <p className="text-2xl font-extrabold font-display text-warmwhite">{s.value}</p>
                <p className="text-xs font-body text-disabled leading-snug">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. How It Works ──────────────────────────────────── */}
      <section className="bg-subtle py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold font-body text-amber uppercase tracking-widest mb-2">The full journey</p>
            <h2 className="text-4xl font-extrabold font-display text-charcoal">From &quot;Where should I go?&quot; to &quot;I&apos;m ready.&quot;</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step) => (
              <div key={step.number} className="bg-warmwhite rounded-xl p-6 border border-border space-y-3 relative hover:border-amber hover:-translate-y-2 hover:shadow-xl hover:shadow-amber/10 transition-all duration-200 cursor-default">
                <div className="w-8 h-8 rounded-full bg-charcoal text-warmwhite text-sm font-bold font-display flex items-center justify-center group-hover:bg-amber transition-colors">
                  {step.number}
                </div>
                <span className="text-3xl">{step.icon}</span>
                <h3 className="text-base font-semibold font-body text-charcoal">{step.title}</h3>
                <p className="text-sm font-body text-secondary leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Why MyHoliday ─────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold font-body text-amber uppercase tracking-widest mb-2">Why Us?</p>
          <h2 className="text-4xl font-extrabold font-display text-charcoal">Not just an ordinary travel site.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {DIFFERENTIATORS.map(d => (
            <div key={d.title} className="border border-border rounded-2xl p-6 space-y-3 hover:border-amber hover:-translate-y-2 hover:shadow-xl hover:shadow-amber/10 hover:bg-amber/5 transition-all duration-200 cursor-default">
              <span className="text-3xl">{d.icon}</span>
              <h3 className="text-base font-semibold font-body text-charcoal">{d.title}</h3>
              <p className="text-sm font-body text-secondary leading-relaxed">{d.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Featured Destinations ─────────────────────────── */}
      {destinations.length > 0 && (
        <section className="bg-subtle py-20">
          <div className="max-w-5xl mx-auto px-6">
            <div className="flex items-end justify-between mb-8 gap-4">
              <div>
                <p className="text-xs font-semibold font-body text-amber uppercase tracking-widest mb-1">Editor picks</p>
                <h2 className="text-4xl font-extrabold font-display text-charcoal">Destinations worth dreaming about</h2>
              </div>
              <Link
                href="/quiz"
                className="text-sm font-semibold font-body text-amber hover:text-amberdark transition-colors shrink-0"
              >
                Find yours →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {destinations.map((dest) => (
                <DestinationCard key={dest.id} destination={dest} />
              ))}
            </div>

            <p className="text-center text-sm font-body text-secondary mt-8">
              These are hand-picked examples. After the quiz, we&apos;ll rank{' '}
              <strong className="text-charcoal">300+ destinations</strong> specifically for you.
            </p>
          </div>
        </section>
      )}

      {/* ── 5. Marketplace Teaser ────────────────────────────── */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, #2a1800 0%, #1a1008 50%, #1c1c1e 100%)' }}>
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <p className="text-xs font-semibold font-body text-amber uppercase tracking-widest">Step 4</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-warmwhite leading-tight">
              Bring a local expert with you
            </h2>
            <p className="text-base font-body text-disabled leading-relaxed">
              Once your itinerary is ready, connect with a verified local guide who knows the city inside-out.
              Browse profiles, read traveller reviews, and book directly — no middlemen, no inflated prices.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/guide/marketplace"
                className="inline-block bg-amber text-warmwhite font-semibold font-body text-sm py-3 px-7 rounded-md hover:bg-amberdark transition-colors text-center"
              >
                Browse Local Guides
              </Link>
              <Link
                href="/quiz"
                className="inline-block bg-white/10 text-warmwhite font-semibold font-body text-sm py-3 px-7 rounded-md hover:bg-white/20 transition-colors text-center"
              >
                Plan First →
              </Link>
            </div>
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

    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────

function DestinationCard({ destination }: { destination: Destination & { imageUrl: string | null } }) {
  const budgetColour =
    destination.budget_level === 'Budget'   ? 'bg-success-bg text-success' :
    destination.budget_level === 'Luxury'   ? 'bg-muted text-amberdark' :
    'bg-warning-bg text-warning'

  const initial = destination.city.charAt(0).toUpperCase()

  return (
    <Link
      href={`/destinations/${destination.id}`}
      className="group block border border-border rounded-2xl overflow-hidden bg-white hover:border-amber hover:shadow-md transition-all"
    >
      {/* Image or gradient placeholder */}
      <div className="w-full h-40 relative overflow-hidden">
        {destination.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={destination.imageUrl}
            alt={destination.city}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber/30 to-charcoal/60">
            <span className="text-5xl font-extrabold font-display text-warmwhite/70">{initial}</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-1.5">
        <h3 className="text-base font-semibold font-body text-charcoal group-hover:text-amber transition-colors leading-snug">
          {destination.city}
        </h3>
        <p className="text-xs font-body text-tertiary">
          {formatRegion(destination.country)}{destination.region ? `, ${formatRegion(destination.region)}` : ''}
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

const STATS = [
  { icon: '🌍', value: '300+',    label: 'Destinations scored by your preferences' },
  { icon: '🎯', value: '12D',     label: 'Dimensions used in our matching algorithm' },
  { icon: '✨', value: 'AI',      label: 'Day-by-day itinerary builder with real venue data' },
  { icon: '🧑‍🤝‍🧑', value: 'Local', label: 'Guide marketplace for boots-on-the-ground expertise' },
]

const STEPS = [
  {
    number: 1,
    icon: '📝',
    title: 'Take the Quiz',
    description: 'Tell us your travel style, budget, climate preference, group size, and travel dates — takes under 2 minutes.',
  },
  {
    number: 2,
    icon: '🎯',
    title: 'Get Your Matches',
    description: 'Our recommendation engine scores every destination on 12 dimensions and surfaces your personalised top 20.',
  },
  {
    number: 3,
    icon: '🤖',
    title: 'Build Your Itinerary',
    description: 'Chat with our AI planner to create a day-by-day plan — real hotels, restaurants, and attraction options included.',
  },
  {
    number: 4,
    icon: '🧑‍🤝‍🧑',
    title: 'Book a Local Guide',
    description: 'Connect with verified local guides who know your destination inside-out. Browse, review, and book directly.',
  },
]

const DIFFERENTIATORS = [
  {
    icon: '🔬',
    title: 'Science-backed matching',
    desc: 'We use content-based filtering (cosine similarity) across 12 travel dimensions — not ads, popularity, or sponsorships.',
  },
  {
    icon: '🤖',
    title: 'AI that plans, not just suggests',
    desc: 'Our AI planner builds a full day-by-day itinerary with real venue data, time planning, and budget awareness — not generic lists.',
  },
  {
    icon: '🧑‍🤝‍🧑',
    title: 'End-to-end: quiz to guide',
    desc: 'MyHoliday takes you from "I have no idea where to go" to a fully planned trip with a local guide — all in one platform.',
  },
]

const GUIDE_BADGES = [
  { icon: '🏅', label: 'Verified guides' },
  { icon: '🗺️', label: 'Local expertise' },
  { icon: '💬', label: 'Direct booking' },
  { icon: '⭐', label: 'Traveller reviews' },
  { icon: '🔒', label: 'Secure payment' },
  { icon: '📱', label: 'In-app chat' },
]
