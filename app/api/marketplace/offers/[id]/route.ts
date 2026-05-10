import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Client } from 'pg'

type OfferWithGuide = Record<string, unknown> & {
  tour_guides?: { full_name?: string } | null
}

type RelatedListing =
  | { user_id?: string; status?: string; is_suspended?: boolean }
  | Array<{ user_id?: string; status?: string; is_suspended?: boolean }>
  | null

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
    .neq('marketplace_listings.status', 'closed')
    .eq('marketplace_listings.is_suspended', false)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const formattedData = ((data || []) as OfferWithGuide[]).map((offer) => ({
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

    const client = new Client({ connectionString: process.env.DATABASE_URL })
    try {
      await client.connect()
      await client.query('BEGIN')

      const acceptedResult = await client.query(
        `UPDATE public.marketplace_offers
         SET status = 'accepted'
         WHERE id = $1::uuid
         RETURNING *`,
        [offerId]
      )

      if (acceptedResult.rowCount !== 1) {
        throw new Error('Offer status was not updated.')
      }

      await client.query(
        `UPDATE public.marketplace_offers
         SET status = 'rejected'
         WHERE listing_id = $1::uuid
           AND id <> $2::uuid
           AND status <> 'withdrawn'`,
        [relatedListingId, offerId]
      )

      await client.query(
        `UPDATE public.marketplace_listings
         SET status = 'confirmed'
         WHERE id = $1::uuid`,
        [relatedListingId]
      )

      await client.query(
        `INSERT INTO public.marketplace_messages (offer_id, sender_id, sender_type, content)
         VALUES ($1::uuid, $2::uuid, 'traveler', $3)`,
        [offerId, user.id, `__OFFER_ACCEPTED__:${proposedPrice}`]
      )

      await client.query('COMMIT')
      return NextResponse.json(acceptedResult.rows)
    } catch (error: unknown) {
      await client.query('ROLLBACK').catch(() => {})
      const message = error instanceof Error ? error.message : 'Failed to accept offer'
      return NextResponse.json({ error: message }, { status: 400 })
    } finally {
      await client.end().catch(() => {})
    }
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

  const client = new Client({ connectionString: process.env.DATABASE_URL })
  try {
    await client.connect()
    await client.query('BEGIN')

    const offerResult = await client.query(
      `SELECT
         mo.status,
         mo.payment_enabled,
         mo.listing_id,
         ml.status AS listing_status,
         tg.user_id AS guide_user_id,
         tx.id AS transaction_id
       FROM public.marketplace_offers mo
       JOIN public.marketplace_listings ml ON ml.id = mo.listing_id
       JOIN public.tour_guides tg ON tg.id = mo.guide_id
       LEFT JOIN public.transactions tx ON tx.offer_id = mo.id
       WHERE mo.id = $1::uuid
       LIMIT 1`,
      [offerId]
    )

    const offer = offerResult.rows[0]
    if (!offer) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    if (offer.guide_user_id !== user.id) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Only the guide who submitted this offer can withdraw it' }, { status: 403 })
    }

    const isLocked =
      offer.status === 'accepted' ||
      offer.listing_status === 'confirmed' ||
      offer.payment_enabled === true ||
      Boolean(offer.transaction_id)

    if (isLocked) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Accepted offers cannot be withdrawn' }, { status: 409 })
    }

    await client.query(
      'DELETE FROM public.marketplace_offers WHERE id = $1::uuid',
      [offerId]
    )

    const remainingOffers = await client.query(
      'SELECT 1 FROM public.marketplace_offers WHERE listing_id = $1::uuid LIMIT 1',
      [offer.listing_id]
    )

    if (remainingOffers.rowCount === 0 && !['confirmed', 'closed'].includes(offer.listing_status)) {
      await client.query(
        `UPDATE public.marketplace_listings
         SET status = 'open'
         WHERE id = $1::uuid`,
        [offer.listing_id]
      )
    }

    await client.query('COMMIT')
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    await client.query('ROLLBACK').catch(() => {})
    const message = error instanceof Error ? error.message : 'Failed to withdraw offer'
    return NextResponse.json({ error: message }, { status: 400 })
  } finally {
    await client.end().catch(() => {})
  }
}
