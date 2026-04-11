'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

// ── Types ────────────────────────────────────────────────────
interface Destination {
  id: string
  city: string
  country: string
  region: string | null
  short_description: string | null
  budget_level: string | null
  culture: number
  adventure: number
  nature: number
  beaches: number
  nightlife: number
  cuisine: number
  wellness: number
  urban: number
  seclusion: number
  categories: string | null
  match_score?: number
  trip_duration_days?: number
  travel_date_start?: string
  travel_date_end?: string
}

interface TripMeta {
  duration_days: number
  duration_label: string
  travel_month: number
  date_start: string
  date_end: string
  group_size: string
  climate: string
}

// ── Helpers ──────────────────────────────────────────────────
const BUDGET_COLOUR: Record<string, string> = {
  'Budget': 'bg-success-bg text-success',
  'Mid-range': 'bg-warning-bg text-warning',
  'Luxury': 'bg-muted text-amberdark',
}

const TOP_TAGS: { key: keyof Destination; icon: string; label: string }[] = [
  { key: 'culture', icon: '🏛️', label: 'Culture' },
  { key: 'adventure', icon: '🏔️', label: 'Adventure' },
  { key: 'nature', icon: '🌿', label: 'Nature' },
  { key: 'beaches', icon: '🏖️', label: 'Beach' },
  { key: 'nightlife', icon: '🌙', label: 'Nightlife' },
  { key: 'cuisine', icon: '🍜', label: 'Cuisine' },
  { key: 'wellness', icon: '🧘', label: 'Wellness' },
  { key: 'urban', icon: '🏙️', label: 'Urban' },
  { key: 'seclusion', icon: '🌄', label: 'Seclusion' },
]

