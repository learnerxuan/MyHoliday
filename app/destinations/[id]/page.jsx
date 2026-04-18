import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import BookingLinks from './BookingLinks'

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
    const { data: hTrips } = await supabase
      .from('historical_trips')
      .select('*')
      .ilike('destination', `%${dest.city}%`)

    if (hTrips) historicalTrips = hTrips
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
    <div className="min-h-screen bg-warmwhite flex flex-col pt-2 pb-24 px-2 sm:px-6">
      <div className="max-w-7xl mx-auto w-full flex flex-col lg:grid lg:grid-cols-4 lg:gap-6 gap-6 lg:items-start">
        
        {/* ── 1. Hero Island (Row 1, Left) ── */}
        <div className="lg:col-span-3 order-2 lg:order-none relative bg-charcoal text-warmwhite rounded-3xl overflow-hidden min-h-[320px] md:min-h-[400px] h-full flex flex-col justify-end p-6 md:p-10 shadow-sm w-full">
          {heroImageUrl ? (
            <div className="absolute inset-0">
              <Image
                src={heroImageUrl}
                alt={`${dest.city}, ${dest.country}`}
                fill
                unoptimized
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/5" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-gray-800" />
          )}
          
          <div className="relative z-10 w-full mt-auto flex flex-col items-start">
            <div className="inline-flex items-center justify-center bg-black/60 backdrop-blur-md text-amber text-xs font-semibold px-4 py-1.5 rounded-full border border-amber-500/50 mb-4 uppercase tracking-[0.15em] leading-none">
              {dest.region ?? dest.country}
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold font-display mb-1 drop-shadow-md">
              {dest.city}
            </h1>
            <p className="text-lg font-body text-warmwhite/90 drop-shadow-sm">{dest.country}</p>

            {/* Quick badges */}
            <div className="flex flex-wrap gap-2 mt-6">
              {dest.budget_level && (
                <span className={`text-xs font-semibold font-body px-3 py-1.5 rounded-full shadow-sm ${BUDGET_COLOUR[dest.budget_level] ?? 'bg-muted text-secondary'}`}>
                  {dest.budget_level}
                </span>
              )}
              {tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs font-semibold font-body px-3 py-1.5 rounded-full bg-white text-charcoal shadow-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── 2. Top Right Islands (Row 1, Right) ── */}
        <div className="lg:col-span-1 order-1 lg:order-none flex flex-col gap-6 w-full">
          
          {/* AI Planner Island */}
          <div className="relative bg-charcoal text-warmwhite rounded-3xl overflow-hidden p-6 shadow-md border border-white/10 flex flex-col gap-4">
            {/* Ambient amber glow */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-40"
              style={{
                background: 'radial-gradient(circle at top right, rgba(196,135,74,0.2) 0%, transparent 70%)',
              }}
            />
            <div className="relative z-10">
              <h3 className="text-xl font-extrabold font-display mt-1 mb-2">Ready to plan this trip?</h3>
              <p className="text-sm font-body text-warmwhite/70 leading-relaxed mb-6">
                Our AI builds a personalised day-by-day itinerary for you — for free.
              </p>
              <Link
                href={`/itinerary?city=${dest.id}`}
                className="block w-full bg-amber text-warmwhite text-sm font-semibold font-body text-center py-4 rounded-2xl hover:bg-amberdark transition-all shadow-[0_0_15px_rgba(196,135,74,0.15)] hover:shadow-[0_0_20px_rgba(196,135,74,0.25)]"
              >
                Start Planning with AI ✨
              </Link>
            </div>
          </div>

          {/* Trip Details Island */}
          {(dest.ideal_durations || dest.best_time_to_visit) && (
            <div className="bg-white rounded-3xl border border-border p-6 shadow-sm flex flex-col gap-5">
              {dest.ideal_durations && (
                <div>
                  <p className="text-xs font-semibold font-body text-tertiary mb-1 uppercase tracking-wide">Ideal duration</p>
                  <p className="text-base font-bold font-display text-charcoal">
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
              {dest.best_time_to_visit && (
                <div>
                  <p className="text-xs font-semibold font-body text-tertiary mb-1 uppercase tracking-wide">Best time to visit</p>
                  <p className="text-base font-bold font-display text-charcoal">
                    {dest.best_time_to_visit}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── 3. Main Content Islands (Row 2, Left) ── */}
        <div className="lg:col-span-3 order-3 lg:order-none flex flex-col gap-6 w-full">

          {/* Description Island */}
          {dest.short_description && (
            <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-border">
              <h2 className="text-xl font-extrabold font-display mb-3">About {dest.city}</h2>
              <p className="text-sm font-body text-secondary leading-relaxed">
                {dest.short_description}
              </p>
            </section>
          )}

          {/* Travel style scores Island */}
          {scores.length > 0 && (
            <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-border">
              <h2 className="text-xl font-extrabold font-display mb-6">Travel Style</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">
                {scores.map(([key, { label, emoji }]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-base flex items-center justify-center w-8 h-8 shrink-0 bg-subtle rounded-full">{emoji}</span>
                    <span className="text-sm font-semibold font-body text-charcoal w-24 shrink-0">{label}</span>
                    <ScoreBar value={dest[key]} />
                    <span className="text-xs font-semibold font-body text-secondary w-8 text-right shrink-0">{dest[key]}/5</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Weather Island */}
          {validTemps.length > 0 && (() => {
            // Expanded SVG dimensions for a bigger, clearer graph
            const W = 800, H = 260
            const PAD = { top: 40, right: 28, bottom: 40, left: 28 }
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
              <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-border">
                <h2 className="text-xl font-extrabold font-display mb-4">Weather by Month</h2>
                <div className="overflow-x-auto overflow-y-hidden w-full">
                  <svg
                    viewBox={`0 0 ${W} ${H}`}
                    className="w-full h-auto mt-2 drop-shadow-sm min-w-[500px]"
                    style={{ maxHeight: '350px' }}
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
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Dots + labels for every month */}
                    {points.map((p, i) => p.y !== null && (
                      <g key={i}>
                        {/* Temp label above dot */}
                        <text
                          x={p.x}
                          y={p.y - 12}
                          textAnchor="middle"
                          fontSize="13"
                          fontWeight="600"
                          fill="#888888"
                          fontFamily="var(--font-body, serif)"
                        >
                          {p.t}°
                        </text>
                        {/* Dot */}
                        <circle cx={p.x} cy={p.y} r="5" fill="#FAF9F7" stroke="#C4874A" strokeWidth="2.5" />
                        {/* Month label */}
                        <text
                          x={p.x}
                          y={H - PAD.bottom + 26}
                          textAnchor="middle"
                          fontSize="13"
                          fontWeight="500"
                          fill="#888888"
                          fontFamily="var(--font-body, serif)"
                        >
                          {p.month}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
                <p className="text-xs font-body text-tertiary mt-4 pl-4 border-l-2 border-border">Average temperature in °C</p>
              </section>
            )
          })()}

          {/* ── Historical Trips section ── */}
          {hasHistory && (
            <section className="bg-white rounded-[40px] p-6 md:p-10 shadow-sm border border-border">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-extrabold font-display">Real Traveller Data</h2>
                <span className="text-xs font-semibold font-body text-secondary bg-muted px-3 py-1 rounded-full border border-border/50">
                  {historicalTrips.length} trip{historicalTrips.length !== 1 ? 's' : ''} recorded
                </span>
              </div>
              <p className="text-sm font-body text-tertiary mb-6">
                Aggregated from historical trip records for destinations matching &quot;{dest.city}&quot;. Use as a general reference.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {avgDuration !== null && (
                  <div className="bg-subtle rounded-3xl p-5 border border-border/50">
                    <p className="text-xs font-semibold text-tertiary uppercase tracking-wide mb-1 flex items-center justify-between">
                      Avg. trip duration
                    </p>
                    <p className="text-3xl font-extrabold font-display text-charcoal">
                      {avgDuration.toFixed(0)} <span className="text-sm font-body font-normal text-secondary uppercase tracking-wider ml-0.5">days</span>
                    </p>
                  </div>
                )}
                {avgAccomCost !== null && (
                  <div className="bg-subtle rounded-3xl p-5 border border-border/50">
                    <p className="text-xs font-semibold text-tertiary uppercase tracking-wide mb-1 flex items-center justify-between">
                      Avg. accommodation
                    </p>
                    <p className="text-3xl font-extrabold font-display text-charcoal">
                      ${avgAccomCost.toFixed(0)} <span className="text-sm font-body font-normal text-secondary uppercase tracking-wider ml-0.5">USD</span>
                    </p>
                  </div>
                )}
                {avgTransCost !== null && (
                  <div className="bg-subtle rounded-3xl p-5 border border-border/50">
                    <p className="text-xs font-semibold text-tertiary uppercase tracking-wide mb-1 flex items-center justify-between">
                      Avg. transport cost
                    </p>
                    <p className="text-3xl font-extrabold font-display text-charcoal">
                      ${avgTransCost.toFixed(0)} <span className="text-sm font-body font-normal text-secondary uppercase tracking-wider ml-0.5">USD</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {topAccom.length > 0 && (
                  <div className="bg-white border border-border/80 rounded-3xl p-6 shadow-sm">
                    <p className="text-sm font-extrabold font-display text-charcoal mb-4">Popular accommodation</p>
                    <div className="space-y-3">
                      {topAccom.map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-sm font-body text-secondary truncate">{type}</span>
                          <span className="text-xs font-semibold font-body text-charcoal ml-2 shrink-0 bg-subtle px-2.5 py-1 rounded-lg">{count} trips</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {topTrans.length > 0 && (
                  <div className="bg-white border border-border/80 rounded-3xl p-6 shadow-sm">
                    <p className="text-sm font-extrabold font-display text-charcoal mb-4">Popular transport</p>
                    <div className="space-y-3">
                      {topTrans.map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-sm font-body text-secondary truncate">{type}</span>
                          <span className="text-xs font-semibold font-body text-charcoal ml-2 shrink-0 bg-subtle px-2.5 py-1 rounded-lg">{count} trips</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {nationalities.length > 0 && (
                  <div className="bg-white border border-border/80 rounded-3xl p-6 shadow-sm">
                    <p className="text-sm font-extrabold font-display text-charcoal mb-4">Top visiting nationalities</p>
                    <div className="space-y-3">
                      {nationalities.map(([nat, count]) => (
                        <div key={nat} className="flex items-center justify-between">
                          <span className="text-sm font-body text-secondary truncate">{nat}</span>
                          <span className="text-xs font-semibold font-body text-charcoal ml-2 shrink-0 bg-subtle px-2.5 py-1 rounded-lg">{count} trips</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {genderSplit.length > 0 && (
                  <div className="bg-white border border-border/80 rounded-3xl p-6 shadow-sm">
                    <p className="text-sm font-extrabold font-display text-charcoal mb-4">Traveller gender split</p>
                    <div className="space-y-3">
                      {genderSplit.map(([gender, count]) => (
                        <div key={gender} className="flex items-center gap-3">
                          <span className="text-sm font-body text-secondary w-16 shrink-0">{gender}</span>
                          <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber rounded-full"
                              style={{ width: `${(count / historicalTrips.length) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold font-body text-secondary w-8 text-right shrink-0">
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

        {/* ── 4. External Links Island (Row 2, Right) ── */}
        <div className="lg:col-span-1 order-4 lg:order-none w-full">
          <section className="bg-white rounded-3xl border border-border p-6 shadow-sm flex flex-col gap-4">
            <h2 className="text-xl font-extrabold font-display">External Resources</h2>
            <BookingLinks city={dest.city} />
          </section>
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
