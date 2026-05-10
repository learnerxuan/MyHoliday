import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: profileId } = await params
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
  } catch (err) {
    console.error('Admin traveller itineraries GET error:', err)
    const message = err instanceof Error ? err.message : 'Failed to load itineraries'
    return Response.json({ error: message }, { status: 500 })
  }
}
