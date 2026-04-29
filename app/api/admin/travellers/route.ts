import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const search = url.searchParams.get('search') || ''

    const supabase = await createSupabaseServerClient()

    let query = supabase.from('traveller_profiles').select('*')

    if (search) {
      // simple ilike search across name and nationality
      query = query.ilike('full_name', `%${search}%`).or(`nationality.ilike.%${search}%`)
    }

    const { data: profiles, error } = await query

    if (error) {
      console.error('Admin travellers GET error (DB):', error?.message || error)
      throw error
    }

    return Response.json({ profiles: profiles || [] })
  } catch (err: any) {
    console.error('Admin travellers GET error:', err)
    return Response.json({ error: err?.message || 'Failed to load travellers' }, { status: 500 })
  }
}
