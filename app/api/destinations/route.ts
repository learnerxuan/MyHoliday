import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
import {
  scoreDestinations,
  inferPreferences,
  extractPreferredCountries,
  Destination,
} from '@/lib/recommendation'

// ── Weighted random shuffle ───────────────────────────────────
// Fallback when a user has no behavioural signals at all.
// Destinations with a higher average category score surface
// slightly more often, but there is enough randomness to produce
// a fresh order every page load.
function weightedRandomShuffle(dests: Destination[]): Destination[] {
  const avgScore = (d: Destination) =>
    (d.culture + d.adventure + d.nature + d.beaches +
     d.nightlife + d.cuisine + d.wellness + d.urban + d.seclusion) / 9

  return [...dests]
    .map(d => ({ d, key: avgScore(d) * Math.random() }))
    .sort((a, b) => b.key - a.key)
    .map(x => x.d)
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const page   = parseInt(searchParams.get('page') || '1', 10)
    const limit  = parseInt(searchParams.get('limit') || '12', 10)
    const search = searchParams.get('search') || ''
    const budget = searchParams.get('budget') || 'All'
    const region = searchParams.get('region') || 'All'

    const startIndex = (page - 1) * limit
    const endIndex   = startIndex + limit

    const supabase = await createSupabaseServerClient()

    // Security: use getUser() instead of getSession()
    const { data: { user } } = await supabase.auth.getUser()

    let inferredPrefs = null
    let preferredCountries = new Map<string, number>()
    let debugSignals = { itineraries: 0, interactions: 0, chatSessions: 0 }

    if (user) {
      // ── Fetch all three signal sources in parallel ────────────
      const [
        { data: itineraries },
        { data: interactions },
        { data: chatSessions },
      ] = await Promise.all([
        // Hard Signal: saved itineraries
        supabase
          .from('itineraries')
          .select('trip_metadata')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),

        // Interest Signal: clicked destinations (joined for style/region/country data)
        supabase
          .from('user_interactions')
          .select('*, destinations(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),

        // Strong Interest Signal: chat session planner_state
        // Join destinations for region AND country
        supabase
          .from('chat_sessions')
          .select('planner_state, destinations(region, country)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(15),
      ])

      debugSignals = {
        itineraries: itineraries?.length ?? 0,
        interactions: interactions?.length ?? 0,
        chatSessions: chatSessions?.length ?? 0,
      }

      if (itineraries?.length || interactions?.length || chatSessions?.length) {
        inferredPrefs = inferPreferences(
          itineraries || [],
          interactions || [],
          chatSessions || []
        )
        preferredCountries = extractPreferredCountries(
          interactions || [],
          itineraries || [],
          chatSessions || []
        )
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[Discovery] User signals:', debugSignals)
        console.log('[Discovery] Inferred prefs:', inferredPrefs)
        console.log('[Discovery] Preferred countries:', Object.fromEntries(preferredCountries))
      }
    }

    // ── Fetch destinations matching the UI filters ────────────
    let query = supabase
      .from('destinations')
      .select(`
        id, city, country, region, short_description,
        latitude, longitude, budget_level, ideal_durations,
        avg_temp_monthly,
        culture, adventure, nature, beaches, nightlife,
        cuisine, wellness, urban, seclusion,
        categories, best_time_to_visit
      `)

    if (search) {
      query = query.or(`city.ilike.%${search}%,country.ilike.%${search}%`)
    }
    if (budget !== 'All') {
      query = query.eq('budget_level', budget)
    }
    if (region !== 'All') {
      query = query.eq('region', region)
    }

    const { data: destinationsArray, error: dbError } = await query

    if (dbError || !destinationsArray) {
      throw new Error(dbError?.message || 'Failed to fetch destinations')
    }

    let results = destinationsArray as unknown as Destination[]

    if (inferredPrefs) {
      // ── Step 1: Score by cosine similarity ────────────────────
      const scored = scoreDestinations(results, inferredPrefs) as any[]

      // ── Step 2: Region affinity boost (+20 pts) ───────────────
      // Destinations in the user's preferred regions (learned from
      // what they clicked/saved/chatted about) float to the top.
      // Only applied when we have a real region signal (< all 7 regions).
      const preferredRegions = new Set(inferredPrefs.regions)
      const hasRegionSignal = preferredRegions.size > 0 && inferredPrefs.regions.length < 7

      if (hasRegionSignal) {
        scored.forEach((d: any) => {
          if (preferredRegions.has(d.region)) {
            d.match_score = d.match_score + 20
          }
        })
      }

      // ── Step 3: Country affinity boost (up to +15 pts) ────────
      // More specific than region — if you've clicked destinations
      // in Japan, Japanese destinations rank even higher than the
      // rest of Asia. Frequency-weighted: each additional click in
      // the same country adds +5 pts, capped at +15 per destination.
      if (preferredCountries.size > 0) {
        scored.forEach((d: any) => {
          const clicks = preferredCountries.get(d.country) || 0
          if (clicks > 0) {
            d.match_score = d.match_score + Math.min(clicks * 5, 15)
          }
        })
      }

      // ── Step 4: Re-sort after all boosts ──────────────────────
      scored.sort((a: any, b: any) => {
        if (b.match_score !== a.match_score) {
          return b.match_score - a.match_score
        }
        // Fallback secondary sort by country, then city name
        if (a.country !== b.country) {
          return a.country.localeCompare(b.country)
        }
        return a.city.localeCompare(b.city)
      })

      results = scored
    } else {
      // ── Fallback: weighted random shuffle ─────────────────────
      results = weightedRandomShuffle(results) as any[]
    }

    const totalCount = results.length
    const paginatedResults = results.slice(startIndex, endIndex)

    return Response.json({
      destinations: paginatedResults,
      totalCount,
      page,
      limit,
      hasMore: totalCount > endIndex,
      // Debug field — check in browser Network tab to verify signals
      _debug: {
        isPersonalised: !!inferredPrefs,
        signals: debugSignals,
        inferredStyles: inferredPrefs?.styles ?? [],
        inferredRegions: inferredPrefs?.regions ?? [],
        inferredBudget: inferredPrefs?.budget ?? null,
        preferredCountries: Object.fromEntries(preferredCountries),
      },
    })

  } catch (error) {
    console.error('Destinations API error:', error)
    return Response.json(
      { error: 'Failed to fetch destinations' },
      { status: 500 }
    )
  }
}
