import { createSupabaseServerClient } from '@/lib/supabase/server'
import { scoreDestinations, inferPreferences, Destination } from '@/lib/recommendation'

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
    
    // Security Upgrade: use getUser() instead of getSession()
    const { data: { user } } = await supabase.auth.getUser()
    
    let inferredPrefs = null
    if (user) {
      // Fetch itineraries (Hard Signals)
      const { data: itineraries } = await supabase
        .from('itineraries')
        .select('trip_metadata')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      // Fetch interactions (Interest Signals - joined with destination data)
      const { data: interactions } = await supabase
        .from('user_interactions')
        .select('*, destinations(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (itineraries?.length || interactions?.length) {
        inferredPrefs = inferPreferences(itineraries || [], interactions || [])
      }
    }

    // 2. Fetch all destinations matching the filters
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

    // 3. Apply scoring if we have preferences
    if (inferredPrefs) {
      const scored = scoreDestinations(results, inferredPrefs)
      results = scored as any
    } else {
      // Default fallback: Alpha sort by city if no relevance data
      results.sort((a, b) => a.city.localeCompare(b.city))
    }

    const totalCount = results.length
    const paginatedResults = results.slice(startIndex, endIndex)

    return Response.json({
      destinations: paginatedResults,
      totalCount,
      page,
      limit,
      hasMore: totalCount > endIndex
    })

  } catch (error) {
    console.error('Destinations API error:', error)
    return Response.json(
      { error: 'Failed to fetch destinations' },
      { status: 500 }
    )
  }
}
