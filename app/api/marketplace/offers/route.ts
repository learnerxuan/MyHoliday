import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { listing_id, proposed_price } = body

  if (!listing_id || listing_id === 'undefined' || !proposed_price) {
    return NextResponse.json({ error: 'Missing required fields or invalid listing_id passed as text "undefined"' }, { status: 400 })
  }

  // Look up the proper tour_guides(id) because the frontend passes user.id
  const { data: guideData, error: guideError } = await supabase
    .from('tour_guides')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (guideError || !guideData) {
    return NextResponse.json({ error: 'Tour guide profile not found' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('marketplace_offers')
    .insert([
      {
        listing_id,
        guide_id: guideData.id,
        proposed_price,
        status: 'pending'
      }
    ])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}