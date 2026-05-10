import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const { offer_id, sender_id, sender_type, content } = body

  if (!offer_id || !sender_type || !content) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const normalizedSenderType = sender_type === 'traveller' ? 'traveler' : sender_type
  if (!['traveler', 'guide'].includes(normalizedSenderType)) {
    return NextResponse.json({ error: 'Invalid sender_type' }, { status: 400 })
  }

  const { data: offer, error: offerError } = await supabase
    .from('marketplace_offers')
    .select(`
      id,
      guide_id,
      marketplace_listings(user_id, status, is_suspended)
    `)
    .eq('id', offer_id)
    .single()

  if (offerError || !offer) {
    return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
  }

  const relatedListing = Array.isArray(offer.marketplace_listings)
    ? offer.marketplace_listings[0]
    : offer.marketplace_listings

  if (relatedListing?.status === 'closed' || relatedListing?.is_suspended) {
    return NextResponse.json({ error: 'This chat is no longer available' }, { status: 410 })
  }

  const { data, error } = await supabase
    .from('marketplace_messages')
    .insert([
      {
        offer_id,
        sender_id: sender_id || user.id,
        sender_type: normalizedSenderType,
        content
      }
    ])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}
