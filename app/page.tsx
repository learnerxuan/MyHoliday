import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import HeroCarousel from '@/components/ui/HeroCarousel'

interface Destination {
  id: string
  city: string
  country: string
  region: string | null
  short_description: string | null
  budget_level: string | null
}

function formatRegion(value: string | null | undefined): string {
  if (!value) return ''
  return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

async function getFeaturedDestinations(): Promise<(Destination & { imageUrl: string | null })[]> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase
      .from('destinations')
      .select('id, city, country, region, short_description, budget_level')
      .in('city', ['Tokyo', 'Barcelona', 'Bali', 'Dubai'])
      .limit(4)

    const destinations = data ?? []

    const withImages = await Promise.all(
      destinations.map(async (dest) => {
        let imageUrl: string | null = null
        for (const query of [`${dest.city}, ${dest.country}`, dest.city]) {
          try {
            const res = await fetch(
              `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
              {
                headers: { 'User-Agent': 'MyHoliday/1.0' },
                signal: AbortSignal.timeout(3000),
                next: { revalidate: 86400 },
              }
            )
            if (res.ok) {
              const json = await res.json()
              imageUrl = json?.originalimage?.source ?? json?.thumbnail?.source ?? null
              if (imageUrl) break
            }
          } catch {
            // Keep the landing page usable even when image lookup fails.
          }
        }
        return { ...dest, imageUrl }
      })
    )

    return withImages
  } catch {
    return []
  }
}

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.user_metadata?.role

  if (role === 'admin') {
    redirect('/admin')
  }

  if (role === 'guide') {
    redirect('/marketplace')
  }

  const destinations = await getFeaturedDestinations()

  return (
    <div className="min-h-screen bg-warmwhite">
      <section className="relative overflow-hidden bg-charcoal text-warmwhite">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 58% 52% at 78% 18%, rgba(196,135,74,0.24) 0%, transparent 70%), radial-gradient(ellipse 42% 42% at 16% 84%, rgba(196,135,74,0.12) 0%, transparent 68%)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-70"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6 py-20 lg:py-24 grid grid-cols-1 lg:grid-cols-[1fr_0.92fr] gap-12 items-center">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 bg-white/10 text-amber text-[11px] font-bold font-body px-3 py-1.5 rounded-md border border-amber/20 uppercase tracking-[0.18em]">
              AI travel planning platform
            </div>
            <div className="space-y-5">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display leading-[1.03]">
                Find the trip that actually fits you.
              </h1>
              <p className="text-base sm:text-lg font-body text-disabled leading-relaxed max-w-xl">
                MyHoliday matches your travel style, budget, dates, climate preference, and trip length against 560 destinations, then helps you turn the best match into a full itinerary and guide-ready marketplace listing.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/quiz"
                className="inline-flex items-center justify-center bg-amber text-warmwhite font-semibold font-body text-sm py-3 px-7 rounded-md hover:bg-amberdark transition-all hover:shadow-lg hover:shadow-amber/30"
              >
                Start planning
              </Link>
              <Link
                href="/destinations"
                className="inline-flex items-center justify-center bg-white/10 text-warmwhite font-semibold font-body text-sm py-3 px-7 rounded-md hover:bg-white/20 transition-colors border border-white/10 hover:border-white/30"
              >
                Browse destinations
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-5 max-w-xl">
              {LANDING_STATS.map((stat) => (
                <div key={stat.value} className="border-t border-white/10 pt-4">
                  <p className="font-display font-extrabold text-2xl text-white">{stat.value}</p>
                  <p className="text-[11px] font-body text-disabled leading-snug uppercase tracking-[0.12em]">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="min-h-[420px] flex items-center">
            <HeroCarousel destinations={destinations} />
          </div>
        </div>
      </section>

      <section className="bg-subtle py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold font-body text-amber uppercase tracking-widest mb-2">The full journey</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-charcoal leading-tight">
              From unsure destination ideas to a trip you can act on.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((step) => (
              <div key={step.number} className="bg-warmwhite rounded-xl p-6 border border-border space-y-4 hover:border-amber hover:-translate-y-1 hover:shadow-xl hover:shadow-amber/10 transition-all duration-200">
                <div className="w-9 h-9 rounded-full bg-charcoal text-warmwhite text-sm font-bold font-display flex items-center justify-center">
                  {step.number}
                </div>
                <div>
                  <h3 className="text-base font-semibold font-body text-charcoal mb-2">{step.title}</h3>
                  <p className="text-sm font-body text-secondary leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[0.82fr_1fr] gap-10 lg:gap-14 items-start">
          <div>
            <p className="text-xs font-semibold font-body text-amber uppercase tracking-widest mb-2">Why MyHoliday</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-charcoal leading-tight mb-4">
              Built around preference signals, not sponsored lists.
            </h2>
            <p className="text-sm sm:text-base font-body text-secondary leading-relaxed">
              The platform combines a destination recommender, AI itinerary planner, saved trip history, traveller survey, guide marketplace, and admin dashboard into one capstone system.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {DIFFERENTIATORS.map((item) => (
              <div key={item.title} className="border border-border rounded-xl p-6 bg-white space-y-3 hover:border-amber hover:shadow-lg hover:shadow-amber/10 transition-all">
                <p className="text-[11px] font-bold font-body text-amber uppercase tracking-[0.16em]">{item.kicker}</p>
                <h3 className="text-base font-semibold font-body text-charcoal">{item.title}</h3>
                <p className="text-sm font-body text-secondary leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {destinations.length > 0 && (
        <section className="bg-subtle py-16 lg:py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
              <div>
                <p className="text-xs font-semibold font-body text-amber uppercase tracking-widest mb-1">Featured destinations</p>
                <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-charcoal leading-tight">A few places to start with.</h2>
              </div>
              <Link
                href="/quiz"
                className="text-sm font-semibold font-body text-amber hover:text-amberdark transition-colors shrink-0"
              >
                Find your matches
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {destinations.map((dest) => (
                <DestinationCard key={dest.id} destination={dest} />
              ))}
            </div>

            <p className="text-center text-sm font-body text-secondary mt-8">
              These are examples. Your quiz results are ranked against the destination dataset using your own preferences.
            </p>
          </div>
        </section>
      )}

      <section className="py-16 lg:py-20 bg-charcoal text-warmwhite">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[0.9fr_1fr] gap-10 items-center">
          <div className="space-y-5">
            <p className="text-xs font-semibold font-body text-amber uppercase tracking-widest">Marketplace</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display leading-tight">
              When the itinerary is ready, invite local guides into the plan.
            </h2>
            <p className="text-base font-body text-disabled leading-relaxed">
              Post a saved itinerary to the marketplace, receive guide offers, compare pricing, chat in-platform, and confirm the booking workflow through simulated payment records for the capstone environment.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center bg-amber text-warmwhite font-semibold font-body text-sm py-3 px-7 rounded-md hover:bg-amberdark transition-colors"
              >
                View marketplace
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center bg-white/10 text-warmwhite font-semibold font-body text-sm py-3 px-7 rounded-md hover:bg-white/20 transition-colors border border-white/10"
              >
                Learn about MyHoliday
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {MARKETPLACE_POINTS.map((item) => (
              <div key={item} className="bg-white/10 rounded-xl p-4 border border-white/10">
                <p className="text-sm font-semibold font-body text-warmwhite">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function DestinationCard({ destination }: { destination: Destination & { imageUrl: string | null } }) {
  const budgetColour =
    destination.budget_level === 'Budget' ? 'bg-success-bg text-success' :
    destination.budget_level === 'Luxury' ? 'bg-muted text-amberdark' :
    'bg-warning-bg text-warning'

  const initial = destination.city.charAt(0).toUpperCase()

  return (
    <Link
      href={`/destinations/${destination.id}`}
      className="group block border border-border rounded-xl overflow-hidden bg-white hover:border-amber hover:shadow-md transition-all"
    >
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

const LANDING_STATS = [
  { value: '560', label: 'Destination records' },
  { value: '12', label: 'Ranking inputs' },
  { value: '9', label: 'Travel style scores' },
]

const STEPS = [
  {
    number: 1,
    title: 'Share your preferences',
    description: 'Choose travel styles, regions, budget, climate, group size, and travel dates in the planning quiz.',
  },
  {
    number: 2,
    title: 'Review ranked matches',
    description: 'The recommender scores destinations using style ratings, budget fit, trip duration, and climate preference.',
  },
  {
    number: 3,
    title: 'Build the itinerary',
    description: 'Use the AI planner to create and refine a day-by-day trip plan with places, timing, budget context, and notes.',
  },
  {
    number: 4,
    title: 'Work with a guide',
    description: 'Save the itinerary, post it to the marketplace, compare offers, chat, and confirm the capstone booking flow.',
  },
]

const DIFFERENTIATORS = [
  {
    kicker: 'Recommendation',
    title: 'Cosine-similarity matching',
    desc: 'Destination and traveller vectors are compared across travel style, budget, duration, and climate signals.',
  },
  {
    kicker: 'Planning',
    title: 'AI itinerary workflow',
    desc: 'The chat planner turns a selected destination into an editable trip plan that can be saved and reused.',
  },
  {
    kicker: 'Marketplace',
    title: 'Guide offer management',
    desc: 'Travellers post plans, verified guides submit offers, and both sides continue the discussion through chat.',
  },
  {
    kicker: 'Capstone system',
    title: 'Admin and survey coverage',
    desc: 'The project includes admin reporting, guide approvals, marketplace oversight, and a traveller research survey.',
  },
]

const MARKETPLACE_POINTS = [
  'Saved itinerary listings',
  'Verified guide profiles',
  'Price proposals',
  'Offer acceptance flow',
  'In-platform chat',
  'Simulated payments',
]
