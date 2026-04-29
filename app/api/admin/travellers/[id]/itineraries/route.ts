import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const profileId = params.id
    const supabase = await createSupabaseServerClient()

    // Fetch profile to get user_id
    const { data: profile, error: pErr } = await supabase
      .from('traveller_profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle()

    if (pErr) throw pErr
    if (!profile) return Response.json({ itineraries: [] })

    const userId = profile.user_id

    const { data: itineraries, error } = await supabase
      .from('itineraries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Admin traveller itineraries DB error:', error?.message || error)
      throw error
    }

    return Response.json({ itineraries: itineraries || [] })
  } catch (err: any) {
    console.error('Admin traveller itineraries GET error:', err)
    return Response.json({ error: err?.message || 'Failed to load itineraries' }, { status: 500 })
  }
}
