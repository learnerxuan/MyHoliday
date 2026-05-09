import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Client } from 'pg'

type OfferWithGuide = Record<string, unknown> & {
  tour_guides?: { full_name?: string } | null
}

type RelatedListing =
  | { user_id?: string; status?: string }
  | Array<{ user_id?: string; status?: string }>
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
    .select('*, tour_guides(full_name)')
    .eq('listing_id', (await params).id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const formattedData = ((data || []) as OfferWithGuide[]).map((offer) => ({
    ...offer,
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
        marketplace_listings(status)
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
        marketplace_listings(user_id)
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

    if (listingOwnerId !== user.id) {
      return NextResponse.json({ error: 'Only the traveller who owns this listing can accept an offer' }, { status: 403 })
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
           AND status = 'pending'`,
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
