import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const OFFER_ACCEPTED_TOKEN = '__OFFER_ACCEPTED__:'

async function applyAcceptedMessageStatus(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  offers: Record<string, unknown>[]
) {
  const offerIds = offers.map((offer) => offer.id).filter(Boolean)

  if (!offerIds.length) {
    return offers
  }

  const { data: acceptedMessages } = await supabase
    .from('marketplace_messages')
    .select('offer_id')
    .in('offer_id', offerIds)
    .like('content', `${OFFER_ACCEPTED_TOKEN}%`)

  const acceptedOfferIds = new Set((acceptedMessages || []).map((message) => message.offer_id))

  return offers.map((offer) => (
    acceptedOfferIds.has(offer.id)
      ? { ...offer, status: 'accepted' }
      : offer
  ))
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const scope = searchParams.get('scope')

  if (scope === 'mine') {
    const { data: guideData, error: guideError } = await supabase
      .from('tour_guides')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (guideError || !guideData?.id) {
      return NextResponse.json({ error: 'Tour guide profile not found' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('marketplace_offers')
      .select('*, marketplace_listings!inner(status, is_suspended)')
      .eq('guide_id', guideData.id)
      .neq('status', 'withdrawn')
      .neq('marketplace_listings.status', 'closed')
      .eq('marketplace_listings.is_suspended', false)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const offersWithAcceptedStatus = await applyAcceptedMessageStatus(supabase, (data || []) as Record<string, unknown>[])

    return NextResponse.json(offersWithAcceptedStatus)
  }

  return NextResponse.json({ error: 'Unsupported scope' }, { status: 400 })
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { listing_id, proposed_price, intro_message } = body

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

  const { data: listing, error: listingError } = await supabase
    .from('marketplace_listings')
    .select('id, status, is_suspended')
    .eq('id', listing_id)
    .single()

  if (listingError || !listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  if (listing.status !== 'open' || listing.is_suspended) {
    return NextResponse.json({ error: 'This listing is no longer accepting offers' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('marketplace_offers')
    .insert([
      {
        listing_id,
        guide_id: guideData.id,
        proposed_price,
        intro_message,
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
