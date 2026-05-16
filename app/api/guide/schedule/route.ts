import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type DbRecord = Record<string, unknown>

const asRecord = (value: unknown): DbRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as DbRecord : {}

const asRecords = (value: unknown): DbRecord[] => Array.isArray(value) ? value as DbRecord[] : []
const asRecordMap = (records: DbRecord[]) => new Map(records.map((record) => [String(record.id), record]))
const asString = (value: unknown) => typeof value === 'string' ? value : ''
const asNumber = (value: unknown) => Number(value || 0)

function parseObject(value: unknown): DbRecord {
  if (!value) return {}
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return asRecord(parsed)
    } catch {
      return {}
    }
  }
  return asRecord(value)
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

function deriveTimingStatus(startDate: string, endDate: string) {
  const now = new Date()

  if (startDate && endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Upcoming'

    end.setHours(23, 59, 59, 999)
    if (now > end) return 'Completed'
    if (now >= start && now <= end) return 'Ongoing'
    return 'Upcoming'
  }

  if (startDate) {
    const start = new Date(startDate)
    if (!Number.isNaN(start.getTime()) && now >= start) return 'Ongoing'
  }

  return 'Upcoming'
}

function mapScheduleRow(row: DbRecord) {
  const listing = asRecord(row.listing)
  const destination = asRecord(listing.destinations)
  const itinerary = asRecord(listing.itineraries)
  const content = parseObject(itinerary.content)
  const tripMeta = parseObject(itinerary.trip_metadata)
  const travelDates = parseObject(tripMeta.travel_dates)

  const days = content.trip_days || content.duration_days || tripMeta.trip_days || tripMeta.duration_days || null
  const startDate = firstString(content.start_date, tripMeta.travel_date_start, tripMeta.start_date, travelDates.start)
  const endDate = firstString(content.end_date, tripMeta.travel_date_end, tripMeta.end_date, travelDates.end)
  const timingStatus = deriveTimingStatus(startDate, endDate)

  return {
    id: asString(row.id),
    price: asNumber(row.proposed_price),
    acceptedAt: asString(row.created_at),
    guideId: asString(row.guide_id),
    listingId: asString(row.listing_id),
    title: asString(itinerary.title) || 'Trip',
    city: asString(destination.city) || 'Unknown Location',
    country: asString(destination.country),
    startDate,
    endDate,
    days: days ? `${String(days)} Days` : '',
    pax: String(content.group_size || content.pax || tripMeta.group_size || tripMeta.pax || '1 pax'),
    timingStatus,
  }
}

function sortScheduleRecords(a: ReturnType<typeof mapScheduleRow>, b: ReturnType<typeof mapScheduleRow>) {
  const aTime = a.startDate ? new Date(a.startDate).getTime() : Number.POSITIVE_INFINITY
  const bTime = b.startDate ? new Date(b.startDate).getTime() : Number.POSITIVE_INFINITY

  if (aTime !== bTime) return aTime - bTime

  return new Date(b.acceptedAt || 0).getTime() - new Date(a.acceptedAt || 0).getTime()
}

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.user_metadata?.role !== 'guide' && user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Only guides can access schedule data' }, { status: 403 })
  }

  try {
    const { data: guide, error: guideError } = await supabase
      .from('tour_guides')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (guideError) {
      return NextResponse.json({ error: guideError.message }, { status: 400 })
    }

    if (!guide?.id) {
      return NextResponse.json({ records: [] })
    }

    const { data: transactionsData, error: transactionsError } = await supabase
      .from('transactions')
      .select('offer_id')
      .eq('payee_id', guide.id)
      .eq('status', 'completed')

    if (transactionsError) {
      return NextResponse.json({ error: transactionsError.message }, { status: 400 })
    }

    const completedOfferIds = [
      ...new Set(asRecords(transactionsData).map((transaction) => asString(transaction.offer_id)).filter(Boolean)),
    ]

    if (!completedOfferIds.length) {
      return NextResponse.json({ records: [] })
    }

    const { data: offersData, error: offersError } = await supabase
      .from('marketplace_offers')
      .select('id, proposed_price, created_at, guide_id, listing_id, status')
      .eq('guide_id', guide.id)
      .neq('status', 'withdrawn')
      .in('id', completedOfferIds)

    if (offersError) {
      return NextResponse.json({ error: offersError.message }, { status: 400 })
    }

    const offers = asRecords(offersData)
    const listingIds = [...new Set(offers.map((offer) => asString(offer.listing_id)).filter(Boolean))]

    if (!listingIds.length) {
      return NextResponse.json({ records: [] })
    }

    const { data: listingsData, error: listingsError } = await supabase
      .from('marketplace_listings')
      .select('id, destination_id, itinerary_id, destinations(id, city, country), itineraries(id, title, content, trip_metadata)')
      .in('id', listingIds)

    if (listingsError) {
      return NextResponse.json({ error: listingsError.message }, { status: 400 })
    }

    const listingMap = asRecordMap(asRecords(listingsData))
    const records = offers
      .map((offer) => mapScheduleRow({ ...offer, listing: listingMap.get(asString(offer.listing_id)) || {} }))
      .sort(sortScheduleRecords)

    return NextResponse.json({ records })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load schedule' },
      { status: 500 }
    )
  }
}
