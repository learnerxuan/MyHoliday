import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type OfferWithGuide = Record<string, unknown> & {
  tour_guides?: { full_name?: string } | null
}

type RelatedListing =
  | { user_id?: string; status?: string; is_suspended?: boolean }
  | Array<{ user_id?: string; status?: string; is_suspended?: boolean }>
  | null

const OFFER_ACCEPTED_TOKEN = '__OFFER_ACCEPTED__:'

async function applyAcceptedMessageStatus(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  offers: OfferWithGuide[]
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

// ID is listingId for GET, offerId for PATCH
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('marketplace_offers')
    .select('*, tour_guides(full_name), marketplace_listings!inner(user_id, status, is_suspended)')
    .eq('listing_id', (await params).id)
    .neq('status', 'withdrawn')
    .neq('marketplace_listings.status', 'closed')
    .eq('marketplace_listings.is_suspended', false)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const offersWithAcceptedStatus = await applyAcceptedMessageStatus(supabase, (data || []) as OfferWithGuide[])

  const formattedData = offersWithAcceptedStatus.map((offer) => ({
    ...offer,
    marketplace_listings: undefined,
    guide_name: offer.tour_guides?.full_name || 'Guide'
  }))

  return NextResponse.json(formattedData)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const offerId = (await params).id

  if (body.status === 'withdrawn') {
    return NextResponse.json({ error: 'Use DELETE to withdraw an offer' }, { status: 405 })
  }

  const updatePayload: Record<string, unknown> = {}
  if (body.status !== undefined) updatePayload.status = body.status
  if (body.proposed_price !== undefined) updatePayload.proposed_price = body.proposed_price
  if (body.intro_message !== undefined) updatePayload.intro_message = body.intro_message
  if (body.edited_itinerary !== undefined) updatePayload.edited_itinerary = body.edited_itinerary

  if (body.proposed_price !== undefined || body.status === 'withdrawn') {
    const { data: existingOffer, error: existingOfferError } = await supabase
      .from('marketplace_offers')
      .select(`
        status,
        payment_enabled,
        marketplace_listings(status, is_suspended)
      `)
      .eq('id', offerId)
      .single()

    if (existingOfferError || !existingOffer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    const relatedListings = existingOffer.marketplace_listings as RelatedListing
    const listingStatus = Array.isArray(relatedListings)
      ? relatedListings[0]?.status
      : relatedListings?.status
    const listingIsSuspended = Array.isArray(relatedListings)
      ? relatedListings[0]?.is_suspended
      : relatedListings?.is_suspended

    if (listingStatus === 'closed' || listingIsSuspended) {
      return NextResponse.json({ error: 'This listing is no longer available' }, { status: 409 })
    }

    const { data: existingTransaction } = await supabase
      .from('transactions')
      .select('id')
      .eq('offer_id', offerId)
      .maybeSingle()

    const isLocked =
      existingOffer.status === 'accepted' ||
      listingStatus === 'confirmed' ||
      existingOffer.payment_enabled === true ||
      Boolean(existingTransaction)

    if (isLocked) {
      const action = body.status === 'withdrawn' ? 'withdrawn' : 'edited'
      return NextResponse.json({ error: `Accepted offers cannot be ${action}` }, { status: 409 })
    }
  }

  if (body.status === 'accepted') {
    const { data: offerToAccept, error: fetchError } = await supabase
      .from('marketplace_offers')
      .select(`
        id,
        listing_id,
        proposed_price,
        marketplace_listings(user_id, status, is_suspended)
      `)
      .eq('id', offerId)
      .single()

    if (fetchError || !offerToAccept) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    const relatedListings = offerToAccept.marketplace_listings as RelatedListing
    const listingOwnerId = Array.isArray(relatedListings)
      ? relatedListings[0]?.user_id
      : relatedListings?.user_id
    const listingStatus = Array.isArray(relatedListings)
      ? relatedListings[0]?.status
      : relatedListings?.status
    const listingIsSuspended = Array.isArray(relatedListings)
      ? relatedListings[0]?.is_suspended
      : relatedListings?.is_suspended

    if (listingOwnerId !== user.id) {
      return NextResponse.json({ error: 'Only the traveller who owns this listing can accept an offer' }, { status: 403 })
    }

    if (listingStatus === 'closed' || listingIsSuspended) {
      return NextResponse.json({ error: 'This listing is no longer available' }, { status: 409 })
    }

    const relatedListingId = offerToAccept.listing_id as string
    const proposedPrice = offerToAccept.proposed_price as string | number

    if (!relatedListingId) {
      return NextResponse.json({ error: 'Offer is missing its listing reference' }, { status: 400 })
    }

    const { error: acceptError } = await supabase
      .from('marketplace_offers')
      .update({ status: 'accepted' })
      .eq('id', offerId)

    if (acceptError) {
      return NextResponse.json({ error: acceptError.message }, { status: 400 })
    }

    const { error: rejectError } = await supabase
      .from('marketplace_offers')
      .update({ status: 'rejected' })
      .eq('listing_id', relatedListingId)
      .neq('id', offerId)
      .neq('status', 'withdrawn')

    if (rejectError) {
      return NextResponse.json({ error: rejectError.message }, { status: 400 })
    }

    const { error: listingUpdateError } = await supabase
      .from('marketplace_listings')
      .update({ status: 'confirmed' })
      .eq('id', relatedListingId)

    if (listingUpdateError) {
      return NextResponse.json({ error: listingUpdateError.message }, { status: 400 })
    }

    await supabase
      .from('marketplace_messages')
      .insert({
        offer_id: offerId,
        sender_id: user.id,
        sender_type: 'traveler',
        content: `__OFFER_ACCEPTED__:${proposedPrice}`
      })

    return NextResponse.json([{ ...offerToAccept, status: 'accepted' }])
  }

  const { data, error } = await supabase
    .from('marketplace_offers')
    .update(updatePayload)
    .eq('id', offerId)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const offerId = (await params).id

  try {
    const { data: offer, error: offerError } = await supabase
      .from('marketplace_offers')
      .select(`
        status,
        payment_enabled,
        listing_id,
        marketplace_listings(status),
        tour_guides(user_id),
        transactions(id)
      `)
      .eq('id', offerId)
      .single()

    if (offerError || !offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    const relatedListing = Array.isArray(offer.marketplace_listings)
      ? offer.marketplace_listings[0]
      : offer.marketplace_listings
    const relatedGuide = Array.isArray(offer.tour_guides)
      ? offer.tour_guides[0]
      : offer.tour_guides
    const relatedTransactions = Array.isArray(offer.transactions)
      ? offer.transactions
      : offer.transactions ? [offer.transactions] : []

    if (relatedGuide?.user_id !== user.id) {
      return NextResponse.json({ error: 'Only the guide who submitted this offer can withdraw it' }, { status: 403 })
    }

    const isLocked =
      offer.status === 'accepted' ||
      relatedListing?.status === 'confirmed' ||
      offer.payment_enabled === true ||
      relatedTransactions.length > 0

    if (isLocked) {
      return NextResponse.json({ error: 'Accepted offers cannot be withdrawn' }, { status: 409 })
    }

    const { error: withdrawError } = await supabase
      .from('marketplace_offers')
      .update({ status: 'withdrawn' })
      .eq('id', offerId)

    if (withdrawError) {
      return NextResponse.json({ error: withdrawError.message }, { status: 400 })
    }

    const { data: remainingOffers } = await supabase
      .from('marketplace_offers')
      .select('id')
      .eq('listing_id', offer.listing_id)
      .neq('status', 'withdrawn')
      .limit(1)

    if ((remainingOffers?.length || 0) === 0 && !['confirmed', 'closed'].includes(relatedListing?.status || '')) {
      await supabase
        .from('marketplace_listings')
        .update({ status: 'open' })
        .eq('id', offer.listing_id)
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to withdraw offer'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