function getTopTags(dest: Destination, n = 2) {
  return TOP_TAGS
    .map(t => ({ ...t, score: (dest[t.key] as number) ?? 0 }))
    .filter(t => t.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
}

function formatRegion(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function scoreColour(score: number) {
  if (score >= 80) return 'text-success bg-success-bg border-success/20'
  if (score >= 60) return 'text-warning bg-warning-bg border-warning/20'
  return 'text-secondary bg-muted border-border'
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ── City image component ─────────────────────────────────────
function CityImage({ city, country, className = '' }: { city: string; country: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/city-image?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}`)
      .then(r => r.json())
      .then(d => {
        if (!cancelled) {
          setSrc(d.imageUrl ?? null)
          setLoading(false)
        }
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [city, country])

  // Skeleton while loading
  if (loading) {
    return (
      <div className={`bg-subtle animate-pulse ${className}`} />
    )
  }

  // Styled initial placeholder when no image available or image fails
  if (!src || failed) {
    const initial = city.charAt(0).toUpperCase()
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-amber/30 to-charcoal/60 ${className}`}>
        <span className="text-5xl font-extrabold font-display text-warmwhite/70 select-none">
          {initial}
        </span>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={`${city}, ${country}`}
        fill
        unoptimized
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  )
}

// ── Destination card ─────────────────────────────────────────
function DestCard({ dest, rank }: { dest: Destination; rank: number }) {
  const topTags = getTopTags(dest)
  const matchScore = dest.match_score

  return (
    <Link
      href={`/destinations/${dest.id}`}
      onClick={() => {
        if (typeof window !== 'undefined') {
          // Trigger interaction tracking in the background
          fetch('/api/interactions', {
            method: 'POST',
            body: JSON.stringify({ destinationId: dest.id })
          }).catch(() => {/* ignore silenty */})
        }
      }}
      className="group block bg-white border border-border rounded-2xl overflow-hidden hover:border-amber hover:shadow-md transition-all"
    >
      {/* City image */}
      <div className="relative w-full h-40">
        <CityImage city={dest.city} country={dest.country} className="w-full h-full" />
        {/* Rank badge */}
        <span className="absolute top-2 left-2 bg-black/50 text-warmwhite text-xs font-semibold font-body px-2 py-0.5 rounded-full backdrop-blur-sm">
          #{rank}
        </span>
        {/* Match score badge */}
        {typeof matchScore === 'number' && (
          <span className={`absolute top-2 right-2 border font-extrabold font-display text-sm px-2.5 py-1 rounded-xl backdrop-blur-sm ${scoreColour(matchScore)}`}>
            {matchScore}%
          </span>
        )}
      </div>

      <div className="p-5 space-y-3">
        {/* City name + country */}
        <div>
          <h2 className="text-lg font-extrabold font-display text-charcoal leading-snug group-hover:text-amber transition-colors">
            {dest.city}
          </h2>
          <p className="text-sm font-body text-secondary">
            {formatRegion(dest.country)}{dest.region ? `, ${formatRegion(dest.region)}` : ''}
          </p>
        </div>

        {/* Description */}
        {dest.short_description && (
          <p className="text-sm font-body text-secondary leading-relaxed line-clamp-3">
            {dest.short_description}
          </p>
        )}

        {/* Tags row */}
        <div className="flex flex-wrap gap-2">
          {dest.budget_level && (
            <span className={`text-xs font-semibold font-body px-2 py-0.5 rounded-full ${BUDGET_COLOUR[dest.budget_level] ?? 'bg-muted text-secondary'}`}>
              {dest.budget_level}
            </span>
          )}
          {topTags.map(t => (
            <span key={t.key} className="text-xs font-body px-2 py-0.5 rounded-full bg-subtle text-charcoal">
              {t.icon} {t.label}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}

// ── Trip meta banner ─────────────────────────────────────────
function TripMetaBanner({ meta }: { meta: TripMeta }) {
  return (
    <div className="bg-charcoal text-warmwhite rounded-2xl p-5 flex flex-wrap gap-4 items-center justify-between mb-8">
      <div>
        <p className="text-xs font-body text-disabled mb-0.5">Your trip</p>
        <p className="text-base font-extrabold font-display">
          {meta.duration_days} days · {meta.duration_label}
        </p>
      </div>
      <div className="flex flex-wrap gap-4 text-xs font-body text-disabled">
        <span>🗓️ {meta.date_start} → {meta.date_end}</span>
        <span>🌡️ {meta.climate}</span>
        <span>👥 {meta.group_size}</span>
        <span>📅 {MONTH_NAMES[meta.travel_month]} travel</span>
      </div>
      <Link
        href="/quiz"
        className="text-xs font-semibold font-body text-amber hover:text-warmwhite transition-colors shrink-0"
      >
        Retake quiz →
      </Link>
    </div>
  )
}

// ── Sort / filter ─────────────────────────────────────────────
type SortKey = 'match' | 'az' | 'budget_asc' | 'budget_desc'

function sortDestinations(dests: Destination[], sort: SortKey): Destination[] {
  const copy = [...dests]
  const budgetOrder: Record<string, number> = { Budget: 0, 'Mid-range': 1, Luxury: 2 }
  if (sort === 'match') return copy.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))
  if (sort === 'az') return copy.sort((a, b) => a.city.localeCompare(b.city))
  if (sort === 'budget_asc') return copy.sort((a, b) => (budgetOrder[a.budget_level ?? ''] ?? 1) - (budgetOrder[b.budget_level ?? ''] ?? 1))
  if (sort === 'budget_desc') return copy.sort((a, b) => (budgetOrder[b.budget_level ?? ''] ?? 1) - (budgetOrder[a.budget_level ?? ''] ?? 1))
  return copy
}

// ── Inner component ───────────────────────────────────────────
function DestinationsInner() {
  const searchParams = useSearchParams()
  const fromQuiz = searchParams.get('from') === 'quiz'

  const [destinations, setDestinations] = useState<Destination[]>([])
  const [tripMeta, setTripMeta] = useState<TripMeta | null>(null)
  
  const [sort, setSort] = useState<SortKey>('match')
  const [search, setSearch] = useState('')
  const [budgetFilter, setBudgetFilter] = useState<string>('All')
  const [regionFilter, setRegionFilter] = useState<string>('All')

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [discoveryLoading, setDiscoveryLoading] = useState(false)

  useEffect(() => {
    if (fromQuiz) {
      try {
        const raw = sessionStorage.getItem('quiz_results')
        const meta = sessionStorage.getItem('quiz_trip_meta')
        if (raw) setDestinations(JSON.parse(raw))
        if (meta) setTripMeta(JSON.parse(meta))
      } catch { /* ignore */ }
    } else {
      // Discovery Mode: Load initial page + recommendations
      loadDiscovery()
    }
  }, [fromQuiz])

  // Reload catalog when filters change (only in discovery mode)
  useEffect(() => {
    if (!fromQuiz) {
      setPage(1)
      fetchCatalog(1, true)
    }
  }, [search, budgetFilter, regionFilter])

  async function loadDiscovery() {
    setDiscoveryLoading(true)
    try {
      // Fetch first page of all destinations (scored by relevance backend-side)
      await fetchCatalog(1, true)
    } catch { /* ignore */ }
    finally { setDiscoveryLoading(false) }
  }

  async function fetchCatalog(pageNum: number, clear = false) {
    setLoadingMore(true)
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '12',
        search,
        budget: budgetFilter,
        region: regionFilter
      })
      const res = await fetch(`/api/destinations?${params}`)
      const data = await res.json()
      
      if (data.destinations) {
        setDestinations(prev => clear ? data.destinations : [...prev, ...data.destinations])
        setHasMore(data.hasMore)
      }
    } catch { /* ignore */ }
    finally { setLoadingMore(false) }
  }

  function handleLoadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    fetchCatalog(nextPage)
  }

  const filtered = fromQuiz 
    ? sortDestinations(
        destinations.filter(d => {
          const matchSearch = search === '' ||
            d.city.toLowerCase().includes(search.toLowerCase()) ||
            d.country.toLowerCase().includes(search.toLowerCase())
          const matchBudget = budgetFilter === 'All' || d.budget_level === budgetFilter
          const matchRegion = regionFilter === 'All' || d.region === regionFilter
          return matchSearch && matchBudget && matchRegion
        }),
        sort
      )
    : destinations // In discovery mode, sorting and filtering happen server-side for pagination consistency

  const hasResults = destinations.length > 0

  return (
    <div className="min-h-screen bg-warmwhite flex flex-col">

      {/* Page header */}
      <div 
        className="text-warmwhite relative overflow-hidden pt-12 sm:pt-16 pb-8 sm:pb-10 px-4 sm:px-6"
        style={{ background: '#0f0f0f' }}
      >
        {/* Ambient amber glow */}
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

        <div className="relative max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 text-amber text-xs font-semibold px-3 py-1 rounded-full border border-amber/20 mb-2 uppercase tracking-widest">
            {fromQuiz ? 'Your personalised results' : 'Discover Destinations'}
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold font-display mb-2 text-warmwhite">
            {fromQuiz ? 'Your best matches' : 'Explore the World'}
          </h1>
          <p className="text-sm font-body text-disabled">
            {fromQuiz
              ? `${destinations.length} destinations ranked by how well they match your preferences.`
              : 'Browse our full catalog or check out our personalized picks for you.'}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {tripMeta && <TripMetaBanner meta={tripMeta} />}

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Search city or country…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-base pr-10"
            />
            {discoveryLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-border border-t-amber rounded-full animate-spin" />
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['All', 'Budget', 'Mid-range', 'Luxury'].map(b => (
              <button
                key={b}
                onClick={() => setBudgetFilter(b)}
                className={`text-xs font-semibold font-body px-3 py-1.5 rounded-full border transition-colors shrink-0 ${budgetFilter === b
                    ? 'bg-charcoal text-warmwhite border-charcoal'
                    : 'bg-white text-secondary border-border hover:border-amber'
                  }`}
              >
                {b}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 border-l border-border pl-3">
            <button
              onClick={() => setRegionFilter('All')}
              className={`text-xs font-semibold font-body px-3 py-1.5 rounded-full border transition-colors shrink-0 ${regionFilter === 'All'
                  ? 'bg-charcoal text-warmwhite border-charcoal'
                  : 'bg-white text-secondary border-border hover:border-amber'
                }`}
            >
              All Regions
            </button>
            {['africa', 'asia', 'europe', 'middle_east', 'north_america', 'oceania', 'south_america'].map(r => (
              <button
                key={r}
                onClick={() => setRegionFilter(r)}
                className={`text-xs font-semibold font-body px-3 py-1.5 rounded-full border transition-colors shrink-0 ${regionFilter === r
                    ? 'bg-charcoal text-warmwhite border-charcoal'
                    : 'bg-white text-secondary border-border hover:border-amber'
                  }`}
              >
                {formatRegion(r)}
              </button>
            ))}
          </div>
          {fromQuiz && (
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              className="input-base max-w-[180px]"
            >
              <option value="match">Best Match</option>
              <option value="az">Name (A-Z)</option>
              <option value="budget_asc">Price (Low to high)</option>
              <option value="budget_desc">Price (High to low)</option>
            </select>
          )}
        </div>

        {hasResults && filtered.length === 0 && (
          <p className="text-sm font-body text-secondary text-center py-12">
            No destinations match your filters.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((dest, i) => (
            <DestCard key={dest.id + (fromQuiz ? '' : i)} dest={dest} rank={i + 1} />
          ))}
        </div>

        {/* Load more logic */}
        {!fromQuiz && hasMore && (
          <div className="mt-12 flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="bg-charcoal text-warmwhite font-semibold font-body text-sm py-3 px-10 rounded-full hover:bg-amber transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
            >
              {loadingMore && <span className="w-4 h-4 border-2 border-warmwhite/30 border-t-warmwhite rounded-full animate-spin" />}
              {loadingMore ? 'Loading more destinations…' : 'Load More'}
            </button>
          </div>
        )}

        {hasResults && filtered.length === 0 && (
          <p className="text-sm font-body text-secondary text-center py-12">
            No destinations match your filters.
          </p>
        )}

      </div>

    </div>
  )
}

// ── Page export ───────────────────────────────────────────────
export default function DestinationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-warmwhite flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-border border-t-amber rounded-full animate-spin" />
      </div>
    }>
      <DestinationsInner />
    </Suspense>
  )
}
