import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// ID is listingId for GET, offerId for PATCH
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('marketplace_offers')
    .select('*, tour_guides(full_name)')
    .eq('listing_id', params.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const formattedData = (data || []).map((o: any) => ({
    ...o,
    guide_name: o.tour_guides?.full_name || 'Guide'
  }))

  return NextResponse.json(formattedData)
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const { data, error } = await supabase
    .from('marketplace_offers')
    .update({ status: body.status })
    .eq('id', params.id)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (body.status === 'accepted' && data && data.length > 0) {
    const selectedOffer = data[0]

    await supabase
      .from('marketplace_offers')
      .update({ status: 'rejected' })
      .eq('listing_id', selectedOffer.listing_id)
      .neq('id', params.id)
  }

  return NextResponse.json(data)
}