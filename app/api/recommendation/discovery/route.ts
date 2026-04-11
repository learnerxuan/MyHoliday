import { createSupabaseServerClient } from '@/lib/supabase/server'
import { scoreDestinations, inferPreferences, Destination } from '@/lib/recommendation'

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Security Upgrade: use getUser() instead of getSession()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ recommendations: [] })
    }

    // 2. Fetch past itineraries (Hard Signals)
    const { data: itineraries, error: itError } = await supabase
      .from('itineraries')
      .select('trip_metadata')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // 3. Fetch interactions (Interest Signals)
    const { data: interactions } = await supabase
      .from('user_interactions')
      .select('*, destinations(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!itineraries?.length && !interactions?.length) {
      return Response.json({ recommendations: [] })
    }

    // 4. Infer preferences using shared helper with multi-signal data
    const inferredPrefs = inferPreferences(itineraries || [], interactions || [])

    // 5. Fetch all destinations and score them
    const { data: dests, error: destError } = await supabase
      .from('destinations')
      .select('*')

    if (destError || !dests) throw new Error('Failed to fetch destinations')

    const scored = scoreDestinations(dests as unknown as Destination[], inferredPrefs)

    // Return top 10 as "Recommended for You"
    return Response.json({ 
      recommendations: scored.slice(0, 10),
      inferredFrom: (itineraries?.length || 0) + (interactions?.length || 0)
    })

  } catch (error) {
    console.error('Discovery API error:', error)
    return Response.json({ error: 'Failed to generate discovery results' }, { status: 500 })
  }
}
