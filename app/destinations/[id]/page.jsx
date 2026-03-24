import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// ── Helpers ───────────────────────────────────────────────────

const SCORE_LABELS = {
  culture:    { label: 'Culture',    emoji: '🏛️' },
  adventure:  { label: 'Adventure',  emoji: '🧗' },
  nature:     { label: 'Nature',     emoji: '🌿' },
  beaches:    { label: 'Beaches',    emoji: '🏖️' },
  nightlife:  { label: 'Nightlife',  emoji: '🌙' },
  cuisine:    { label: 'Cuisine',    emoji: '🍜' },
  wellness:   { label: 'Wellness',   emoji: '🧘' },
  urban:      { label: 'Urban',      emoji: '🏙️' },
  seclusion:  { label: 'Seclusion', emoji: '🌄' },
}

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTH_KEYS  = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']

const BUDGET_COLOUR = {
  'Budget':    'bg-success-bg text-success',
  'Mid-range': 'bg-warning-bg text-warning',
  'Luxury':    'bg-muted text-amberdark',
}

function ScoreBar({ value }) {
  const pct = Math.round((value / 5) * 100)
  return (
    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
      <div
        className="h-full bg-amber rounded-full"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default async function DestinationPage({ params }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const { data: dest, error } = await supabase
    .from('destinations')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !dest) notFound()

  // Parse categories string into array
  const tags = dest.categories
    ? dest.categories.split(',').map(t => t.trim()).filter(Boolean)
    : []

  // Monthly temps
  const temps = MONTH_KEYS.map(k => dest.avg_temp_monthly?.[k] ?? null)
  const validTemps = temps.filter(t => t !== null)
  const maxTemp = validTemps.length ? Math.max(...validTemps) : 40
  const minTemp = validTemps.length ? Math.min(...validTemps) : 0

  // Travel style scores
  const scores = Object.entries(SCORE_LABELS).filter(([key]) => dest[key] > 0)

  return (
    <div className="min-h-screen bg-warmwhite">

      {/* ── Hero ── */}
      <div className="bg-charcoal text-warmwhite">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <p className="text-sm font-semibold font-body text-amber uppercase tracking-widest mb-2">
            {dest.region ?? dest.country}
          </p>
          <h1 className="text-5xl font-extrabold font-display mb-1">
            {dest.city}
          </h1>
          <p className="text-lg font-body text-subtle opacity-80">{dest.country}</p>

          {/* Quick badges */}
          <div className="flex flex-wrap gap-2 mt-6">
            {dest.budget_level && (
              <span className={`text-xs font-semibold font-body px-3 py-1 rounded-full ${BUDGET_COLOUR[dest.budget_level] ?? 'bg-muted text-secondary'}`}>
                {dest.budget_level}
              </span>
            )}
            {dest.best_time_to_visit && (
              <span className="text-xs font-semibold font-body px-3 py-1 rounded-full bg-subtle text-charcoal">
                Best time: {dest.best_time_to_visit}
              </span>
            )}
            {dest.ideal_durations?.recommended && (
              <span className="text-xs font-semibold font-body px-3 py-1 rounded-full bg-subtle text-charcoal">
                {dest.ideal_durations.recommended} days recommended
              </span>
            )}
            {tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs font-semibold font-body px-3 py-1 rounded-full bg-subtle text-charcoal">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left column — main content */}
        <div className="lg:col-span-2 flex flex-col gap-8">

          {/* Description */}
          {dest.short_description && (
            <section>
              <h2 className="text-xl font-extrabold font-display mb-3">About {dest.city}</h2>
              <p className="text-sm font-body text-secondary leading-relaxed">
                {dest.short_description}
              </p>
            </section>
          )}

          {/* Travel style scores */}
          {scores.length > 0 && (
            <section>
              <h2 className="text-xl font-extrabold font-display mb-4">Travel Style</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {scores.map(([key, { label, emoji }]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-base w-6 text-center">{emoji}</span>
                    <span className="text-xs font-semibold font-body text-charcoal w-20 shrink-0">{label}</span>
                    <ScoreBar value={dest[key]} />
                    <span className="text-xs font-body text-secondary w-6 text-right">{dest[key]}/5</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Weather */}
          {validTemps.length > 0 && (
            <section>
              <h2 className="text-xl font-extrabold font-display mb-4">Weather by Month</h2>
              <div className="flex items-end gap-1.5 h-24">
                {temps.map((t, i) => {
                  if (t === null) return <div key={i} className="flex-1" />
                  const range = maxTemp - minTemp || 1
                  const heightPct = ((t - minTemp) / range) * 70 + 30
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-body text-secondary">{t}°</span>
                      <div
                        className="w-full bg-amber rounded-t"
                        style={{ height: `${heightPct}%` }}
                      />
                      <span className="text-xs font-body text-tertiary">{MONTH_SHORT[i]}</span>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs font-body text-tertiary mt-2">Average temperature in °C</p>
            </section>
          )}

          {/* External booking links */}
          <section>
            <h2 className="text-xl font-extrabold font-display mb-4">Plan Your Trip</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(dest.city)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-amber transition-colors group"
              >
                <span className="text-2xl">🏨</span>
                <div>
                  <p className="text-sm font-semibold font-body text-charcoal group-hover:text-amber transition-colors">
                    Find Hotels
                  </p>
                  <p className="text-xs font-body text-secondary">Search on Booking.com</p>
                </div>
              </a>
              <a
                href={`https://www.google.com/flights?q=flights+to+${encodeURIComponent(dest.city)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-amber transition-colors group"
              >
                <span className="text-2xl">✈️</span>
                <div>
                  <p className="text-sm font-semibold font-body text-charcoal group-hover:text-amber transition-colors">
                    Find Flights
                  </p>
                  <p className="text-xs font-body text-secondary">Search on Google Flights</p>
                </div>
              </a>
              <a
                href={`https://www.tripadvisor.com/Search?q=${encodeURIComponent(dest.city)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-amber transition-colors group"
              >
                <span className="text-2xl">🎯</span>
                <div>
                  <p className="text-sm font-semibold font-body text-charcoal group-hover:text-amber transition-colors">
                    Things To Do
                  </p>
                  <p className="text-xs font-body text-secondary">Browse on TripAdvisor</p>
                </div>
              </a>
              <a
                href={`https://www.lonelyplanet.com/search?q=${encodeURIComponent(dest.city)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-amber transition-colors group"
              >
                <span className="text-2xl">📖</span>
                <div>
                  <p className="text-sm font-semibold font-body text-charcoal group-hover:text-amber transition-colors">
                    Travel Guide
                  </p>
                  <p className="text-xs font-body text-secondary">Read on Lonely Planet</p>
                </div>
              </a>
            </div>
          </section>
        </div>

        {/* Right column — sticky CTA card */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 bg-white rounded-2xl border border-border p-6 flex flex-col gap-4 shadow-sm">
            <div>
              <h3 className="text-lg font-extrabold font-display">{dest.city}</h3>
              <p className="text-sm font-body text-secondary">{dest.country}</p>
            </div>

            {dest.budget_level && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-body text-secondary">Budget level</span>
                <span className={`text-xs font-semibold font-body px-2 py-0.5 rounded-full ${BUDGET_COLOUR[dest.budget_level] ?? 'bg-muted text-secondary'}`}>
                  {dest.budget_level}
                </span>
              </div>
            )}

            {dest.ideal_durations && (
              <div>
                <p className="text-xs font-body text-secondary mb-1">Ideal duration</p>
                <p className="text-sm font-semibold font-body text-charcoal">
                  {dest.ideal_durations.min && dest.ideal_durations.max
                    ? `${dest.ideal_durations.min}–${dest.ideal_durations.max} days`
                    : dest.ideal_durations.recommended
                    ? `${dest.ideal_durations.recommended} days`
                    : '—'}
                </p>
              </div>
            )}

            <hr className="border-border" />

            <Link
              href={`/itinerary?city=${dest.id}`}
              className="block w-full bg-amber text-warmwhite text-sm font-semibold font-body text-center py-3 rounded-lg hover:bg-amberdark transition-colors"
            >
              Start Planning with AI ✨
            </Link>

            <p className="text-xs font-body text-tertiary text-center">
              Our AI builds a personalised day-by-day itinerary for you — for free.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── 404 ───────────────────────────────────────────────────────

export async function generateMetadata({ params }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: dest } = await supabase
    .from('destinations')
    .select('city, country')
    .eq('id', id)
    .single()

  if (!dest) return { title: 'Destination Not Found' }
  return { title: `${dest.city}, ${dest.country} — MyHoliday` }
}
