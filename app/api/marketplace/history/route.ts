import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type DbRecord = Record<string, unknown>

const asRecords = (value: unknown): DbRecord[] => Array.isArray(value) ? value as DbRecord[] : []
const asRecordMap = (records: DbRecord[]) => new Map(records.map((record) => [String(record.id), record]))
const asString = (value: unknown) => typeof value === 'string' ? value : ''
const asNumber = (value: unknown) => Number(value || 0)

function parseObject(value: unknown): DbRecord {
  if (!value) return {}
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value as DbRecord : {}
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

function deriveTripDetails(itinerary?: DbRecord) {
  const content = parseObject(itinerary?.content)
  const tripMeta = parseObject(itinerary?.trip_metadata)
  const travelDates = parseObject(tripMeta.travel_dates)

  const days = content.trip_days || content.duration_days || tripMeta.trip_days || tripMeta.duration_days || null
  const pax = content.group_size || content.pax || tripMeta.group_size || tripMeta.pax || '1 pax'

  return {
    title: asString(itinerary?.title) || 'Trip',
    startDate: firstString(content.start_date, tripMeta.travel_date_start, tripMeta.start_date, travelDates.start),
    endDate: firstString(content.end_date, tripMeta.travel_date_end, tripMeta.end_date, travelDates.end),
    days: days ? String(days) : '',
    pax: String(pax),
  }
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const requestedScope = searchParams.get('scope')
  const role = user.user_metadata?.role === 'guide' ? 'guide' : 'traveller'
  const scope = requestedScope === 'guide' ? 'guide' : requestedScope === 'traveller' ? 'traveller' : role

  let guideProfile: DbRecord | null = null
  let transactionsQuery = supabase
    .from('transactions')
    .select('*')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  if (scope === 'guide') {
    const { data: guide, error: guideError } = await supabase
      .from('tour_guides')
      .select('id, full_name, user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (guideError || !guide) {
      return NextResponse.json({ error: 'Guide profile not found' }, { status: 404 })
    }

    guideProfile = guide as DbRecord
    transactionsQuery = transactionsQuery.eq('payee_id', guide.id)
  } else {
    transactionsQuery = transactionsQuery.eq('payer_id', user.id)
  }

  const { data: transactionsData, error: transactionsError } = await transactionsQuery

  if (transactionsError) {
    return NextResponse.json({ error: transactionsError.message }, { status: 400 })
  }

  const transactions = asRecords(transactionsData)
  if (!transactions.length) {
    return NextResponse.json({ scope, records: [] })
  }

  const offerIds = [...new Set(transactions.map((transaction) => asString(transaction.offer_id)).filter(Boolean))]
  const { data: offersData, error: offersError } = await supabase
    .from('marketplace_offers')
    .select('id, listing_id, guide_id, proposed_price, status')
    .in('id', offerIds)

  if (offersError) {
    return NextResponse.json({ error: offersError.message }, { status: 400 })
  }

  const offers = asRecords(offersData)
  const offerMap = asRecordMap(offers)
  const listingIds = [...new Set(offers.map((offer) => asString(offer.listing_id)).filter(Boolean))]
  const guideIds = [...new Set(offers.map((offer) => asString(offer.guide_id)).filter(Boolean))]

  const [{ data: listingsData, error: listingsError }, { data: guidesData, error: guidesError }] = await Promise.all([
    supabase
      .from('marketplace_listings')
      .select('id, user_id, itinerary_id, destination_id, status, destinations(id, city, country)')
      .in('id', listingIds),
    supabase
      .from('tour_guides')
      .select('id, full_name, user_id')
      .in('id', guideIds),
  ])

  if (listingsError) {
    return NextResponse.json({ error: listingsError.message }, { status: 400 })
  }

  if (guidesError) {
    return NextResponse.json({ error: guidesError.message }, { status: 400 })
  }

  const listings = asRecords(listingsData)
  const listingMap = asRecordMap(listings)
  const guideMap = asRecordMap(asRecords(guidesData))
  const itineraryIds = [...new Set(listings.map((listing) => asString(listing.itinerary_id)).filter(Boolean))]
  const travellerUserIds = [...new Set(listings.map((listing) => asString(listing.user_id)).filter(Boolean))]

  const [{ data: itinerariesData }, { data: travellersData }] = await Promise.all([
    itineraryIds.length
      ? supabase.from('itineraries').select('id, title, content, trip_metadata').in('id', itineraryIds)
      : Promise.resolve({ data: [] }),
    travellerUserIds.length
      ? supabase.from('traveller_profiles').select('user_id, full_name').in('user_id', travellerUserIds)
      : Promise.resolve({ data: [] }),
  ])

  const itineraryMap = asRecordMap(asRecords(itinerariesData))
  const travellerMap = new Map(asRecords(travellersData).map((traveller) => [asString(traveller.user_id), traveller]))

  const records = transactions.map((transaction) => {
    const offer = offerMap.get(asString(transaction.offer_id)) || {}
    const listing = listingMap.get(asString(offer.listing_id)) || {}
    const guide = guideMap.get(asString(offer.guide_id)) || guideProfile || {}
    const traveller = travellerMap.get(asString(listing.user_id)) || {}
    const itinerary = itineraryMap.get(asString(listing.itinerary_id))
    const destination = parseObject(listing.destinations)
    const trip = deriveTripDetails(itinerary)

    return {
      transactionId: asString(transaction.id),
      offerId: asString(transaction.offer_id),
      listingId: asString(offer.listing_id),
      guideId: asString(offer.guide_id),
      title: trip.title,
      destination: {
        city: asString(destination.city) || 'Unknown',
        country: asString(destination.country),
      },
      dates: {
        startDate: trip.startDate,
        endDate: trip.endDate,
        days: trip.days,
      },
      pax: trip.pax,
      travellerName: asString(traveller.full_name) || 'Traveller',
      guideName: asString(guide.full_name) || 'Tour Guide',
      payment: {
        status: asString(transaction.status),
        totalAmount: asNumber(transaction.total_amount),
        serviceCharge: asNumber(transaction.service_charge),
        guidePayout: asNumber(transaction.guide_payout),
        paymentReference: asString(transaction.payment_reference),
        createdAt: asString(transaction.created_at),
      },
    }
  })

  return NextResponse.json({ scope, records })
}
