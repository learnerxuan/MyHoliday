import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { query } from '@/lib/supabase/db'

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

// ── Historical trips stat helpers ─────────────────────────────

function avg(arr) {
  if (!arr.length) return null
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function countBy(arr, key) {
  const counts = {}
  for (const item of arr) {
    const v = item[key]
    if (v) counts[v] = (counts[v] || 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])
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

  // Fetch historical trips that match this city name (fuzzy, case-insensitive)
  let historicalTrips = []
  try {
    const result = await query(
      `SELECT * FROM historical_trips WHERE LOWER(destination) LIKE LOWER($1)`,
      [`%${dest.city}%`]
    )
    historicalTrips = result.rows
  } catch { /* non-fatal */ }

  // Fetch a city image directly from Wikipedia (server-side, no localhost needed)
  let heroImageUrl = null
  try {
    for (const q of [`${dest.city}, ${dest.country}`, dest.city]) {
      const imgRes = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`,
        {
          headers: { 'User-Agent': 'MyHoliday/1.0 (Capstone)' },
          signal: AbortSignal.timeout(4000),
          next: { revalidate: 86400 }, // cache 24h
        }
      )
      if (imgRes.ok) {
        const imgData = await imgRes.json()
        heroImageUrl = imgData?.originalimage?.source ?? imgData?.thumbnail?.source ?? null
        if (heroImageUrl) break
      }
    }
  } catch { /* fallback to no image */ }


  // Parse categories string into array
  const tags = dest.categories
    ? dest.categories.split(',').map(t => t.trim()).filter(Boolean)
    : []

  // Monthly temps (use numeric keys 1–12)
  const temps = Array.from({ length: 12 }, (_, i) => {
    const monthData = dest.avg_temp_monthly?.[String(i + 1)]
    return monthData?.avg ?? null
  })
  const validTemps = temps.filter(t => t !== null)
  const maxTemp = validTemps.length ? Math.max(...validTemps) : 40
  const minTemp = validTemps.length ? Math.min(...validTemps) : 0

  // Travel style scores
  const scores = Object.entries(SCORE_LABELS).filter(([key]) => dest[key] > 0)

  // Historical stats
  const hasHistory = historicalTrips.length > 0
  const avgDuration = avg(historicalTrips.map(t => t.duration_days).filter(Boolean))
  const avgAccomCost = avg(historicalTrips.map(t => parseFloat(t.accommodation_cost)).filter(Boolean))
  const avgTransCost = avg(historicalTrips.map(t => parseFloat(t.transportation_cost)).filter(Boolean))
  const topAccom = countBy(historicalTrips, 'accommodation_type').slice(0, 3)
  const topTrans = countBy(historicalTrips, 'transportation_type').slice(0, 3)
  const genderSplit = countBy(historicalTrips, 'traveler_gender')
  const nationalities = countBy(historicalTrips, 'traveler_nationality').slice(0, 4)

  return (
    <div className="min-h-screen bg-warmwhite">

      {/* ── Hero ── */}
      <div className="relative bg-charcoal text-warmwhite overflow-hidden">
        {/* Background image */}
        {heroImageUrl && (
          <div className="absolute inset-0">
            <Image
              src={heroImageUrl}
              alt={`${dest.city}, ${dest.country}`}
              fill
              unoptimized
              className="object-cover opacity-30"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-charcoal/60 via-charcoal/50 to-charcoal" />
          </div>
        )}

        <div className="relative max-w-5xl mx-auto px-6 py-20">
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
          {validTemps.length > 0 && (() => {
            // Build chart from only the months that have data
            const W = 560, H = 140
            const PAD = { top: 28, right: 16, bottom: 28, left: 16 }
            const chartW = W - PAD.left - PAD.right
            const chartH = H - PAD.top - PAD.bottom
            const range = maxTemp - minTemp || 1

            // Points for every month (x evenly spaced, y from temp)
            const points = temps.map((t, i) => ({
              x: PAD.left + (i / 11) * chartW,
              y: t !== null ? PAD.top + chartH - ((t - minTemp) / range) * chartH : null,
              t,
              month: MONTH_SHORT[i],
            }))

            const validPts = points.filter(p => p.y !== null)

            // Build smooth cubic-bezier path
            function smoothPath(pts) {
              if (pts.length < 2) return ''
              let d = `M ${pts[0].x} ${pts[0].y}`
              for (let i = 1; i < pts.length; i++) {
                const prev = pts[i - 1]
                const curr = pts[i]
                const cp1x = prev.x + (curr.x - prev.x) / 3
                const cp2x = curr.x - (curr.x - prev.x) / 3
                d += ` C ${cp1x} ${prev.y} ${cp2x} ${curr.y} ${curr.x} ${curr.y}`
              }
              return d
            }

            const linePath = smoothPath(validPts)
            // Area: close below the line
            const first = validPts[0], last = validPts[validPts.length - 1]
            const areaPath = linePath
              + ` L ${last.x} ${H - PAD.bottom} L ${first.x} ${H - PAD.bottom} Z`

            return (
              <section>
                <h2 className="text-xl font-extrabold font-display mb-4">Weather by Month</h2>
                <div className="overflow-x-auto">
                  <svg
                    viewBox={`0 0 ${W} ${H}`}
                    className="w-full"
                    style={{ minWidth: '320px', height: '140px' }}
                  >
                    <defs>
                      <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C4874A" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#C4874A" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>

                    {/* Filled area */}
                    <path d={areaPath} fill="url(#tempGrad)" />

                    {/* Smooth line */}
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#C4874A"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Dots + labels for every month */}
                    {points.map((p, i) => p.y !== null && (
                      <g key={i}>
                        {/* Temp label above dot */}
                        <text
                          x={p.x}
                          y={p.y - 8}
                          textAnchor="middle"
                          fontSize="9"
                          fill="#999999"
                          fontFamily="var(--font-body, serif)"
                        >
                          {p.t}°
                        </text>
                        {/* Dot */}
                        <circle cx={p.x} cy={p.y} r="3.5" fill="#C4874A" />
                        {/* Month label */}
                        <text
                          x={p.x}
                          y={H - PAD.bottom + 14}
                          textAnchor="middle"
                          fontSize="9"
                          fill="#999999"
                          fontFamily="var(--font-body, serif)"
                        >
                          {p.month}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
                <p className="text-xs font-body text-tertiary mt-1">Average temperature in °C</p>
              </section>
            )
          })()}


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

          {/* ── Historical Trips section ── */}
          {hasHistory && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-extrabold font-display">Real Traveller Data</h2>
                <span className="text-xs font-body text-secondary bg-muted px-2 py-0.5 rounded-full">
                  {historicalTrips.length} trip{historicalTrips.length !== 1 ? 's' : ''} recorded
                </span>
              </div>
              <p className="text-xs font-body text-tertiary mb-5">
                Aggregated from historical trip records for destinations matching &quot;{dest.city}&quot;. Use as a general reference.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
                {avgDuration !== null && (
                  <div className="bg-subtle rounded-xl p-4">
                    <p className="text-xs font-body text-tertiary mb-1">Avg. trip duration</p>
                    <p className="text-xl font-extrabold font-display text-charcoal">
                      {avgDuration.toFixed(0)} <span className="text-sm font-body font-normal text-secondary">days</span>
                    </p>
                  </div>
                )}
                {avgAccomCost !== null && (
                  <div className="bg-subtle rounded-xl p-4">
                    <p className="text-xs font-body text-tertiary mb-1">Avg. accommodation cost</p>
                    <p className="text-xl font-extrabold font-display text-charcoal">
                      ${avgAccomCost.toFixed(0)} <span className="text-sm font-body font-normal text-secondary">USD</span>
                    </p>
                  </div>
                )}
                {avgTransCost !== null && (
                  <div className="bg-subtle rounded-xl p-4">
                    <p className="text-xs font-body text-tertiary mb-1">Avg. transport cost</p>
                    <p className="text-xl font-extrabold font-display text-charcoal">
                      ${avgTransCost.toFixed(0)} <span className="text-sm font-body font-normal text-secondary">USD</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {topAccom.length > 0 && (
                  <div className="bg-white border border-border rounded-xl p-4">
                    <p className="text-xs font-semibold font-body text-charcoal mb-3">Popular accommodation</p>
                    <div className="space-y-2">
                      {topAccom.map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-xs font-body text-secondary truncate">{type}</span>
                          <span className="text-xs font-semibold font-body text-charcoal ml-2 shrink-0">{count} trips</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {topTrans.length > 0 && (
                  <div className="bg-white border border-border rounded-xl p-4">
                    <p className="text-xs font-semibold font-body text-charcoal mb-3">Popular transport</p>
                    <div className="space-y-2">
                      {topTrans.map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-xs font-body text-secondary truncate">{type}</span>
                          <span className="text-xs font-semibold font-body text-charcoal ml-2 shrink-0">{count} trips</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {nationalities.length > 0 && (
                  <div className="bg-white border border-border rounded-xl p-4">
                    <p className="text-xs font-semibold font-body text-charcoal mb-3">Top visiting nationalities</p>
                    <div className="space-y-2">
                      {nationalities.map(([nat, count]) => (
                        <div key={nat} className="flex items-center justify-between">
                          <span className="text-xs font-body text-secondary truncate">{nat}</span>
                          <span className="text-xs font-semibold font-body text-charcoal ml-2 shrink-0">{count} trips</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {genderSplit.length > 0 && (
                  <div className="bg-white border border-border rounded-xl p-4">
                    <p className="text-xs font-semibold font-body text-charcoal mb-3">Traveller gender split</p>
                    <div className="space-y-2">
                      {genderSplit.map(([gender, count]) => (
                        <div key={gender} className="flex items-center gap-2">
                          <span className="text-xs font-body text-secondary w-16 shrink-0">{gender}</span>
                          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber rounded-full"
                              style={{ width: `${(count / historicalTrips.length) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-body text-secondary w-8 text-right shrink-0">
                            {Math.round((count / historicalTrips.length) * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

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
                    : Array.isArray(dest.ideal_durations) && dest.ideal_durations.length > 0
                    ? dest.ideal_durations.join(', ')
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

// ── Metadata ───────────────────────────────────────────────────

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
