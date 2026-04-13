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
    <div className="w-full bg-[#F5F2EE] min-h-screen pb-24 pt-8 sm:pt-12 px-4 sm:px-6 lg:px-8 font-body">
      <div className="max-w-[1100px] mx-auto p-6 lg:p-12 bg-white rounded-[24px] shadow-sm border border-border/50">
        
        {/* Header Section */}
        <div className="mb-8">
           <div className="inline-block bg-[#EAF3DE] text-[#3B6D11] px-3 py-1.5 rounded-md text-[11px] font-bold tracking-[0.15em] uppercase mb-3 text-center sm:text-left">
             {fromQuiz ? 'Your tailored matches' : 'Explore the World'}
           </div>
           <h1 className="font-display font-extrabold text-[32px] sm:text-[36px] text-charcoal m-0 leading-tight text-center sm:text-left">
             {fromQuiz ? 'Your personalised itinerary recommendations' : 'Browse Destinations'}
           </h1>
           <p className="text-secondary text-[15px] mt-3 text-center sm:text-left">
             {fromQuiz ? `${destinations.length} destinations ranked by how well they match your preferences.` : 'Discover curated cities matched precisely to your unique travel algorithm.'}
           </p>
        </div>

        {/* Smart Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 relative">
           <div className="flex-1 relative flex items-center">
              <span className="absolute left-5 text-[18px]">🔍</span>
              <input type="text" placeholder="Search cities, countries, or regions..." value={search} onChange={e => setSearch(e.target.value)} className="w-full py-4 pr-4 pl-[50px] border-2 border-[#EBEBEB] rounded-xl outline-none text-[14px] bg-[#FDFCFB] text-charcoal font-medium focus:border-charcoal transition-colors" />
              {discoveryLoading && (
                <div className="absolute right-4 w-5 h-5 border-2 border-border border-t-amber rounded-full animate-spin" />
              )}
           </div>
           <button className="px-8 bg-[#1A1A1A] hover:bg-black text-white rounded-xl cursor-pointer font-bold text-[14px] transition-colors py-[15px] sm:py-0 shrink-0">Search</button>
        </div>

        {/* Comprehensive Dynamic Filters */}
        <div className="bg-[#FAF9F7] border border-[#E5E0DA] rounded-[16px] p-5 sm:p-6 mb-10">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
             {/* Region Filter */}
             <div>
                <div className="text-[11px] font-bold text-[#888] uppercase tracking-[1px] mb-3">Primary Region</div>
                <div className="flex gap-2 flex-wrap">
                  {['All', 'africa', 'asia', 'europe', 'middle_east', 'north_america', 'oceania', 'south_america'].map((r) => (
                    <button key={r} onClick={() => setRegionFilter(r)} className={`px-4 py-2 text-[12px] rounded-lg border-2 transition-colors cursor-pointer ${regionFilter === r ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] font-bold' : 'bg-transparent text-secondary border-[#E5E0DA] hover:border-[#1A1A1A] font-medium'}`}>
                       {r === 'All' ? 'All Regions' : formatRegion(r)}
                    </button>
                  ))}
                </div>
             </div>

             {/* Budget Filter */}
             <div>
                <div className="text-[11px] font-bold text-[#888] uppercase tracking-[1px] mb-3">Estimated Cost</div>
                <div className="flex gap-2 flex-wrap">
                  {['All', 'Budget', 'Mid-range', 'Luxury'].map((b) => (
                    <button key={b} onClick={() => setBudgetFilter(b)} className={`px-4 py-2 text-[12px] rounded-lg border-2 transition-colors cursor-pointer ${budgetFilter === b ? 'bg-[#EAF3DE] text-[#3B6D11] border-[#3B6D11] font-bold' : 'bg-transparent text-secondary border-[#E5E0DA] hover:border-[#3B6D11] font-medium'}`}>
                       {b}
                    </button>
                  ))}
                </div>
             </div>
           </div>
        </div>

        {tripMeta && <div className="mb-8"><TripMetaBanner meta={tripMeta} /></div>}

        {/* Listing Header */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4 pt-2 border-t border-[#F0EDE9]">
           <div className="text-[16px] font-bold text-[#1A1A1A]">{filtered.length} Destinations Found</div>
           
           {fromQuiz && (
             <div className="flex items-center gap-2">
                <div className="text-[13px] text-[#888] font-bold uppercase tracking-wider">Sort by:</div>
                <select value={sort} onChange={e => setSort(e.target.value as SortKey)} className="text-[13px] font-bold text-[#1A1A1A] bg-transparent border-none outline-none cursor-pointer">
                  <option value="match">Match Score (Highest) ↓</option>
                  <option value="az">Name (A-Z)</option>
                  <option value="budget_asc">Price (Low to high)</option>
                  <option value="budget_desc">Price (High to low)</option>
                </select>
             </div>
           )}
        </div>

        {hasResults && filtered.length === 0 && (
          <p className="text-[14px] text-secondary text-center py-16 bg-[#FDFCFB] rounded-[16px] border border-[#EBEBEB]">
            No destinations match your filters. Try widening your search!
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
              className="px-8 py-3.5 bg-[#1A1A1A] hover:bg-black text-white text-[14px] font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 relative overflow-hidden"
            >
              {loadingMore && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {loadingMore ? 'Loading more…' : 'Load More'}
            </button>
          </div>
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
