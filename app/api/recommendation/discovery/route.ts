import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
import {
  scoreDestinations,
  inferPreferences,
  extractPreferredCountries,
  Destination,
} from '@/lib/recommendation'

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()

    // Security: use getUser() instead of getSession()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ recommendations: [] })
    }

    // ── Fetch all three signal sources in parallel ──────────────
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

      // Interest Signal: clicked destinations (joined)
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

    const hasAnySignal =
      (itineraries?.length || 0) > 0 ||
      (interactions?.length || 0) > 0 ||
      (chatSessions?.length || 0) > 0

    if (!hasAnySignal) {
      return Response.json({ recommendations: [] })
    }

    // ── Infer preferences from all three signals ────────────────
    const inferredPrefs = inferPreferences(
      itineraries || [],
      interactions || [],
      chatSessions || []
    )

    const preferredCountries = extractPreferredCountries(
      interactions || [],
      itineraries || [],
      chatSessions || []
    )

    // ── Fetch all destinations and score them ───────────────────
    const { data: dests, error: destError } = await supabase
      .from('destinations')
      .select('*')

    if (destError || !dests) throw new Error('Failed to fetch destinations')

    const scored = scoreDestinations(dests as unknown as Destination[], inferredPrefs) as any[]

    // ── Region affinity boost (+20 pts) ─────────────────────────
    const preferredRegions = new Set(inferredPrefs.regions)
    const hasRegionSignal = preferredRegions.size > 0 && inferredPrefs.regions.length < 7

    if (hasRegionSignal) {
      scored.forEach((d: any) => {
        if (preferredRegions.has(d.region)) {
          d.match_score = Math.min(100, d.match_score + 20)
        }
      })
    }

    // ── Country affinity boost (up to +15 pts) ───────────────────
    // Frequency-weighted: 1 click = +5, 2 = +10, 3+ = +15
    if (preferredCountries.size > 0) {
      scored.forEach((d: any) => {
        const clicks = preferredCountries.get(d.country) || 0
        if (clicks > 0) {
          d.match_score = Math.min(100, d.match_score + Math.min(clicks * 5, 15))
        }
      })
    }

    // ── Re-sort after all boosts ─────────────────────────────────
    scored.sort((a: any, b: any) => b.match_score - a.match_score)

    const totalSignals =
      (itineraries?.length || 0) +
      (interactions?.length || 0) +
      (chatSessions?.length || 0)

    // Return top 10 as "Recommended for You"
    return Response.json({
      recommendations: scored.slice(0, 10),
      inferredFrom: totalSignals,
    })

  } catch (error) {
    console.error('Discovery API error:', error)
    return Response.json(
      { error: 'Failed to generate discovery results' },
      { status: 500 }
    )
  }
}
