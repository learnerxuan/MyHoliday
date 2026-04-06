import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// ID is listingId for GET, offerId for PATCH
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient()
  
  const { data, error } = await supabase
    .from('marketplace_offers')
    .select('*, tour_guides(full_name)')
    .eq('listing_id', params.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const formattedData = data.map(o => ({
    ...o,
    guide_name: o.tour_guides?.full_name || 'Guide'
  }))

  return NextResponse.json(formattedData)
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient()
  const body = await request.json()
  
  const { data, error } = await supabase
    .from('marketplace_offers')
    .update({ status: body.status })
    .eq('id', params.id)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}
