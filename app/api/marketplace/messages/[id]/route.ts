import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient()
  const offerId = (await params).id

  const { data: offer, error: offerError } = await supabase
    .from('marketplace_offers')
    .select(`
      id,
      marketplace_listings(status, is_suspended)
    `)
    .eq('id', offerId)
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
    .select('*')
    .eq('offer_id', offerId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}
